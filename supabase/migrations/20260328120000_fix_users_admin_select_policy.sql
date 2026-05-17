-- Fix: admins can only see their own user record.
-- Use is_admin() SECURITY DEFINER function to avoid infinite recursion.

DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert users" ON users;
CREATE POLICY "Admins can insert users" ON users FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update all users" ON users;
CREATE POLICY "Admins can update all users" ON users FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
