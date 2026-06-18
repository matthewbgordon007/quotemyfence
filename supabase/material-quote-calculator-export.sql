-- Persist job label + fence colour from the FMS material calculator when a supplier sends a quote.
ALTER TABLE material_quote_requests
  ADD COLUMN IF NOT EXISTS calculator_fence_colour TEXT;
