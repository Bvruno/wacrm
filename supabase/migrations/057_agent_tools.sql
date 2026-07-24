-- ============================================================
-- 057_agent_tools.sql — Extensible tools for agents
--
-- Allows agents to have custom tools beyond the built-in ones.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  description text NOT NULL,
  parameters jsonb NOT NULL,
  endpoint text,
  is_builtin boolean DEFAULT false,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_tools_agent_id ON agent_tools(agent_id);

ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_tools_select ON agent_tools;
CREATE POLICY agent_tools_select ON agent_tools FOR SELECT
  USING (is_account_member((SELECT account_id FROM agents WHERE agents.id = agent_tools.agent_id)));

DROP POLICY IF EXISTS agent_tools_insert ON agent_tools;
CREATE POLICY agent_tools_insert ON agent_tools FOR INSERT
  WITH CHECK (is_account_member((SELECT account_id FROM agents WHERE agents.id = agent_tools.agent_id), 'admin'));

DROP POLICY IF EXISTS agent_tools_update ON agent_tools;
CREATE POLICY agent_tools_update ON agent_tools FOR UPDATE
  USING (is_account_member((SELECT account_id FROM agents WHERE agents.id = agent_tools.agent_id), 'admin'));

DROP POLICY IF EXISTS agent_tools_delete ON agent_tools;
CREATE POLICY agent_tools_delete ON agent_tools FOR DELETE
  USING (is_account_member((SELECT account_id FROM agents WHERE agents.id = agent_tools.agent_id), 'admin'));
