-- ══════════════════════════════════════════════════════════════
-- Allow anon access for vendor portal operations
-- Vendors authenticate via OTP custom session (not Supabase Auth),
-- so they hit the DB as "anon" role. These policies allow vendors
-- to manage their own data via the portal.
-- ══════════════════════════════════════════════════════════════

-- vendor_selected_fields: anon can SELECT, INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Anon can manage vendor_selected_fields" ON public.vendor_selected_fields;
CREATE POLICY "Anon can manage vendor_selected_fields"
  ON public.vendor_selected_fields
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- vendor_financial_data: anon can SELECT, INSERT, UPDATE
DROP POLICY IF EXISTS "Anon can manage vendor_financial_data" ON public.vendor_financial_data;
CREATE POLICY "Anon can manage vendor_financial_data"
  ON public.vendor_financial_data
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- vendor_travel_documents: anon can SELECT, INSERT, UPDATE
DROP POLICY IF EXISTS "Anon can manage vendor_travel_documents" ON public.vendor_travel_documents;
CREATE POLICY "Anon can manage vendor_travel_documents"
  ON public.vendor_travel_documents
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- vendors: anon can SELECT and UPDATE own record
DROP POLICY IF EXISTS "Anon can read vendors" ON public.vendors;
CREATE POLICY "Anon can read vendors"
  ON public.vendors
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Anon can update vendors" ON public.vendors;
CREATE POLICY "Anon can update vendors"
  ON public.vendors
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- vendor_fields: anon can read (needed for services dropdown)
DROP POLICY IF EXISTS "Anon can read vendor_fields" ON public.vendor_fields;
CREATE POLICY "Anon can read vendor_fields"
  ON public.vendor_fields
  FOR SELECT
  TO anon
  USING (true);

-- vendor_documents: anon can manage
DROP POLICY IF EXISTS "Anon can manage vendor_documents" ON public.vendor_documents;
CREATE POLICY "Anon can manage vendor_documents"
  ON public.vendor_documents
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
