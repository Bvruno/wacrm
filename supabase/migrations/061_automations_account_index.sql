-- ============================================================
-- 061_automations_account_index.sql — Add account-scoped trigger index
--
-- The engine's hot path queries active automations by BOTH
-- account_id AND trigger_type. The partial index created in 006 only
-- covers trigger_type, so the planner must filter account_id from
-- the heap. Replacing it with a composite partial index makes the
-- engine lookup index-only for the common case.
-- ============================================================

DROP INDEX IF EXISTS idx_automations_active_trigger;

CREATE INDEX IF NOT EXISTS idx_automations_account_active_trigger
  ON automations(account_id, trigger_type)
  WHERE is_active = TRUE;
