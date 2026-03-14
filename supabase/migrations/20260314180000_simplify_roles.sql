-- ================================================================
-- Simplify Roles: admin → project_manager, remove client/client_user
-- ================================================================

-- 1. Update existing admin users → project_manager
UPDATE users SET role = 'project_manager' WHERE role = 'admin';

-- 2. Convert client_user to client (keep client role for the client interface)
UPDATE users SET role = 'client' WHERE role = 'client_user';

-- 3. Drop old CHECK constraint and create new one
DO $$
BEGIN
  -- Try to drop existing constraint (name may vary)
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users DROP CONSTRAINT IF EXISTS check_role;

  -- Add new constraint (3 roles: super_admin, project_manager, client)
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin', 'project_manager', 'client'));
EXCEPTION
  WHEN others THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('super_admin', 'project_manager', 'client'));
END $$;

-- 4. Update is_admin() function if it exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('project_manager', 'super_admin')
    AND is_active = true
  );
END;
$$;

-- 5. Update RLS policies that hardcode 'admin' role
-- vendor_approval_log policies
DROP POLICY IF EXISTS "Admins can read all approval logs" ON vendor_approval_log;
CREATE POLICY "Admins can read all approval logs"
  ON vendor_approval_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

DROP POLICY IF EXISTS "Admins can insert approval logs" ON vendor_approval_log;
CREATE POLICY "Admins can insert approval logs"
  ON vendor_approval_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

-- system_activity_log policies
DROP POLICY IF EXISTS "Admins can view system activity logs" ON system_activity_log;
CREATE POLICY "Admins can view system activity logs"
  ON system_activity_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

DROP POLICY IF EXISTS "System can insert activity logs" ON system_activity_log;
CREATE POLICY "System can insert activity logs"
  ON system_activity_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

-- vendor_activity_log policies (if exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view vendor activity logs" ON vendor_activity_log;
  CREATE POLICY "Admins can view vendor activity logs"
    ON vendor_activity_log FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

  DROP POLICY IF EXISTS "Admins can insert vendor activity logs" ON vendor_activity_log;
  CREATE POLICY "Admins can insert vendor activity logs"
    ON vendor_activity_log FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
