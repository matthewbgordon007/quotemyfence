-- PDF master material list returned by supplier on quoted requests.
ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS supplier_material_list_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS supplier_material_list_pdf_name TEXT;
