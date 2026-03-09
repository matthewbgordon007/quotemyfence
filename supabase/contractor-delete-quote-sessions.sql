-- Allow contractors to delete their own quote sessions (customers)
-- Run in Supabase SQL Editor

CREATE POLICY "Contractors can delete own quote_sessions"
  ON quote_sessions FOR DELETE
  USING (
    contractor_id IN (
      SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true
    )
  );
