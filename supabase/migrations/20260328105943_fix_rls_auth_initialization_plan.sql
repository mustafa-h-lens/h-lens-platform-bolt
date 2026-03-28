
/*
  # Fix Auth RLS Initialization Plan Issues

  ## Summary
  Replaces direct auth.uid() calls with (select auth.uid()) in RLS policies to prevent
  re-evaluation for each row, improving query performance at scale.

  ## Affected Tables
  - vendor_registration_drafts: 3 policies updated
  - roles: 1 policy updated
  - role_permissions: 1 policy updated
*/

-- Fix vendor_registration_drafts policies
DROP POLICY IF EXISTS "Users can delete own drafts" ON public.vendor_registration_drafts;
CREATE POLICY "Users can delete own drafts"
  ON public.vendor_registration_drafts
  FOR DELETE
  TO authenticated
  USING (session_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can read own drafts by session" ON public.vendor_registration_drafts;
CREATE POLICY "Users can read own drafts by session"
  ON public.vendor_registration_drafts
  FOR SELECT
  TO authenticated
  USING (session_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can update own drafts by session" ON public.vendor_registration_drafts;
CREATE POLICY "Users can update own drafts by session"
  ON public.vendor_registration_drafts
  FOR UPDATE
  TO authenticated
  USING (session_id = (SELECT auth.uid()::text))
  WITH CHECK (session_id = (SELECT auth.uid()::text));

-- Fix roles policy
DROP POLICY IF EXISTS "Only super_admin can manage roles" ON public.roles;
CREATE POLICY "Only super_admin can manage roles"
  ON public.roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND users.is_active = true
    )
  );

-- Fix role_permissions policy
DROP POLICY IF EXISTS "Only super_admin can manage role_permissions" ON public.role_permissions;
CREATE POLICY "Only super_admin can manage role_permissions"
  ON public.role_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND users.is_active = true
    )
  );
