/*
  # Simplify Roles Migration (Fixed)

  1. Role Changes
    - Convert 'admin' role to 'project_manager'
    - Merge 'client_user' into 'client'
    - Keep 'super_admin' and 'client' unchanged

  2. Schema Updates
    - Update CHECK constraint on users.role
    - Update is_admin() function to include project_manager

  3. Security Updates
    - Update all RLS policies that reference 'admin' role

  4. Important Notes
    - After migration: super_admin, project_manager, client
    - project_manager replaces admin with same permissions
*/

-- 1. Drop existing CHECK constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_role;

-- 2. Update existing admin users → project_manager
UPDATE users SET role = 'project_manager' WHERE role = 'admin';

-- 3. Convert client_user to client
UPDATE users SET role = 'client' WHERE role = 'client_user';

-- 4. Add new CHECK constraint
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'project_manager', 'client'));

-- 5. Update is_admin() function
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

-- 6. Update RLS policies that hardcode 'admin' role
DROP POLICY IF EXISTS "Admins can read all approval logs" ON vendor_approval_log;
CREATE POLICY "Admins can read all approval logs"
  ON vendor_approval_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

DROP POLICY IF EXISTS "Admins can insert approval logs" ON vendor_approval_log;
CREATE POLICY "Admins can insert approval logs"
  ON vendor_approval_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

DROP POLICY IF EXISTS "Admins can view system activity logs" ON system_activity_log;
CREATE POLICY "Admins can view system activity logs"
  ON system_activity_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

DROP POLICY IF EXISTS "System can insert activity logs" ON system_activity_log;
CREATE POLICY "System can insert activity logs"
  ON system_activity_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

DROP POLICY IF EXISTS "Admins can view vendor activity logs" ON vendor_activity_log;
CREATE POLICY "Admins can view vendor activity logs"
  ON vendor_activity_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

DROP POLICY IF EXISTS "Admins can insert vendor activity logs" ON vendor_activity_log;
CREATE POLICY "Admins can insert vendor activity logs"
  ON vendor_activity_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));