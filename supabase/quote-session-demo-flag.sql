-- Tag quote sessions that originated from a public marketing demo (Try demo links).
-- Lets the master "Demos" page show who tried the demo and how far they got,
-- even when a demo runs on a real contractor's quote link.
ALTER TABLE quote_sessions
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_quote_sessions_is_demo
  ON quote_sessions (is_demo)
  WHERE is_demo = true;
