-- PVC fence panel material template (contractor-built BOM per panel bay).
-- Run in Supabase SQL editor.

ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS pvc_fence_material_profile JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN contractors.pvc_fence_material_profile IS
  'Panel width, custom line items/qty-per-panel; used by PVC material estimator.';
