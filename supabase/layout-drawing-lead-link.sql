-- Link quote_sessions to layout_drawings for layout-originated leads
-- Run in Supabase SQL editor (after layout-drawings.sql)

ALTER TABLE quote_sessions ADD COLUMN IF NOT EXISTS layout_drawing_id UUID REFERENCES layout_drawings(id) ON DELETE SET NULL;
