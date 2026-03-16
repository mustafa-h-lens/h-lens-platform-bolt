/*
  # Enable Anonymous Access for Vendor Portal Operations
  
  ⚠️ **SECURITY WARNING**: This migration allows unauthenticated (anonymous) users 
  to access and modify vendor-related data. This is required for the vendor 
  registration and portal functionality where vendors do not have authenticated 
  user accounts.
  
  ## Changes Made
  
  1. **vendor_selected_fields** - Allow anon users to manage field selections
  2. **vendor_financial_data** - Allow anon users to manage financial information
  3. **vendor_travel_documents** - Allow anon users to manage travel documents
  4. **vendors** - Allow anon users to read and update vendor records
  5. **vendor_fields** - Allow anon users to read field definitions
  6. **vendor_documents** - Allow anon users to manage documents
  
  ## Security Notes
  
  - These policies use USING(true) which allows unrestricted access
  - Access control should be implemented at the application layer
  - Consider implementing token-based authentication for vendor sessions
  - Sensitive operations should be audited via activity logs
*/

-- vendor_selected_fields policies
DROP POLICY IF EXISTS "Anon can manage vendor_selected_fields" ON public.vendor_selected_fields;
CREATE POLICY "Anon can manage vendor_selected_fields"
  ON public.vendor_selected_fields FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- vendor_financial_data policies
DROP POLICY IF EXISTS "Anon can manage vendor_financial_data" ON public.vendor_financial_data;
CREATE POLICY "Anon can manage vendor_financial_data"
  ON public.vendor_financial_data FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- vendor_travel_documents policies
DROP POLICY IF EXISTS "Anon can manage vendor_travel_documents" ON public.vendor_travel_documents;
CREATE POLICY "Anon can manage vendor_travel_documents"
  ON public.vendor_travel_documents FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- vendors policies
DROP POLICY IF EXISTS "Anon can read vendors" ON public.vendors;
CREATE POLICY "Anon can read vendors"
  ON public.vendors FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can update vendors" ON public.vendors;
CREATE POLICY "Anon can update vendors"
  ON public.vendors FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

-- vendor_fields policies
DROP POLICY IF EXISTS "Anon can read vendor_fields" ON public.vendor_fields;
CREATE POLICY "Anon can read vendor_fields"
  ON public.vendor_fields FOR SELECT TO anon USING (true);

-- vendor_documents policies
DROP POLICY IF EXISTS "Anon can manage vendor_documents" ON public.vendor_documents;
CREATE POLICY "Anon can manage vendor_documents"
  ON public.vendor_documents FOR ALL TO anon
  USING (true) WITH CHECK (true);
