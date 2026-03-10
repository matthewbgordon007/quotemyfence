-- Run in Supabase SQL editor to add Stripe subscription columns
-- Subscription status: trialing, active, past_due, canceled, unpaid, incomplete_expired, etc.

ALTER TABLE contractors ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
