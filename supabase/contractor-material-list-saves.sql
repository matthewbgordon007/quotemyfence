-- Saved map → layout sketches for a contractor (Settings / Account "Material lists").
-- Run in Supabase SQL Editor after master-admin-material-quotes.sql (needs contractors, quote_sessions).

CREATE TABLE IF NOT EXISTS contractor_material_list_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  quote_session_id UUID REFERENCES quote_sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  drawing_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_material_list_saves_contractor
  ON contractor_material_list_saves(contractor_id, created_at DESC);

ALTER TABLE contractor_material_list_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors insert own material list saves"
  ON contractor_material_list_saves FOR INSERT
  WITH CHECK (
    contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Contractors read own material list saves"
  ON contractor_material_list_saves FOR SELECT
  USING (
    contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Contractors delete own material list saves"
  ON contractor_material_list_saves FOR DELETE
  USING (
    contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  );
