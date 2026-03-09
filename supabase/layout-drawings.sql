-- Run in Supabase SQL editor
-- Layout drawings: contractor can save fence layout drawings with a title

CREATE TABLE IF NOT EXISTS layout_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  drawing_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_layout_drawings_contractor ON layout_drawings(contractor_id);

ALTER TABLE layout_drawings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contractors manage own layout_drawings" ON layout_drawings;
CREATE POLICY "Contractors manage own layout_drawings"
  ON layout_drawings FOR ALL
  USING (
    contractor_id IN (
      SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    contractor_id IN (
      SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true
    )
  );
