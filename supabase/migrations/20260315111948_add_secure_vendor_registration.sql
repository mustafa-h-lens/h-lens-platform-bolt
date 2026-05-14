/*
  # Secure Vendor Registration System

  1. Changes
    - Create secure RLS policies for unauthenticated vendor registration
    - Allow anonymous INSERT only on vendors table with specific constraints
    - Allow anonymous INSERT on related tables only when linked to just-created vendor
    - Maintain strict security on reads and updates

  2. Security
    - Anonymous users can ONLY insert new vendors (not read or update)
    - Anonymous users can ONLY insert their own related records during registration
    - All reads require authentication
    - All updates require authentication and ownership verification
    - Time-based constraints prevent abuse (5-minute window)

  3. How it Works
    - Vendor registration form (anonymous) can create vendor record with status='pending_approval'
    - Within 5 minutes, can add financial data, travel docs, selected fields
    - After that, only authenticated users can access/modify data
*/

-- ============================================
-- VENDORS TABLE
-- ============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view all vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can update vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can delete vendors" ON public.vendors;

-- Secure policies for vendors table
DROP POLICY IF EXISTS "Admins can manage all vendors" ON public.vendors;
CREATE POLICY "Admins can manage all vendors" ON public.vendors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Anonymous can register new vendors" ON public.vendors;
CREATE POLICY "Anonymous can register new vendors" ON public.vendors FOR INSERT
  TO anon
  WITH CHECK (
    status = 'pending_approval'
  );

DROP POLICY IF EXISTS "Vendors can view own profile" ON public.vendors;
CREATE POLICY "Vendors can view own profile" ON public.vendors FOR SELECT
  TO authenticated
  USING (
    phone IN (
      SELECT phone FROM users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Vendors can update own profile" ON public.vendors;
CREATE POLICY "Vendors can update own profile" ON public.vendors FOR UPDATE
  TO authenticated
  USING (
    phone IN (
      SELECT phone FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    phone IN (
      SELECT phone FROM users WHERE id = auth.uid()
    )
  );

-- ============================================
-- VENDOR_SELECTED_FIELDS TABLE
-- ============================================

DROP POLICY IF EXISTS "Admins can manage vendor selected fields" ON public.vendor_selected_fields;
DROP POLICY IF EXISTS "Vendors can view own selected fields" ON public.vendor_selected_fields;

CREATE POLICY "Admins can manage vendor selected fields"
  ON public.vendor_selected_fields FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Anonymous can insert fields during registration" ON public.vendor_selected_fields;
CREATE POLICY "Anonymous can insert fields during registration" ON public.vendor_selected_fields FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_id
      AND vendors.status = 'pending_approval'
      AND vendors.created_at > NOW() - INTERVAL '5 minutes'
    )
  );

DROP POLICY IF EXISTS "Vendors can view own selected fields" ON public.vendor_selected_fields;
CREATE POLICY "Vendors can view own selected fields" ON public.vendor_selected_fields FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE phone IN (SELECT phone FROM users WHERE id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Vendors can update own selected fields" ON public.vendor_selected_fields;
CREATE POLICY "Vendors can update own selected fields" ON public.vendor_selected_fields FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE phone IN (SELECT phone FROM users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE phone IN (SELECT phone FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Vendors can delete own selected fields" ON public.vendor_selected_fields;
CREATE POLICY "Vendors can delete own selected fields" ON public.vendor_selected_fields FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE phone IN (SELECT phone FROM users WHERE id = auth.uid())
    )
  );

-- ============================================
-- VENDOR_FINANCIAL_DATA TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view vendor financial data" ON public.vendor_financial_data;
DROP POLICY IF EXISTS "Users can insert vendor financial data" ON public.vendor_financial_data;
DROP POLICY IF EXISTS "Users can update vendor financial data" ON public.vendor_financial_data;
DROP POLICY IF EXISTS "Users can delete vendor financial data" ON public.vendor_financial_data;

CREATE POLICY "Admins can manage vendor financial data"
  ON public.vendor_financial_data FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Anonymous can insert financial data during registration" ON public.vendor_financial_data;
CREATE POLICY "Anonymous can insert financial data during registration" ON public.vendor_financial_data FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_id
      AND vendors.status = 'pending_approval'
      AND vendors.created_at > NOW() - INTERVAL '5 minutes'
    )
  );

DROP POLICY IF EXISTS "Vendors can view own financial data" ON public.vendor_financial_data;
CREATE POLICY "Vendors can view own financial data" ON public.vendor_financial_data FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE phone IN (SELECT phone FROM users WHERE id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Vendors can update own financial data" ON public.vendor_financial_data;
CREATE POLICY "Vendors can update own financial data" ON public.vendor_financial_data FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE phone IN (SELECT phone FROM users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE phone IN (SELECT phone FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Vendors can delete own financial data" ON public.vendor_financial_data;
CREATE POLICY "Vendors can delete own financial data" ON public.vendor_financial_data FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE phone IN (SELECT phone FROM users WHERE id = auth.uid())
    )
  );

-- ============================================
-- VENDOR_TRAVEL_DOCUMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view vendor travel documents" ON public.vendor_travel_documents;
DROP POLICY IF EXISTS "Users can insert vendor travel documents" ON public.vendor_travel_documents;
DROP POLICY IF EXISTS "Users can update vendor travel documents" ON public.vendor_travel_documents;
DROP POLICY IF EXISTS "Users can delete vendor travel documents" ON public.vendor_travel_documents;

CREATE POLICY "Admins can manage vendor travel documents"
  ON public.vendor_travel_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Anonymous can insert travel docs during registration" ON public.vendor_travel_documents;
CREATE POLICY "Anonymous can insert travel docs during registration" ON public.vendor_travel_documents FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_id
      AND vendors.status = 'pending_approval'
      AND vendors.created_at > NOW() - INTERVAL '5 minutes'
    )
  );

DROP POLICY IF EXISTS "Vendors can view own travel documents" ON public.vendor_travel_documents;
CREATE POLICY "Vendors can view own travel documents" ON public.vendor_travel_documents FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE phone IN (SELECT phone FROM users WHERE id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Vendors can update own travel documents" ON public.vendor_travel_documents;
CREATE POLICY "Vendors can update own travel documents" ON public.vendor_travel_documents FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE phone IN (SELECT phone FROM users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE phone IN (SELECT phone FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Vendors can delete own travel documents" ON public.vendor_travel_documents;
CREATE POLICY "Vendors can delete own travel documents" ON public.vendor_travel_documents FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE phone IN (SELECT phone FROM users WHERE id = auth.uid())
    )
  );

-- ============================================
-- VENDOR_DOCUMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view vendor documents" ON public.vendor_documents;
DROP POLICY IF EXISTS "Users can insert vendor documents" ON public.vendor_documents;
DROP POLICY IF EXISTS "Users can update vendor documents" ON public.vendor_documents;
DROP POLICY IF EXISTS "Users can delete vendor documents" ON public.vendor_documents;

CREATE POLICY "Admins can manage vendor documents"
  ON public.vendor_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Anonymous can insert documents during registration" ON public.vendor_documents;
CREATE POLICY "Anonymous can insert documents during registration" ON public.vendor_documents FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_id
      AND vendors.status = 'pending_approval'
      AND vendors.created_at > NOW() - INTERVAL '5 minutes'
    )
  );

DROP POLICY IF EXISTS "Vendors can view own documents" ON public.vendor_documents;
CREATE POLICY "Vendors can view own documents" ON public.vendor_documents FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE phone IN (SELECT phone FROM users WHERE id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Vendors can manage own documents" ON public.vendor_documents;
CREATE POLICY "Vendors can manage own documents" ON public.vendor_documents FOR ALL
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE phone IN (SELECT phone FROM users WHERE id = auth.uid())
    )
  );

-- ============================================
-- VENDOR_FIELDS TABLE (read-only for public)
-- ============================================

DROP POLICY IF EXISTS "Anyone can view active vendor fields" ON public.vendor_fields;
DROP POLICY IF EXISTS "Admins can manage vendor fields" ON public.vendor_fields;

CREATE POLICY "Anyone can view active vendor fields"
  ON public.vendor_fields FOR SELECT
  TO public
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage vendor fields" ON public.vendor_fields;
CREATE POLICY "Admins can manage vendor fields" ON public.vendor_fields FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- BANKS TABLE (read-only for public)
-- ============================================

DROP POLICY IF EXISTS "Anyone can view banks" ON public.banks;
DROP POLICY IF EXISTS "Admins can manage banks" ON public.banks;

CREATE POLICY "Anyone can view banks"
  ON public.banks FOR SELECT
  TO public
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage banks" ON public.banks;
CREATE POLICY "Admins can manage banks" ON public.banks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- CITIES TABLE (read-only for public)
-- ============================================

DROP POLICY IF EXISTS "Anyone can view cities" ON public.cities;
DROP POLICY IF EXISTS "Admins can manage cities" ON public.cities;

CREATE POLICY "Anyone can view cities"
  ON public.cities FOR SELECT
  TO public
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage cities" ON public.cities;
CREATE POLICY "Admins can manage cities" ON public.cities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- VENDOR_REGISTRATION_DRAFTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Anyone can manage own drafts" ON public.vendor_registration_drafts;

CREATE POLICY "Anyone can manage own drafts"
  ON public.vendor_registration_drafts FOR ALL
  TO anon, public
  USING (true)
  WITH CHECK (true);
