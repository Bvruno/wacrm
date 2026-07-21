CREATE TYPE account_plan_status AS ENUM ('active', 'trialing', 'past_due', 'cancelled', 'suspended');

CREATE TABLE account_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status account_plan_status DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  current_period_starts_at TIMESTAMPTZ DEFAULT now(),
  current_period_ends_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

INSERT INTO account_plans (account_id, plan_id)
SELECT a.id, sp.id
FROM accounts a
CROSS JOIN subscription_plans sp
WHERE sp.slug = 'free'
ON CONFLICT (account_id) DO NOTHING;

CREATE OR REPLACE FUNCTION assign_default_plan()
RETURNS trigger AS $$
BEGIN
  INSERT INTO account_plans (account_id, plan_id)
  SELECT NEW.id, id FROM subscription_plans WHERE slug = 'free';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_default_plan_trigger
  AFTER INSERT ON accounts
  FOR EACH ROW EXECUTE FUNCTION assign_default_plan();
