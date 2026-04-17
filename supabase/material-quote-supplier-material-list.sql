-- Supplier material line items + contractor notification tracking for material quote requests.
-- Run in Supabase SQL Editor after contractor-supplier-catalog.sql

ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS supplier_material_list_json JSONB;

ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS supplier_quoted_emailed_at TIMESTAMPTZ;
