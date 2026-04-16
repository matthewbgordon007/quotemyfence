-- Per-supplier-company embedded calculator links (Google Sheet / Excel URLs) shared by all users on that account.
-- Run in Supabase SQL editor (idempotent).

ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS supplier_embed_calculator_config JSONB;

COMMENT ON COLUMN contractors.supplier_embed_calculator_config IS
  'Supplier-only: { version, googlePasted, excelPasted, active, googleSheetsMode } for embedded sheet calculator.';
