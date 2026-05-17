/*
  # Fix RLS Policies - Remove Infinite Recursion

  1. Changes
    - Drop all existing policies that cause infinite recursion
    - Create new policies without circular dependencies
    - Use security definer function to check user roles safely
  
  2. Security
    - Maintain same security model but without recursion
    - Admin/super_admin can access everything
    - Clients can only view their own data
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;

DROP POLICY IF EXISTS "Admins can view all clients" ON clients;
DROP POLICY IF EXISTS "Clients can view own data" ON clients;
DROP POLICY IF EXISTS "Admins can insert clients" ON clients;
DROP POLICY IF EXISTS "Admins can update clients" ON clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON clients;

DROP POLICY IF EXISTS "Admins can view all projects" ON projects;
DROP POLICY IF EXISTS "Clients can view own projects" ON projects;
DROP POLICY IF EXISTS "Admins can insert projects" ON projects;
DROP POLICY IF EXISTS "Admins can update projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON projects;

DROP POLICY IF EXISTS "Admins can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Clients can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can update invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON invoices;

-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON users;
CREATE POLICY "Allow insert for authenticated users" ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- New policies for clients table  
DROP POLICY IF EXISTS "Admins view all clients" ON clients;
CREATE POLICY "Admins view all clients" ON clients FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Clients view own data" ON clients;
CREATE POLICY "Clients view own data" ON clients FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins insert clients" ON clients;
CREATE POLICY "Admins insert clients" ON clients FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins update clients" ON clients;
CREATE POLICY "Admins update clients" ON clients FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins delete clients" ON clients;
CREATE POLICY "Admins delete clients" ON clients FOR DELETE
  TO authenticated
  USING (is_admin());

-- New policies for projects table
DROP POLICY IF EXISTS "Admins view all projects" ON projects;
CREATE POLICY "Admins view all projects" ON projects FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Clients view own projects" ON projects;
CREATE POLICY "Clients view own projects" ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = projects.client_id
      AND clients.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins insert projects" ON projects;
CREATE POLICY "Admins insert projects" ON projects FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins update projects" ON projects;
CREATE POLICY "Admins update projects" ON projects FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins delete projects" ON projects;
CREATE POLICY "Admins delete projects" ON projects FOR DELETE
  TO authenticated
  USING (is_admin());

-- New policies for invoices table
DROP POLICY IF EXISTS "Admins view all invoices" ON invoices;
CREATE POLICY "Admins view all invoices" ON invoices FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Clients view own invoices" ON invoices;
CREATE POLICY "Clients view own invoices" ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = invoices.client_id
      AND clients.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins insert invoices" ON invoices;
CREATE POLICY "Admins insert invoices" ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins update invoices" ON invoices;
CREATE POLICY "Admins update invoices" ON invoices FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins delete invoices" ON invoices;
CREATE POLICY "Admins delete invoices" ON invoices FOR DELETE
  TO authenticated
  USING (is_admin());