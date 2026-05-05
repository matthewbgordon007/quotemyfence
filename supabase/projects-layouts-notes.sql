-- Customer notes + projects + optional layout→lead link. Run in Supabase SQL editor.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS project_id UUID;

CREATE TABLE IF NOT EXISTS contractor_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  address TEXT,
  fence_type_id UUID REFERENCES fence_types(id) ON DELETE SET NULL,
  fence_style_id UUID REFERENCES fence_styles(id) ON DELETE SET NULL,
  colour_option_id UUID REFERENCES colour_options(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_projects_contractor ON contractor_projects(contractor_id);

ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_project_id_fkey;

ALTER TABLE customers
  ADD CONSTRAINT customers_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES contractor_projects(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS contractor_project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES contractor_projects(id) ON DELETE CASCADE,
  quote_session_id UUID NOT NULL REFERENCES quote_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quote_session_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON contractor_project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_session ON contractor_project_members(quote_session_id);

ALTER TABLE layout_drawings ADD COLUMN IF NOT EXISTS quote_session_id UUID REFERENCES quote_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_layout_drawings_quote_session ON layout_drawings(quote_session_id);

ALTER TABLE contractor_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contractors manage own projects" ON contractor_projects;
CREATE POLICY "Contractors manage own projects"
  ON contractor_projects FOR ALL
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

DROP POLICY IF EXISTS "Contractors manage project members" ON contractor_project_members;
CREATE POLICY "Contractors manage project members"
  ON contractor_project_members FOR ALL
  USING (
    project_id IN (
      SELECT id FROM contractor_projects WHERE contractor_id IN (
        SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true
      )
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM contractor_projects WHERE contractor_id IN (
        SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true
      )
    )
  );
