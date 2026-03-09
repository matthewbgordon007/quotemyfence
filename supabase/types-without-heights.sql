-- Fence types as top-level: contractor_id + optional height_id. Run after standard-height-on-types.sql

-- Add contractor_id and make height_id nullable
ALTER TABLE fence_types ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE;

-- Backfill contractor_id from parent height
UPDATE fence_types ft
SET contractor_id = fh.contractor_id
FROM fence_heights fh
WHERE ft.height_id = fh.id AND ft.contractor_id IS NULL;

-- Allow types without a height (new flow: add type, set standard height)
ALTER TABLE fence_types ALTER COLUMN height_id DROP NOT NULL;
