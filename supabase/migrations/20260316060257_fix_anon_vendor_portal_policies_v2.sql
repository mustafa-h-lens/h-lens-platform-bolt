-- Drop any conflicting policies first, then create fresh ones
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['vendor_documents', 'vendor_financial_data', 'vendor_travel_documents', 'vendor_selected_fields'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Anon can manage %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anon can read %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anon can insert %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anon can update %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anon can delete %1$s" ON public.%1$s', t);

    EXECUTE format('CREATE POLICY "Anon read %1$s" ON public.%1$s FOR SELECT TO anon USING (true)', t);
    EXECUTE format('CREATE POLICY "Anon insert %1$s" ON public.%1$s FOR INSERT TO anon WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "Anon update %1$s" ON public.%1$s FOR UPDATE TO anon USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "Anon delete %1$s" ON public.%1$s FOR DELETE TO anon USING (true)', t);
  END LOOP;
END $$;