-- Per-supplier PVC calculator recipe (Layer 1): spacing, qty-per-panel, labels, packs, gate add-ons.
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS fms_calculator_recipe JSONB;
