-- ============================================================
-- 051_courses_payments.sql — Cursos, enlaces de pago y órdenes
-- para vender capacitaciones con Culqi (Yape, Plin, Tarjeta).
-- ============================================================

-- ============================================================
-- COURSES — catálogo de capacitaciones del agente
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_pen INTEGER CHECK (price_pen IS NULL OR price_pen > 0),
  external_id TEXT,
  hours TEXT,
  image_url TEXT,
  external_data JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_external_id ON courses(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_courses_account ON courses(account_id);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courses_select ON courses;
DROP POLICY IF EXISTS courses_insert ON courses;
DROP POLICY IF EXISTS courses_update ON courses;
DROP POLICY IF EXISTS courses_delete ON courses;

CREATE POLICY courses_select ON courses FOR SELECT
  USING (is_account_member(account_id));

CREATE POLICY courses_insert ON courses FOR INSERT
  WITH CHECK (is_account_member(account_id));

CREATE POLICY courses_update ON courses FOR UPDATE
  USING (is_account_member(account_id));

CREATE POLICY courses_delete ON courses FOR DELETE
  USING (is_account_member(account_id));

-- ============================================================
-- PAYMENT_LINKS — enlace único compartible por WhatsApp
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  amount_pen INTEGER NOT NULL CHECK (amount_pen > 0),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_links_code ON payment_links(code);
CREATE INDEX IF NOT EXISTS idx_payment_links_account ON payment_links(account_id);

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_links_select ON payment_links;
DROP POLICY IF EXISTS payment_links_insert ON payment_links;
DROP POLICY IF EXISTS payment_links_update ON payment_links;

-- Account members can view and manage their payment links
CREATE POLICY payment_links_select ON payment_links FOR SELECT
  USING (is_account_member(account_id));

CREATE POLICY payment_links_insert ON payment_links FOR INSERT
  WITH CHECK (is_account_member(account_id));

CREATE POLICY payment_links_update ON payment_links FOR UPDATE
  USING (is_account_member(account_id));

-- Public can read a payment link by code (no auth required for the pay page)
DROP POLICY IF EXISTS payment_links_public_select ON payment_links;
CREATE POLICY payment_links_public_select ON payment_links FOR SELECT
  USING (true);

-- ============================================================
-- PAYMENT_ORDERS — órdenes contra Culqi
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  payment_link_id UUID NOT NULL REFERENCES payment_links(id) ON DELETE CASCADE,
  culqi_order_id TEXT,
  amount_pen INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PEN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded')),
  payment_method TEXT CHECK (payment_method IN ('card', 'yape', 'plin')),
  cip_code TEXT,
  cip_qr_url TEXT,
  customer_email TEXT,
  customer_name TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_link ON payment_orders(payment_link_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_culqi ON payment_orders(culqi_order_id);

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_orders_select ON payment_orders;
DROP POLICY IF EXISTS payment_orders_insert ON payment_orders;
DROP POLICY IF EXISTS payment_orders_update ON payment_orders;

CREATE POLICY payment_orders_select ON payment_orders FOR SELECT
  USING (is_account_member(account_id));

CREATE POLICY payment_orders_insert ON payment_orders FOR INSERT
  WITH CHECK (is_account_member(account_id));

CREATE POLICY payment_orders_update ON payment_orders FOR UPDATE
  USING (is_account_member(account_id));

-- Service role needs full access for webhook processing
-- (already handled by service_role_key bypassing RLS)
