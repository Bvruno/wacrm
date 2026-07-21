-- Add per-event notification preferences to push_subscriptions.
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{"new_message":true,"conversation_assigned":true,"broadcast_completed":false,"contact_imported":false,"automation_failed":false}'::jsonb;
