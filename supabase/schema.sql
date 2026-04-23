-- Run this in the Supabase SQL Editor
-- https://supabase.com/dashboard/project/vhmwvxetvagphkiohdpc/sql

CREATE TABLE IF NOT EXISTS public.transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL,
  type        text NOT NULL CHECK (type IN ('sale', 'cost', 'expense')),
  category    text NOT NULL,
  amount      numeric(14, 2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Allow public read/write via the anon key (no auth required)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_select" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "public_insert" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON public.transactions FOR UPDATE USING (true);
CREATE POLICY "public_delete" ON public.transactions FOR DELETE USING (true);
