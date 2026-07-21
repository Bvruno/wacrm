CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_feature_flags_account ON feature_flags(account_id);

INSERT INTO feature_flags (key, label, description, enabled) VALUES
  ('ai_assistant', 'AI Assistant', 'Enable AI reply assistant for all accounts', true),
  ('broadcasts', 'Broadcasts', 'Enable broadcast campaigns', true),
  ('automations', 'Automations', 'Enable no-code automations', true),
  ('public_api', 'Public API', 'Enable REST API access', true),
  ('flows', 'Flows', 'Enable visual flow builder', true)
ON CONFLICT (key) DO NOTHING;
