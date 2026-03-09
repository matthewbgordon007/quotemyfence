-- Track lead status so contractors can mark who they've contacted
-- Run in Supabase SQL Editor once.

ALTER TABLE quote_sessions ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'new'
  CHECK (lead_status IN ('new', 'contacted', 'quoted', 'won', 'lost'));
