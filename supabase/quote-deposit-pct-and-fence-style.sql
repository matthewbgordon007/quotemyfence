-- Default deposit is 10% of grand total; contractors can override in settings.
ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS quote_deposit_pct NUMERIC(5,2) NOT NULL DEFAULT 10;

COMMENT ON COLUMN contractors.quote_deposit_pct IS 'Deposit as percent of grand total (e.g. 10 = 10%).';

-- Homeowner quote flow: style with pricing but no colour options can still be selected.
ALTER TABLE fences
  ADD COLUMN IF NOT EXISTS selected_fence_style_id UUID REFERENCES fence_styles(id) ON DELETE SET NULL;
