CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  interval TEXT DEFAULT 'month',
  stripe_price_id TEXT,
  features JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO subscription_plans (name, slug, description, price, currency, features, sort_order) VALUES
  ('Free', 'free', 'Perfect to get started', 0, 'usd', '{"max_agents": 2, "max_messages_per_day": 100, "has_broadcasts": false, "has_automations": false, "has_ai_assistant": false}', 1),
  ('Pro', 'pro', 'For growing teams', 2900, 'usd', '{"max_agents": 10, "max_messages_per_day": 1000, "has_broadcasts": true, "has_automations": true, "has_ai_assistant": true}', 2),
  ('Enterprise', 'enterprise', 'For organizations', 9900, 'usd', '{"max_agents": -1, "max_messages_per_day": -1, "has_broadcasts": true, "has_automations": true, "has_ai_assistant": true}', 3)
ON CONFLICT (slug) DO NOTHING;
