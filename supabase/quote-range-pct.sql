-- Allow each contractor to set customer-facing estimate range percentage.
ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS quote_range_pct NUMERIC(5,2) NOT NULL DEFAULT 5;

