-- Add supplier account type support for contractors table
ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'contractor';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contractors_account_type_check'
  ) THEN
    ALTER TABLE contractors
      ADD CONSTRAINT contractors_account_type_check
      CHECK (account_type IN ('contractor', 'supplier'));
  END IF;
END $$;
