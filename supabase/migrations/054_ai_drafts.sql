-- ============================================================
-- 054_ai_drafts.sql — Draft history for AI-assisted replies
--
-- Stores every AI-generated draft so agents can review previous
-- suggestions, see what context was used, and regenerate with
-- different parameters.
--
-- Design notes
--   - One row per draft generation, keyed by conversation + agent
--   - Stores the draft text, context used (KB chunks, contact profile),
--     and the parameters used (temperature, tone, etc.)
--   - Limited to last 50 drafts per conversation to avoid unbounded growth
--   - RLS: agent+ can read their own drafts, admin+ can read all
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  draft_text text NOT NULL,
  context_used jsonb,
  parameters jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_drafts_conversation_id ON ai_drafts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_created_by ON ai_drafts(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_created_at ON ai_drafts(created_at DESC);

ALTER TABLE ai_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_drafts_select ON ai_drafts;
CREATE POLICY ai_drafts_select ON ai_drafts FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS ai_drafts_insert ON ai_drafts;
CREATE POLICY ai_drafts_insert ON ai_drafts FOR INSERT
  WITH CHECK (is_account_member(account_id));

DROP POLICY IF EXISTS ai_drafts_delete ON ai_drafts;
CREATE POLICY ai_drafts_delete ON ai_drafts FOR DELETE
  USING (is_account_member(account_id, 'admin'));

-- Cleanup function to keep only last 50 drafts per conversation
CREATE OR REPLACE FUNCTION public.cleanup_old_drafts(p_conversation_id uuid, p_keep integer DEFAULT 50)
RETURNS void AS $$
BEGIN
  DELETE FROM ai_drafts
  WHERE conversation_id = p_conversation_id
    AND id NOT IN (
      SELECT id FROM ai_drafts
      WHERE conversation_id = p_conversation_id
      ORDER BY created_at DESC
      LIMIT p_keep
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.cleanup_old_drafts(uuid, integer) TO service_role;
