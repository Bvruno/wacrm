-- ============================================================
-- 053_multi_agent_system.sql — Multi-agent support
--
-- Transforms the single AI assistant per account into a full multi-agent
-- system where each account can have multiple agents with different
-- personalities, configurations, and knowledge bases.
--
-- Design notes
--   - `agents` table allows multiple agents per account
--   - Each agent has its own provider, model, API key, system prompt
--   - Agents can be assigned to specific conversations
--   - Migrates existing `ai_configs` to a default agent per account
--   - Backward compatibility: `ai_configs` remains for legacy code
--
-- RLS
--   Same pattern as `ai_configs`: any member can read, admin+ can write.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS agents (
  id                                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                        uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by                        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Identification
  name                              text NOT NULL,
  description                       text,
  avatar_url                        text,
  
  -- Model configuration
  provider                          text NOT NULL CHECK (provider IN ('openai', 'anthropic')),
  model                             text NOT NULL,
  api_key                           text NOT NULL, -- AES-256-GCM-encrypted BYO provider key
  system_prompt                     text,
  
  -- Model parameters (Phase 2 will use these)
  temperature                       real DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  top_p                             real DEFAULT 1.0 CHECK (top_p >= 0 AND top_p <= 1),
  frequency_penalty                 real DEFAULT 0 CHECK (frequency_penalty >= -2 AND frequency_penalty <= 2),
  presence_penalty                  real DEFAULT 0 CHECK (presence_penalty >= -2 AND presence_penalty <= 2),
  max_tokens                        integer DEFAULT 1024 CHECK (max_tokens >= 100 AND max_tokens <= 8192),
  
  -- Tone configuration (Phase 2)
  tone_preset                       text CHECK (tone_preset IN ('formal', 'casual', 'friendly', 'professional', 'empathetic', 'technical')),
  custom_tone_instructions          text,
  language                          text, -- 'es', 'en', 'auto' (detect from message)
  
  -- State
  is_active                         boolean NOT NULL DEFAULT false,
  
  -- Auto-reply configuration
  auto_reply_enabled                boolean NOT NULL DEFAULT false,
  auto_reply_max_per_conversation   integer NOT NULL DEFAULT 3
                                      CHECK (auto_reply_max_per_conversation BETWEEN 1 AND 20),
  
  -- Handoff
  handoff_agent_id                  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Embeddings
  embeddings_api_key                text,
  
  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(account_id, name)
);

CREATE INDEX IF NOT EXISTS idx_agents_account_id ON agents(account_id);
CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(account_id) WHERE is_active = true;

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- SELECT: any member of the account can see agents
DROP POLICY IF EXISTS agents_select ON agents;
CREATE POLICY agents_select ON agents FOR SELECT
  USING (is_account_member(account_id));

-- INSERT / UPDATE / DELETE: admin+ only
DROP POLICY IF EXISTS agents_insert ON agents;
CREATE POLICY agents_insert ON agents FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS agents_update ON agents;
CREATE POLICY agents_update ON agents FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS agents_delete ON agents;
CREATE POLICY agents_delete ON agents FOR DELETE
  USING (is_account_member(account_id, 'admin'));

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.update_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agents_updated_at ON agents;
CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agents_updated_at();

-- ============================================================
-- Add agent_id to conversations
-- ============================================================
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);

-- ============================================================
-- Migrate existing ai_configs to agents
-- ============================================================
-- Create a default agent for each existing ai_config
DO $$
DECLARE
  config_row RECORD;
  new_agent_id uuid;
BEGIN
  FOR config_row IN 
    SELECT * FROM ai_configs
  LOOP
    -- Check if agent already exists for this account (idempotency)
    IF NOT EXISTS (
      SELECT 1 FROM agents 
      WHERE account_id = config_row.account_id 
        AND name = 'Asistente Principal'
    ) THEN
      INSERT INTO agents (
        account_id, created_by, name, description, provider, model,
        api_key, system_prompt, is_active, auto_reply_enabled,
        auto_reply_max_per_conversation, handoff_agent_id, embeddings_api_key
      ) VALUES (
        config_row.account_id, config_row.created_by, 'Asistente Principal',
        'Agente migrado desde la configuración anterior',
        config_row.provider, config_row.model, config_row.api_key,
        config_row.system_prompt, config_row.is_active,
        config_row.auto_reply_enabled, config_row.auto_reply_max_per_conversation,
        config_row.handoff_agent_id, config_row.embeddings_api_key
      ) RETURNING id INTO new_agent_id;
      
      -- Update conversations to point to the new agent
      UPDATE conversations
      SET agent_id = new_agent_id
      WHERE account_id = config_row.account_id
        AND agent_id IS NULL;
    END IF;
  END LOOP;
END $$;
