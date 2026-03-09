-- Run in Supabase SQL editor
-- Designate which sales team member receives new quote/lead notifications

ALTER TABLE sales_team_members ADD COLUMN IF NOT EXISTS receives_leads BOOLEAN DEFAULT false;
