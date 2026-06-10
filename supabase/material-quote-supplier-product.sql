-- Supplier product selection on material quote requests (PVC, Adobe, etc.)
ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS supplier_fence_type_id UUID REFERENCES fence_types(id) ON DELETE SET NULL;

ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS supplier_fence_style_id UUID REFERENCES fence_styles(id) ON DELETE SET NULL;

ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS supplier_colour_option_id UUID REFERENCES colour_options(id) ON DELETE SET NULL;
