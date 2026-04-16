-- Style-level pricing (one price per style, shared by all colours under it)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS style_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  fence_style_id UUID NOT NULL REFERENCES fence_styles(id) ON DELETE CASCADE,
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
  contractor_material_price_per_ft NUMERIC(10,2) DEFAULT 0,
  contractor_material_single_gate NUMERIC(10,2) DEFAULT 0,
  contractor_material_double_gate NUMERIC(10,2) DEFAULT 0,
  contractor_material_minimum_job NUMERIC(10,2) DEFAULT 0,
  tax_mode TEXT DEFAULT 'excluded',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fence_style_id)
);

ALTER TABLE style_pricing_rules ADD COLUMN IF NOT EXISTS contractor_material_price_per_ft NUMERIC(10,2) DEFAULT 0;
ALTER TABLE style_pricing_rules ADD COLUMN IF NOT EXISTS contractor_material_single_gate NUMERIC(10,2) DEFAULT 0;
ALTER TABLE style_pricing_rules ADD COLUMN IF NOT EXISTS contractor_material_double_gate NUMERIC(10,2) DEFAULT 0;
ALTER TABLE style_pricing_rules ADD COLUMN IF NOT EXISTS contractor_material_minimum_job NUMERIC(10,2) DEFAULT 0;

-- Migrate: create style rules from first colour rule per style (for existing data)
INSERT INTO style_pricing_rules (
  contractor_id, fence_style_id,
  base_price_per_ft_low, base_price_per_ft_high,
  single_gate_low, single_gate_high, double_gate_low, double_gate_high,
  removal_price_per_ft_low, removal_price_per_ft_high,
  minimum_job_low, minimum_job_high, tax_mode
)
SELECT DISTINCT ON (c.fence_style_id)
  cpr.contractor_id, c.fence_style_id,
  cpr.base_price_per_ft_low, cpr.base_price_per_ft_high,
  cpr.single_gate_low, cpr.single_gate_high, cpr.double_gate_low, cpr.double_gate_high,
  cpr.removal_price_per_ft_low, cpr.removal_price_per_ft_high,
  cpr.minimum_job_low, cpr.minimum_job_high, COALESCE(cpr.tax_mode, 'excluded')
FROM colour_pricing_rules cpr
JOIN colour_options c ON c.id = cpr.colour_option_id
WHERE NOT EXISTS (
  SELECT 1 FROM style_pricing_rules spr WHERE spr.fence_style_id = c.fence_style_id
)
ORDER BY c.fence_style_id, cpr.created_at;

ALTER TABLE style_pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read style_pricing_rules" ON style_pricing_rules
  FOR SELECT USING (is_active = true);

CREATE POLICY "Contractors manage own style_pricing_rules" ON style_pricing_rules
  FOR ALL
  USING (contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true))
  WITH CHECK (contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true));
