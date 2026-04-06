/*
  # Fix RLS policies for vendor_financial_data and vendor_travel_documents

  ## Problem
  The anon INSERT policies on vendor_financial_data and vendor_travel_documents
  restrict inserts to vendors with status = 'draft' only. However, the registration
  form submits the vendor with status 'pending_approval' directly, causing all
  secondary inserts (financial data, travel documents) to be silently blocked by RLS.

  ## Fix
  Update the WITH CHECK conditions to also allow inserts when vendor status is
  'pending_approval' or 'revision_requested', matching how vendor_selected_fields works.

  ## Tables modified
  - vendor_financial_data: "Anon can insert financial data during registration"
  - vendor_travel_documents: "Anon can insert travel documents during registration"
*/

-- Fix vendor_financial_data anon insert policy
DROP POLICY IF EXISTS "Anon can insert financial data during registration" ON vendor_financial_data;

CREATE POLICY "Anon can insert financial data during registration"
  ON vendor_financial_data
  FOR INSERT
  TO anon
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE status IN ('draft', 'pending_approval', 'revision_requested')
    )
  );

-- Fix vendor_travel_documents anon insert policy
DROP POLICY IF EXISTS "Anon can insert travel documents during registration" ON vendor_travel_documents;

CREATE POLICY "Anon can insert travel documents during registration"
  ON vendor_travel_documents
  FOR INSERT
  TO anon
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE status IN ('draft', 'pending_approval', 'revision_requested')
    )
  );

-- Also fix the update policies to allow revision_requested (vendor editing their profile after revision)
DROP POLICY IF EXISTS "Anon can update financial data during registration" ON vendor_financial_data;

CREATE POLICY "Anon can update financial data during registration"
  ON vendor_financial_data
  FOR UPDATE
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE status IN ('draft', 'pending_approval', 'revision_requested')
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE status IN ('draft', 'pending_approval', 'revision_requested')
    )
  );

DROP POLICY IF EXISTS "Anon can update travel documents during registration" ON vendor_travel_documents;

CREATE POLICY "Anon can update travel documents during registration"
  ON vendor_travel_documents
  FOR UPDATE
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE status IN ('draft', 'pending_approval', 'revision_requested')
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE status IN ('draft', 'pending_approval', 'revision_requested')
    )
  );

-- Fix delete policies too (needed for re-registration of rejected vendors)
DROP POLICY IF EXISTS "Anon can delete financial data during registration" ON vendor_financial_data;

CREATE POLICY "Anon can delete financial data during registration"
  ON vendor_financial_data
  FOR DELETE
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE status IN ('draft', 'pending_approval', 'revision_requested', 'rejected')
    )
  );

DROP POLICY IF EXISTS "Anon can delete travel documents during registration" ON vendor_travel_documents;

CREATE POLICY "Anon can delete travel documents during registration"
  ON vendor_travel_documents
  FOR DELETE
  TO anon
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE status IN ('draft', 'pending_approval', 'revision_requested', 'rejected')
    )
  );
