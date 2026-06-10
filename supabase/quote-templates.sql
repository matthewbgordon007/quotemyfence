-- Shared quote templates per contractor (all team members see the same text).
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS quote_template_text TEXT;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS quote_template_scoped JSONB NOT NULL DEFAULT '{}'::jsonb;
