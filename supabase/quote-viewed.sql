-- Track when contractor has viewed a quote (for "unread" notification)
-- Run in Supabase SQL Editor once.

ALTER TABLE quote_sessions ADD COLUMN IF NOT EXISTS contractor_viewed_at TIMESTAMPTZ DEFAULT NULL;
