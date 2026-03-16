/*
  # Fix anon INSERT policy for vendor_selected_fields

  ## Problem
  The existing INSERT policy restricts anon inserts to vendors with status = 'draft'.
  No vendors have 'draft' status (they are 'pending_approval' or 'active'),
  causing the RLS violation on insert.

  ## Fix
  Drop and recreate the INSERT policy to allow anon inserts for vendors in
  any registration-phase status: draft, pending_approval, or active.
*/

DROP POLICY IF EXISTS "Anon can insert selected fields during registration" ON public.vendor_selected_fields;

CREATE POLICY "Anon can insert selected fields during registration"
  ON public.vendor_selected_fields FOR INSERT TO anon
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE status IN ('draft', 'pending_approval', 'active')
    )
  );
