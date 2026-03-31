-- Product hierarchy: Height → Fence Type (material) → Style → Colour (with photo per colour)
-- Run in Supabase SQL Editor after schema.sql

-- 1. Fence heights (e.g. 4 ft, 5 ft, 6 ft)
CREATE TABLE IF NOT EXISTS fence_heights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  height_ft NUMERIC(5,2) NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Fence types / materials (e.g. Vinyl, Cedar, Chain Link) - under each height
CREATE TABLE IF NOT EXISTS fence_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  height_id UUID NOT NULL REFERENCES fence_heights(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Fence styles (e.g. Privacy, Semi-Privacy) - under each fence type; optional photo per style
CREATE TABLE IF NOT EXISTS fence_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fence_type_id UUID NOT NULL REFERENCES fence_types(id) ON DELETE CASCADE,
  style_name TEXT NOT NULL,
  photo_url TEXT,
  display_order INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- If table already existed without photo_url, add the column
ALTER TABLE fence_styles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE fence_styles ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- 4. Colour options (with photo) - under each style; this is the leaf the customer picks
CREATE TABLE IF NOT EXISTS colour_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fence_style_id UUID NOT NULL REFERENCES fence_styles(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  photo_url TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Pricing rules for colour options (one per colour_option)
CREATE TABLE IF NOT EXISTS colour_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  colour_option_id UUID NOT NULL REFERENCES colour_options(id) ON DELETE CASCADE,
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
  UNIQUE(colour_option_id)
);

-- Add selected_colour_option_id to fences (customer's final choice)
ALTER TABLE fences ADD COLUMN IF NOT EXISTS selected_colour_option_id UUID REFERENCES colour_options(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE fence_heights ENABLE ROW LEVEL SECURITY;
ALTER TABLE fence_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE fence_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE colour_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE colour_pricing_rules ENABLE ROW LEVEL SECURITY;

-- Public read (for customer design flow)
CREATE POLICY "Public read fence_heights"
  ON fence_heights FOR SELECT USING (is_active = true);
CREATE POLICY "Public read fence_types"
  ON fence_types FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Public read fence_styles" ON fence_styles;
CREATE POLICY "Public read fence_styles"
  ON fence_styles FOR SELECT USING (is_active = true AND COALESCE(is_hidden, false) = false);
CREATE POLICY "Public read colour_options"
  ON colour_options FOR SELECT USING (is_active = true);
CREATE POLICY "Public read colour_pricing_rules"
  ON colour_pricing_rules FOR SELECT USING (is_active = true);
