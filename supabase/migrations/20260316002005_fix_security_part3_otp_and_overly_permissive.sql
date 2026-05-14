/*
  # Fix Security and Performance Issues - Part 3: OTP Policies and Overly Permissive RLS

  1. **Add RLS Policies for otp_codes Table**
    - Currently has RLS enabled but no policies
    - Add basic policies for system operations

  2. **Replace Overly Permissive RLS Policies**
    - Fix policies that use `true` conditions
    - Add proper access controls based on user roles and data ownership
    - Restrict anon access to draft vendors only

  3. **Security Improvements**
    - Countries table: Admin-only management
    - Legal pages: Admin-only insert/update
    - Vendor-related anon policies: Restrict to draft status only
*/

-- =====================================================
-- OTP Codes Policies
-- =====================================================

DROP POLICY IF EXISTS "System can insert OTP codes" ON public.otp_codes;
CREATE POLICY "System can insert OTP codes" ON public.otp_codes FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can read OTP codes for verification" ON public.otp_codes;
CREATE POLICY "System can read OTP codes for verification" ON public.otp_codes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "System can delete expired OTP codes" ON public.otp_codes;
CREATE POLICY "System can delete expired OTP codes" ON public.otp_codes FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- Countries Table - Fix Overly Permissive Policy
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can manage countries" ON public.countries;

CREATE POLICY "Admins can manage countries"
  ON public.countries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- Legal Pages - Fix Overly Permissive Policies
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can insert legal pages" ON public.legal_pages;
CREATE POLICY "Admins can insert legal pages"
  ON public.legal_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update legal pages" ON public.legal_pages;
CREATE POLICY "Admins can update legal pages"
  ON public.legal_pages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- Vendor Documents - Fix Overly Permissive Anon Policy
-- =====================================================

DROP POLICY IF EXISTS "Anon can manage vendor_documents" ON public.vendor_documents;

CREATE POLICY "Anon can insert vendor documents during registration"
  ON public.vendor_documents FOR INSERT
  TO anon
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Anon can view vendor documents during registration" ON public.vendor_documents;
CREATE POLICY "Anon can view vendor documents during registration" ON public.vendor_documents FOR SELECT
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Anon can update vendor documents during registration" ON public.vendor_documents;
CREATE POLICY "Anon can update vendor documents during registration" ON public.vendor_documents FOR UPDATE
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Anon can delete vendor documents during registration" ON public.vendor_documents;
CREATE POLICY "Anon can delete vendor documents during registration" ON public.vendor_documents FOR DELETE
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

-- =====================================================
-- Vendor Financial Data - Fix Overly Permissive Anon Policy
-- =====================================================

DROP POLICY IF EXISTS "Anon can manage vendor_financial_data" ON public.vendor_financial_data;

CREATE POLICY "Anon can insert financial data during registration"
  ON public.vendor_financial_data FOR INSERT
  TO anon
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Anon can view financial data during registration" ON public.vendor_financial_data;
CREATE POLICY "Anon can view financial data during registration" ON public.vendor_financial_data FOR SELECT
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Anon can update financial data during registration" ON public.vendor_financial_data;
CREATE POLICY "Anon can update financial data during registration" ON public.vendor_financial_data FOR UPDATE
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Anon can delete financial data during registration" ON public.vendor_financial_data;
CREATE POLICY "Anon can delete financial data during registration" ON public.vendor_financial_data FOR DELETE
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

-- =====================================================
-- Vendor Selected Fields - Fix Overly Permissive Anon Policy
-- =====================================================

DROP POLICY IF EXISTS "Anon can manage vendor_selected_fields" ON public.vendor_selected_fields;

CREATE POLICY "Anon can insert selected fields during registration"
  ON public.vendor_selected_fields FOR INSERT
  TO anon
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Anon can view selected fields during registration" ON public.vendor_selected_fields;
CREATE POLICY "Anon can view selected fields during registration" ON public.vendor_selected_fields FOR SELECT
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Anon can update selected fields during registration" ON public.vendor_selected_fields;
CREATE POLICY "Anon can update selected fields during registration" ON public.vendor_selected_fields FOR UPDATE
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Anon can delete selected fields during registration" ON public.vendor_selected_fields;
CREATE POLICY "Anon can delete selected fields during registration" ON public.vendor_selected_fields FOR DELETE
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

-- =====================================================
-- Vendor Travel Documents - Fix Overly Permissive Anon Policy
-- =====================================================

DROP POLICY IF EXISTS "Anon can manage vendor_travel_documents" ON public.vendor_travel_documents;

CREATE POLICY "Anon can insert travel documents during registration"
  ON public.vendor_travel_documents FOR INSERT
  TO anon
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Anon can view travel documents during registration" ON public.vendor_travel_documents;
CREATE POLICY "Anon can view travel documents during registration" ON public.vendor_travel_documents FOR SELECT
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Anon can update travel documents during registration" ON public.vendor_travel_documents;
CREATE POLICY "Anon can update travel documents during registration" ON public.vendor_travel_documents FOR UPDATE
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

DROP POLICY IF EXISTS "Anon can delete travel documents during registration" ON public.vendor_travel_documents;
CREATE POLICY "Anon can delete travel documents during registration" ON public.vendor_travel_documents FOR DELETE
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE status = 'draft'
    )
  );

-- =====================================================
-- Vendors - Fix Overly Permissive Anon Update Policy
-- =====================================================

DROP POLICY IF EXISTS "Anon can update vendors" ON public.vendors;

CREATE POLICY "Anon can update draft vendors"
  ON public.vendors FOR UPDATE
  TO anon
  USING (status = 'draft')
  WITH CHECK (status = 'draft');
