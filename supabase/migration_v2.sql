-- Run this in the Supabase SQL Editor BEFORE running the import script:
-- https://supabase.com/dashboard/project/vhmwvxetvagphkiohdpc/sql

-- 1. Add flagged column to mark entries needing user review
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false;

-- 2. Make fields nullable to allow partial/incomplete imported entries
ALTER TABLE public.transactions ALTER COLUMN date        DROP NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN type        DROP NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN category    DROP NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN amount      DROP NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN description DROP NOT NULL;

-- 3. Drop old strict check constraints (allow NULL values now)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_amount_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IS NULL OR type IN ('sale', 'cost', 'expense', 'investment'));

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_amount_check
  CHECK (amount IS NULL OR amount > 0);
