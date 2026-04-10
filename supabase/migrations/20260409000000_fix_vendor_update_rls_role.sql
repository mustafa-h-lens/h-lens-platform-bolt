-- Fix: RLS policy for vendors UPDATE was checking role = 'admin'
-- but actual admin users have role = 'super_admin'
-- Restore the correct check: role IN ('admin', 'super_admin')

DROP POLICY IF EXISTS "Users can update vendors" ON public.vendors;
CREATE POLICY "Users can update vendors"
  ON public.vendors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Also fix vendor_approval_log INSERT so the log action works
DROP POLICY IF EXISTS "Admins can insert approval logs" ON public.vendor_approval_log;
CREATE POLICY "Admins can insert approval logs"
  ON public.vendor_approval_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );
