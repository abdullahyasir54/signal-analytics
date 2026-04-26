-- Run this in the Supabase SQL Editor
-- https://supabase.com/dashboard/project/vhmwvxetvagphkiohdpc/sql

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  volume            text NOT NULL,
  original_quantity integer NOT NULL CHECK (original_quantity >= 0),
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_select" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "public_insert" ON public.inventory_items FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON public.inventory_items FOR UPDATE USING (true);
CREATE POLICY "public_delete" ON public.inventory_items FOR DELETE USING (true);
