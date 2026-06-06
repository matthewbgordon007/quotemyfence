-- Help requests submitted by people using the public quote flow.
-- Surfaced to the master admin under the "Help requests" tab.
-- Run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_session_id UUID REFERENCES quote_sessions(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  page_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);
CREATE INDEX IF NOT EXISTS idx_help_requests_created ON help_requests(created_at DESC);

ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;

-- Master admins can read and update every help request.
CREATE POLICY "Master admins read all help requests"
  ON help_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM master_admins WHERE auth_id = auth.uid()));

CREATE POLICY "Master admins update help requests"
  ON help_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM master_admins WHERE auth_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM master_admins WHERE auth_id = auth.uid()));

-- Inserts from the public quote flow go through the service role key (server route),
-- which bypasses RLS, so no public INSERT policy is needed.
