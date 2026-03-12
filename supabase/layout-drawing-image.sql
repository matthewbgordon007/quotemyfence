-- Add optional screenshot column for layout drawings
-- Run in Supabase SQL editor

ALTER TABLE layout_drawings ADD COLUMN IF NOT EXISTS image_data_url TEXT;
