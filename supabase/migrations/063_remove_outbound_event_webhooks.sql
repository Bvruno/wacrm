-- ============================================================
-- 063_remove_outbound_event_webhooks.sql
--
-- Removes the outbound event webhooks feature (public API "react to
-- inbound" push, migration 028). The feature's code was deleted:
--   - src/app/api/v1/webhooks/*            (REST management routes)
--   - src/lib/webhooks/{deliver,events,endpoints,sign}.ts
-- The `send_webhook` automation/flow step is unrelated (it calls a
-- user-supplied URL) and survives — it keeps src/lib/webhooks/ssrf.ts.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

DROP FUNCTION IF EXISTS public.record_webhook_failure(uuid, integer);

DROP TABLE IF EXISTS webhook_endpoints;
