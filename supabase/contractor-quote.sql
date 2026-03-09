-- Store contractor-generated quote text on the customer's session
-- Run in Supabase SQL editor

ALTER TABLE quote_sessions ADD COLUMN IF NOT EXISTS contractor_quote_text TEXT;
ALTER TABLE quote_sessions ADD COLUMN IF NOT EXISTS contractor_quote_saved_at TIMESTAMPTZ;
