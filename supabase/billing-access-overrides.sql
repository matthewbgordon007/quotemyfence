-- Manual billing overrides for selected contractor accounts.
-- Safe to re-run.

ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS billing_access_override BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_access_override_note TEXT;

