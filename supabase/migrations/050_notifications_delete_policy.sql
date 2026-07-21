-- ============================================================
-- Allow clients to DELETE their own notifications (needed for
-- the "Delete" and "Clear read" actions in the /notifications UI).
-- ============================================================

-- Clients can now delete their own rows (previously only
-- INSERT and UPDATE policies existed).
DROP POLICY IF EXISTS notifications_delete ON notifications;
CREATE POLICY notifications_delete ON notifications FOR DELETE
  USING (auth.uid() = user_id);
