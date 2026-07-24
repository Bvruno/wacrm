-- ============================================================
-- 055_ai_playground_sessions.sql — Playground session history
--
-- Saves playground conversations so agents can review test chats,
-- compare configurations, and export conversations.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_playground_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  name text,
  messages jsonb NOT NULL DEFAULT '[]',
  tool_calls jsonb DEFAULT '[]',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playground_sessions_account ON ai_playground_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_playground_sessions_created_by ON ai_playground_sessions(created_by);

ALTER TABLE ai_playground_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS playground_sessions_select ON ai_playground_sessions;
CREATE POLICY playground_sessions_select ON ai_playground_sessions FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS playground_sessions_insert ON ai_playground_sessions;
CREATE POLICY playground_sessions_insert ON ai_playground_sessions FOR INSERT
  WITH CHECK (is_account_member(account_id));

DROP POLICY IF EXISTS playground_sessions_update ON ai_playground_sessions;
CREATE POLICY playground_sessions_update ON ai_playground_sessions FOR UPDATE
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS playground_sessions_delete ON ai_playground_sessions;
CREATE POLICY playground_sessions_delete ON ai_playground_sessions FOR DELETE
  USING (is_account_member(account_id));

CREATE OR REPLACE FUNCTION public.update_playground_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS playground_sessions_updated_at ON ai_playground_sessions;
CREATE TRIGGER playground_sessions_updated_at
  BEFORE UPDATE ON ai_playground_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_playground_sessions_updated_at();
