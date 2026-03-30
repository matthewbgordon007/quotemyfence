-- Per-style install length pricing tiers (e.g. 10'–20' = $X/ft, 21'–30' = $Y/ft)
-- Run in Supabase SQL Editor after style-pricing-rules.sql

CREATE TABLE IF NOT EXISTS style_install_length_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  fence_style_id UUID NOT NULL REFERENCES fence_styles(id) ON DELETE CASCADE,
  min_ft NUMERIC(12,2) NOT NULL,
  max_ft NUMERIC(12,2),
  display_order INT NOT NULL DEFAULT 0,
  base_price_per_ft_low NUMERIC(10,2) NOT NULL DEFAULT 0,
  base_price_per_ft_high NUMERIC(10,2) NOT NULL DEFAULT 0,
  single_gate_low NUMERIC(10,2) DEFAULT 0,
  single_gate_high NUMERIC(10,2) DEFAULT 0,
  double_gate_low NUMERIC(10,2) DEFAULT 0,
  double_gate_high NUMERIC(10,2) DEFAULT 0,
  removal_price_per_ft_low NUMERIC(10,2) DEFAULT 0,
  removal_price_per_ft_high NUMERIC(10,2) DEFAULT 0,
  minimum_job_low NUMERIC(10,2) DEFAULT 0,
  minimum_job_high NUMERIC(10,2) DEFAULT 0,
  tax_mode TEXT DEFAULT 'excluded',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT style_install_length_tiers_min_lte_max CHECK (max_ft IS NULL OR max_ft >= min_ft)
);

CREATE INDEX IF NOT EXISTS idx_style_install_length_tiers_style
  ON style_install_length_tiers(fence_style_id)
  WHERE is_active = true;

ALTER TABLE style_install_length_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read style_install_length_tiers" ON style_install_length_tiers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Contractors manage own style_install_length_tiers" ON style_install_length_tiers
  FOR ALL
  USING (contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true))
  WITH CHECK (contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true));
