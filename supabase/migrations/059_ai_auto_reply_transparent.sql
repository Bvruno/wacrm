-- ============================================================
-- 059_ai_auto_reply_transparent.sql — Transparent auto-reply mode
--
-- Adds:
--   - Suggestion mode (agent reviews before sending)
--   - Reasoning tracking for transparency
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS auto_reply_mode text DEFAULT 'send' CHECK (auto_reply_mode IN ('send', 'suggest', 'disabled')),
  ADD COLUMN IF NOT EXISTS reasoning_enabled boolean DEFAULT false;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_reasoning text;

CREATE INDEX IF NOT EXISTS idx_agents_auto_reply_mode ON agents(auto_reply_mode);
