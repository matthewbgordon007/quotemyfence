-- Standard height per fence type (contractor sets this; customer no longer picks height)
-- Run in Supabase SQL Editor after product-hierarchy.sql

ALTER TABLE fence_types ADD COLUMN IF NOT EXISTS standard_height_ft NUMERIC(5,2);

-- Backfill from parent height
UPDATE fence_types ft
SET standard_height_ft = fh.height_ft
FROM fence_heights fh
WHERE ft.height_id = fh.id AND ft.standard_height_ft IS NULL;

-- Default for any new rows without a height
ALTER TABLE fence_types ALTER COLUMN standard_height_ft SET DEFAULT 6;
UPDATE fence_types SET standard_height_ft = 6 WHERE standard_height_ft IS NULL;
