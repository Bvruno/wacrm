-- ============================================================
-- 060_meta_cost_tracking.sql — Meta WhatsApp cost tracking
--
-- Adds infrastructure to track and estimate Meta WhatsApp costs:
--   - conversations.last_customer_message_at: when the 24h service
--     window opened (reset on each customer message). Messages sent
--     within 24h of this timestamp are free (service conversation).
--   - meta_costs: configurable per-category per-country rates.
--   - message_costs: per-message cost calculation log.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- ============================================================
-- 1. Track the service window on conversations.
-- ============================================================
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_customer_message_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_conversations_last_customer_msg
  ON conversations(last_customer_message_at DESC)
  WHERE last_customer_message_at IS NOT NULL;

-- Backfill: set last_customer_message_at from the most recent
-- customer message in each conversation.
UPDATE conversations c
SET last_customer_message_at = sub.max_created
FROM (
  SELECT conversation_id, MAX(created_at) AS max_created
  FROM messages
  WHERE sender_type = 'customer'
  GROUP BY conversation_id
) sub
WHERE c.id = sub.conversation_id
  AND c.last_customer_message_at IS NULL;

-- ============================================================
-- 2. Meta cost rates table.
-- ============================================================
CREATE TABLE IF NOT EXISTS meta_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('service', 'marketing', 'utility', 'authentication')),
  country text NOT NULL DEFAULT 'default',
  currency text NOT NULL DEFAULT 'USD',
  rate_per_conversation numeric(10, 6) NOT NULL DEFAULT 0,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(account_id, category, country)
);

ALTER TABLE meta_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meta_costs_select ON meta_costs;
CREATE POLICY meta_costs_select ON meta_costs FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS meta_costs_upsert ON meta_costs;
CREATE POLICY meta_costs_upsert ON meta_costs FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS meta_costs_update ON meta_costs;
CREATE POLICY meta_costs_update ON meta_costs FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

-- Insert default rates for Latin America (Peru focus)
-- Based on Meta's 2025 rate cards (approximate USD values)
INSERT INTO meta_costs (account_id, category, country, rate_per_conversation, notes)
SELECT a.id, cat.category, 'default', cat.rate,
       'Default rate (all countries not specifically configured)'
FROM accounts a
CROSS JOIN (VALUES
  ('service', 0),
  ('marketing', 0.0250),
  ('utility', 0.0034),
  ('authentication', 0.0034)
) AS cat(category, rate)
WHERE NOT EXISTS (
  SELECT 1 FROM meta_costs mc
  WHERE mc.account_id = a.id AND mc.category = cat.category AND mc.country = 'default'
);

CREATE OR REPLACE FUNCTION public.update_meta_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meta_costs_updated_at ON meta_costs;
CREATE TRIGGER meta_costs_updated_at
  BEFORE UPDATE ON meta_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_meta_costs_updated_at();

-- ============================================================
-- 3. Per-message cost log.
-- ============================================================
CREATE TABLE IF NOT EXISTS message_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type text NOT NULL CHECK (message_type IN ('free_form', 'template', 'broadcast')),
  template_category text CHECK (template_category IN ('marketing', 'utility', 'authentication')),
  template_name text,
  country text DEFAULT 'default',
  
  -- Service window state at time of send
  in_service_window boolean DEFAULT false,
  window_opened_at timestamptz,
  
  -- Cost calculation
  cost numeric(10, 6) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_costs_account_created
  ON message_costs(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_costs_conversation
  ON message_costs(conversation_id);

ALTER TABLE message_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS message_costs_select ON message_costs;
CREATE POLICY message_costs_select ON message_costs FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS message_costs_insert ON message_costs;
CREATE POLICY message_costs_insert ON message_costs FOR INSERT
  WITH CHECK (is_account_member(account_id));
