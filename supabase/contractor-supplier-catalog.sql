-- Contractor ↔ supplier links, catalog import traceability, and material quotes to suppliers.
-- Run in Supabase SQL Editor after schema.sql, product-hierarchy.sql, style-pricing-rules.sql, master-admin-material-quotes.sql

-- 1) Which suppliers a contractor works with (contractor picks suppliers on the platform)
CREATE TABLE IF NOT EXISTS contractor_supplier_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  supplier_contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (contractor_id, supplier_contractor_id),
  CONSTRAINT contractor_supplier_links_no_self CHECK (contractor_id <> supplier_contractor_id)
);

CREATE INDEX IF NOT EXISTS idx_contractor_supplier_links_contractor ON contractor_supplier_links(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_supplier_links_supplier ON contractor_supplier_links(supplier_contractor_id);

ALTER TABLE contractor_supplier_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contractors manage own supplier links" ON contractor_supplier_links;
CREATE POLICY "Contractors manage own supplier links"
  ON contractor_supplier_links FOR ALL
  USING (
    contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS "Suppliers read links to them" ON contractor_supplier_links;
CREATE POLICY "Suppliers read links to them"
  ON contractor_supplier_links FOR SELECT
  USING (
    supplier_contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  );

-- 2) Dedupe catalog imports (one buyer copy per supplier style)
CREATE TABLE IF NOT EXISTS imported_supplier_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  supplier_contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  supplier_fence_style_id UUID NOT NULL,
  buyer_fence_style_id UUID NOT NULL REFERENCES fence_styles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (buyer_contractor_id, supplier_contractor_id, supplier_fence_style_id)
);

CREATE INDEX IF NOT EXISTS idx_imported_supplier_styles_buyer ON imported_supplier_styles(buyer_contractor_id);

ALTER TABLE imported_supplier_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers manage own import records" ON imported_supplier_styles;
CREATE POLICY "Buyers manage own import records"
  ON imported_supplier_styles FOR ALL
  USING (
    buyer_contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    buyer_contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  );

-- 3) Material quote requests: optional supplier assignment + supplier reply
ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS supplier_contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL;

ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS supplier_response TEXT;

ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS attachment_content_type TEXT;

ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS attachment_size_bytes BIGINT;

ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS supplier_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_material_quote_requests_supplier ON material_quote_requests(supplier_contractor_id);
CREATE INDEX IF NOT EXISTS idx_material_quote_requests_supplier_unread
  ON material_quote_requests(supplier_contractor_id, supplier_seen_at);

DROP POLICY IF EXISTS "Suppliers read assigned material requests" ON material_quote_requests;
CREATE POLICY "Suppliers read assigned material requests"
  ON material_quote_requests FOR SELECT
  USING (
    supplier_contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS "Suppliers update assigned material requests" ON material_quote_requests;
CREATE POLICY "Suppliers update assigned material requests"
  ON material_quote_requests FOR UPDATE
  USING (
    supplier_contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    supplier_contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  );
