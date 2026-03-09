-- Run in Supabase SQL editor to add quote notification email to contractors
-- Contractors can choose where to receive new quote notifications (e.g. sales@company.com)

ALTER TABLE contractors ADD COLUMN IF NOT EXISTS quote_notification_email TEXT;
