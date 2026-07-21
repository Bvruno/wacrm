-- ============================================================
-- Migration 048: Concurrency controls for multi-agent scenarios
--
-- 1. Adds send-lock columns so two agents can't message the same
--    conversation simultaneously.
-- 2. Makes claim_ai_reply_slot check assigned_agent_id atomically
--    so the AI never races ahead of a human assignment.
-- ============================================================

-- ============================================================
-- 1. Send lock columns on conversations
--
-- `sending_agent_id`  — who is currently sending (NULL = free)
-- `sending_locked_at` — when the lock was acquired; stale locks
--                       (>30s) can be claimed by another agent.
-- ============================================================
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS sending_agent_id UUID,
  ADD COLUMN IF NOT EXISTS sending_locked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_conversations_sending_lock
  ON conversations(sending_agent_id)
  WHERE sending_agent_id IS NOT NULL;

-- ============================================================
-- 2. claim_send_lock — atomically claim the send lock on a
--    conversation.
--
--    Returns true when the lock was acquired, false if another
--    agent holds a fresh lock.
--    Stale locks (>30s) are automatically reaped so a crashed
--    browser doesn't block the team forever.
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_send_lock(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE conversations
  SET
    sending_agent_id = p_user_id,
    sending_locked_at = NOW()
  WHERE id = p_conversation_id
    AND (
      sending_agent_id IS NULL
      OR sending_agent_id = p_user_id
      OR sending_locked_at < NOW() - INTERVAL '30 seconds'
    )
  RETURNING true;
$$;

-- ============================================================
-- 3. release_send_lock — release the send lock (called after the
--    message is delivered, or on error).
--    No-op if the lock is held by a different user (shouldn't
--    happen in normal flow).
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_send_lock(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE conversations
  SET
    sending_agent_id = NULL,
    sending_locked_at = NULL
  WHERE id = p_conversation_id
    AND sending_agent_id = p_user_id;
$$;

-- ============================================================
-- 4. Updated claim_ai_reply_slot — now also rejects when a human
--    agent is assigned to the conversation.
--
--    Previously the app read `assigned_agent_id` in a separate
--    query *before* claiming the slot. That introduced a race:
--    an agent could assign themselves between the read and the
--    UPDATE, and the AI would reply anyway.
--
--    By moving the `assigned_agent_id IS NULL` check INTO the
--    atomic UPDATE, the assignment check and the slot claim are
--    one indivisible operation. If an agent assigns themselves
--    at any point, the AI cannot claim a slot.
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_ai_reply_slot(
  conversation_id uuid,
  max_replies integer
)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  WITH claimed AS (
    UPDATE conversations
    SET ai_reply_count = ai_reply_count + 1
    WHERE id = conversation_id
      AND ai_reply_count < max_replies
      AND assigned_agent_id IS NULL
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM claimed);
$$;

-- ============================================================
-- 5. Grant execute permissions
--    - authenticated: dashboard send route (user's own session)
--    - service_role:  webhook / auto-reply path
-- ============================================================
GRANT EXECUTE ON FUNCTION public.claim_send_lock(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_send_lock(UUID, UUID) TO authenticated, service_role;
