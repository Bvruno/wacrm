-- Allow multiple push subscriptions per user (one per device).
-- Previously UNIQUE(user_id) forced last-write-wins — a user
-- subscribing from their phone would overwrite their desktop
-- subscription and vice versa.

ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;

-- Prevent exact duplicates but allow one sub per endpoint.
ALTER TABLE push_subscriptions ADD UNIQUE (user_id, endpoint);
