-- ============================================================
-- 062_drop_courses_payments.sql — elimina el sistema de venta de
-- cursos (courses, enlaces de pago y órdenes) y su integración CEAS.
-- ============================================================

DROP TABLE IF EXISTS payment_orders;
DROP TABLE IF EXISTS payment_links;
DROP TABLE IF EXISTS courses;
