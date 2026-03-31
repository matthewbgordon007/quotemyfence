-- One-time data fix: all install-length bands use removal $5/ft and no minimum job.
-- Run in Supabase SQL Editor (affects every contractor’s style_install_length_tiers rows).

UPDATE style_install_length_tiers
SET
  removal_price_per_ft_low = 5,
  removal_price_per_ft_high = 5,
  minimum_job_low = 0,
  minimum_job_high = 0;
