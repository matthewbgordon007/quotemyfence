-- Gate map positions: the public drawing flow and layout import read/write per-gate
-- coordinates (app/api/public/quote-session/[id]/drawing, lib/map-fence-to-layout-drawing).
ALTER TABLE gates ADD COLUMN IF NOT EXISTS lat NUMERIC(12,8);
ALTER TABLE gates ADD COLUMN IF NOT EXISTS lng NUMERIC(12,8);
