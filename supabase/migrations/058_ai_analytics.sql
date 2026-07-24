-- ============================================================
-- 058_ai_analytics.sql — Analytics and feedback for AI agents
--
-- Extends usage tracking with:
--   - Agent-level metrics
--   - Handoff tracking
--   - Customer feedback
--   - Response time tracking
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE ai_usage_log
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES agents(id),
  ADD COLUMN IF NOT EXISTS handoff_occurred boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_feedback text CHECK (customer_feedback IN ('positive', 'negative', 'neutral')),
  ADD COLUMN IF NOT EXISTS response_time_ms integer;

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_agent ON ai_usage_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_handoff ON ai_usage_log(handoff_occurred) WHERE handoff_occurred = true;

CREATE TABLE IF NOT EXISTS ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_account ON ai_feedback(account_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_conversation ON ai_feedback(conversation_id);

ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_feedback_select ON ai_feedback;
CREATE POLICY ai_feedback_select ON ai_feedback FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS ai_feedback_insert ON ai_feedback;
CREATE POLICY ai_feedback_insert ON ai_feedback FOR INSERT
  WITH CHECK (is_account_member(account_id));
