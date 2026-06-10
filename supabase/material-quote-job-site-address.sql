-- Job site address on material quote requests (required when sending; flows to material calculator).
ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS job_site_address TEXT;
