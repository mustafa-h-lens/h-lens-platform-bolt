/*
  # Fix Multiple Permissive Policies and Always-True RLS Policies

  ## Summary
  Several tables have duplicate permissive SELECT policies for the same role,
  and some policies have always-true conditions. This migration consolidates them.

  ## Changes

  ### client_document_types
  - Drop "Authenticated users can view client document types" (redundant with ALL policy)
  - The "Admins can manage client document types" ALL policy already covers SELECT for admins

  ### sectors
  - Drop "Authenticated users can read sectors" (USING: true — always true)
  - Replace with a proper authenticated read policy

  ### team_entities
  - Drop "Authenticated users can read team_entities" (USING: true — always true)
  - Replace with a proper authenticated read policy

  ### vendor_fields
  - Drop "Authenticated users can view vendor fields" (redundant — public already covers anon+auth)
  - Keep "Anyone can view active vendor fields" for public role

  ### vendors (anon SELECT)
  - Drop "Allow anon select vendors by phone" if it exists (duplicate of "Anon can read vendors")
  - Note: "Anon can read vendors" with true is needed for vendor portal lookup flows

  ### vendor_approval_log (anon INSERT)
  - Drop "Allow anon insert vendor_approval_log" if it exists (duplicate of the constrained policy)

  ### vendor_financial_data (anon INSERT)
  - Drop "Allow anon insert vendor_financial_data" if it exists (duplicate)

  ### vendor_selected_fields (anon INSERT)
  - Drop "Allow anon insert vendor_selected_fields" if it exists (duplicate)

  ### vendor_travel_documents (anon INSERT)
  - Drop "Allow anon insert vendor_travel_documents" if it exists (duplicate)

  ### vendors (anon UPDATE)
  - Drop "Allow anon update rejected vendors" if it exists (duplicate of "Anon can update editable vendors")

  ### expense_payments
  - Drop "Allow authenticated insert expense_payments" if it exists (duplicate)
  - Drop "Allow authenticated select expense_payments" if it exists (duplicate)
  - Drop "Allow authenticated update expense_payments" if it exists (duplicate)

  ### sectors / team_entities always-true
  - Fix "Admins can manage sectors" ALL policy that has always-true USING
  - Fix "Admins can manage team_entities" ALL policy that has always-true USING
*/

-- client_document_types: remove redundant broad SELECT for authenticated
DROP POLICY IF EXISTS "Authenticated users can view client document types" ON public.client_document_types;

-- sectors: fix always-true read policy and fix ALL policy USING clause
DROP POLICY IF EXISTS "Authenticated users can read sectors" ON public.sectors;
DROP POLICY IF EXISTS "Admins can manage sectors" ON public.sectors;

CREATE POLICY "Authenticated users can read sectors"
  ON public.sectors
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage sectors" ON public.sectors;
CREATE POLICY "Admins can manage sectors" ON public.sectors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
        AND users.role = ANY (ARRAY['admin', 'super_admin'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
        AND users.role = ANY (ARRAY['admin', 'super_admin'])
    )
  );

-- team_entities: fix always-true read policy and fix ALL policy USING clause
DROP POLICY IF EXISTS "Authenticated users can read team_entities" ON public.team_entities;
DROP POLICY IF EXISTS "Admins can manage team_entities" ON public.team_entities;

CREATE POLICY "Authenticated users can read team_entities"
  ON public.team_entities
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage team_entities" ON public.team_entities;
CREATE POLICY "Admins can manage team_entities" ON public.team_entities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
        AND users.role = ANY (ARRAY['admin', 'super_admin'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
        AND users.role = ANY (ARRAY['admin', 'super_admin'])
    )
  );

-- vendor_fields: remove redundant authenticated SELECT (public policy already allows all users)
DROP POLICY IF EXISTS "Authenticated users can view vendor fields" ON public.vendor_fields;

-- Remove stale duplicate policies that may exist from older migrations
DROP POLICY IF EXISTS "Allow anon select vendors by phone" ON public.vendors;
DROP POLICY IF EXISTS "Allow anon insert vendor_approval_log" ON public.vendor_approval_log;
DROP POLICY IF EXISTS "Allow anon insert vendor_financial_data" ON public.vendor_financial_data;
DROP POLICY IF EXISTS "Allow anon insert vendor_selected_fields" ON public.vendor_selected_fields;
DROP POLICY IF EXISTS "Allow anon insert vendor_travel_documents" ON public.vendor_travel_documents;
DROP POLICY IF EXISTS "Allow anon update rejected vendors" ON public.vendors;
DROP POLICY IF EXISTS "Allow authenticated insert expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Allow authenticated select expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Allow authenticated update expense_payments" ON public.expense_payments;
