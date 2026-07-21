-- ============================================================
-- 047: Add sort_order to custom_fields for drag-and-drop reorder
-- ============================================================

ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_custom_fields_sort_order
  ON custom_fields(account_id, sort_order, field_name);
