-- Master admin + material quote requests
-- Run in Supabase SQL Editor after schema.sql and layout-drawings.sql

-- 1. Master admins (single account, links to Supabase Auth)
CREATE TABLE IF NOT EXISTS master_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE master_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins full access"
  ON master_admins FOR ALL
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- 2. Material quote requests (contractor submits layout + description to master)
CREATE TABLE IF NOT EXISTS material_quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_drawing_id UUID NOT NULL REFERENCES layout_drawings(id) ON DELETE CASCADE,
  quote_session_id UUID REFERENCES quote_sessions(id) ON DELETE SET NULL,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','quoted','closed')),
  master_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_quote_requests_status ON material_quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_material_quote_requests_created ON material_quote_requests(created_at DESC);

ALTER TABLE material_quote_requests ENABLE ROW LEVEL SECURITY;

-- Contractors can insert their own requests
CREATE POLICY "Contractors insert own material requests"
  ON material_quote_requests FOR INSERT
  WITH CHECK (
    contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  );

-- Contractors can read their own requests
CREATE POLICY "Contractors read own material requests"
  ON material_quote_requests FOR SELECT
  USING (
    contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  );

-- Master admins can read all and update (for quoting)
CREATE POLICY "Master admins read all material requests"
  ON material_quote_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM master_admins WHERE auth_id = auth.uid()));

CREATE POLICY "Master admins update material requests"
  ON material_quote_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM master_admins WHERE auth_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM master_admins WHERE auth_id = auth.uid()));
