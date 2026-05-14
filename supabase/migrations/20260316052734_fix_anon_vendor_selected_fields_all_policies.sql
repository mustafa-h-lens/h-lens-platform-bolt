/*
  # Fix all anon RLS policies for vendor_selected_fields

  ## Problem
  The SELECT, UPDATE, and DELETE anon policies all restrict access to vendors
  with status = 'draft' only. Since vendors in the vendor portal have status
  'pending_approval', 'active', or 'revision_requested', these operations fail.

  ## Fix
  Drop and recreate all anon policies to allow access for any vendor status
  that appears in the vendor portal lifecycle.
*/

DROP POLICY IF EXISTS "Anon can view selected fields during registration" ON public.vendor_selected_fields;
DROP POLICY IF EXISTS "Anon can update selected fields during registration" ON public.vendor_selected_fields;
DROP POLICY IF EXISTS "Anon can delete selected fields during registration" ON public.vendor_selected_fields;

CREATE POLICY "Anon can view selected fields during registration"
  ON public.vendor_selected_fields FOR SELECT TO anon
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE status IN ('draft', 'pending_approval', 'active', 'revision_requested', 'rejected')
    )
  );

DROP POLICY IF EXISTS "Anon can update selected fields during registration" ON public.vendor_selected_fields;
CREATE POLICY "Anon can update selected fields during registration" ON public.vendor_selected_fields FOR UPDATE TO anon
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE status IN ('draft', 'pending_approval', 'active', 'revision_requested', 'rejected')
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE status IN ('draft', 'pending_approval', 'active', 'revision_requested', 'rejected')
    )
  );

DROP POLICY IF EXISTS "Anon can delete selected fields during registration" ON public.vendor_selected_fields;
CREATE POLICY "Anon can delete selected fields during registration" ON public.vendor_selected_fields FOR DELETE TO anon
  USING (
    vendor_id IN (
      SELECT id FROM vendors
      WHERE status IN ('draft', 'pending_approval', 'active', 'revision_requested', 'rejected')
    )
  );
