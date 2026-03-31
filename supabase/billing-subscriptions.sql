-- Stripe billing fields for contractor subscriptions
-- Safe to re-run.

ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_trial_ends_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS contractors_stripe_customer_id_idx
  ON contractors (stripe_customer_id);

