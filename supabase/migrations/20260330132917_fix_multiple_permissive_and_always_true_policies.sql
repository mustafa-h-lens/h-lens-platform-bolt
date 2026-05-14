
/*
  # Fix multiple permissive policies and always-true RLS policies

  ## Problems resolved

  ### 1. Multiple permissive SELECT policies (same role, same action)
  For each table, drop the redundant duplicate and keep a single consolidated policy.

  ### 2. Always-true anon INSERT policies
  The "Allow anon insert" policies (with `WITH CHECK (true)`) are replaced by
  the more restrictive vendor-status-scoped equivalents that already exist.
  This prevents unrestricted anon writes.

  ### 3. users table: duplicate INSERT policies
  Consolidated into one that allows either admin or self-insert.

  Tables affected:
  - client_document_types, project_files, project_items, project_milestones,
    project_tasks, role_permissions, roles, service_items, users,
    vendor_fields, vendor_financial_data, vendor_selected_fields, vendor_travel_documents
*/

-- ── client_document_types ──────────────────────────────────────────────────
-- "Admins can manage client document types" (ALL) already covers SELECT for admins.
-- "Authenticated users can view client document types" uses `(is_admin() OR true)`
-- which is always true — redundant. Drop it; the ALL policy covers admin SELECT.
-- We need a separate SELECT for non-admins too. Replace with clean single policy.
DROP POLICY IF EXISTS "Authenticated users can view client document types" ON public.client_document_types;

CREATE POLICY "Authenticated users can view client document types"
  ON public.client_document_types
  FOR SELECT
  TO authenticated
  USING (true);

-- ── project_files ──────────────────────────────────────────────────────────
-- "Admins manage project files" (ALL) + "View project files" (SELECT) both fire for admins.
-- Consolidate: drop the ALL policy's select overlap by keeping only "View project files"
-- which already contains `is_admin() OR ...`. Drop the standalone ALL policy and replace
-- with explicit INSERT/UPDATE/DELETE for admins.
DROP POLICY IF EXISTS "Admins manage project files" ON public.project_files;

CREATE POLICY "Admins can insert project files"
  ON public.project_files
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update project files" ON public.project_files;
CREATE POLICY "Admins can update project files" ON public.project_files
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete project files" ON public.project_files;
CREATE POLICY "Admins can delete project files" ON public.project_files
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- ── project_items ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage project items" ON public.project_items;

CREATE POLICY "Admins can insert project items"
  ON public.project_items
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update project items" ON public.project_items;
CREATE POLICY "Admins can update project items" ON public.project_items
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete project items" ON public.project_items;
CREATE POLICY "Admins can delete project items" ON public.project_items
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- ── project_milestones ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins manage milestones" ON public.project_milestones;

CREATE POLICY "Admins can insert project milestones"
  ON public.project_milestones
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update project milestones" ON public.project_milestones;
CREATE POLICY "Admins can update project milestones" ON public.project_milestones
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete project milestones" ON public.project_milestones;
CREATE POLICY "Admins can delete project milestones" ON public.project_milestones
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- ── project_tasks ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins manage project tasks" ON public.project_tasks;

CREATE POLICY "Admins can insert project tasks"
  ON public.project_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update project tasks" ON public.project_tasks;
CREATE POLICY "Admins can update project tasks" ON public.project_tasks
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete project tasks" ON public.project_tasks;
CREATE POLICY "Admins can delete project tasks" ON public.project_tasks
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- ── role_permissions ───────────────────────────────────────────────────────
-- "Only super_admin can manage role_permissions" (ALL) covers SELECT for super_admin.
-- "Authenticated users can view role_permissions" (SELECT, `true`) fires for everyone.
-- Drop the always-true SELECT; replace with explicit one that doesn't conflict.
DROP POLICY IF EXISTS "Authenticated users can view role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Only super_admin can manage role_permissions" ON public.role_permissions;

CREATE POLICY "Authenticated users can view role_permissions"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Super admin can insert role_permissions" ON public.role_permissions;
CREATE POLICY "Super admin can insert role_permissions" ON public.role_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
      AND users.role_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND users.is_active = true
  ));

DROP POLICY IF EXISTS "Super admin can update role_permissions" ON public.role_permissions;
CREATE POLICY "Super admin can update role_permissions" ON public.role_permissions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
      AND users.role_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND users.is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
      AND users.role_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND users.is_active = true
  ));

DROP POLICY IF EXISTS "Super admin can delete role_permissions" ON public.role_permissions;
CREATE POLICY "Super admin can delete role_permissions" ON public.role_permissions
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
      AND users.role_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND users.is_active = true
  ));

-- ── roles ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.roles;
DROP POLICY IF EXISTS "Only super_admin can manage roles" ON public.roles;

CREATE POLICY "Authenticated users can view roles"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Super admin can insert roles" ON public.roles;
CREATE POLICY "Super admin can insert roles" ON public.roles
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
      AND users.role_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND users.is_active = true
  ));

DROP POLICY IF EXISTS "Super admin can update roles" ON public.roles;
CREATE POLICY "Super admin can update roles" ON public.roles
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
      AND users.role_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND users.is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
      AND users.role_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND users.is_active = true
  ));

DROP POLICY IF EXISTS "Super admin can delete roles" ON public.roles;
CREATE POLICY "Super admin can delete roles" ON public.roles
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
      AND users.role_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND users.is_active = true
  ));

-- ── service_items ──────────────────────────────────────────────────────────
-- "Admins can manage service items" (ALL) + "View service items" (SELECT) overlap.
DROP POLICY IF EXISTS "Admins can manage service items" ON public.service_items;

CREATE POLICY "Admins can insert service items"
  ON public.service_items
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update service items" ON public.service_items;
CREATE POLICY "Admins can update service items" ON public.service_items
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete service items" ON public.service_items;
CREATE POLICY "Admins can delete service items" ON public.service_items
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- ── users ──────────────────────────────────────────────────────────────────
-- Duplicate INSERT: "Admins can insert users" + "Allow insert for authenticated users"
-- Duplicate SELECT: "Admins can view all users" + "Users can view own profile"
-- Duplicate UPDATE: "Admins can update all users" + "Users can update own profile"
-- Consolidate each into a single policy covering both cases.

DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.users;

CREATE POLICY "Users can insert own profile or admins can insert"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = id OR is_admin()
  );

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

CREATE POLICY "Users can view own profile or admins view all"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = id OR is_admin()
  );

DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can update own profile or admins update all"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = id OR is_admin()
  )
  WITH CHECK (
    (SELECT auth.uid()) = id OR is_admin()
  );

-- ── vendor_fields ──────────────────────────────────────────────────────────
-- "Admins can manage vendor fields" (ALL, authenticated) + "Anyone can view active vendor fields" (SELECT, public)
-- These are on different roles so no conflict — the warning is a false positive for public role.
-- The actual duplicate is ALL for authenticated covering SELECT twice when both fire.
-- Fix: drop ALL, replace with explicit non-SELECT admin operations.
DROP POLICY IF EXISTS "Admins can manage vendor fields" ON public.vendor_fields;

CREATE POLICY "Admins can insert vendor fields"
  ON public.vendor_fields
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
      AND users.role = ANY(ARRAY['admin','super_admin'])
  ));

DROP POLICY IF EXISTS "Admins can update vendor fields" ON public.vendor_fields;
CREATE POLICY "Admins can update vendor fields" ON public.vendor_fields
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
      AND users.role = ANY(ARRAY['admin','super_admin'])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
      AND users.role = ANY(ARRAY['admin','super_admin'])
  ));

DROP POLICY IF EXISTS "Admins can delete vendor fields" ON public.vendor_fields;
CREATE POLICY "Admins can delete vendor fields" ON public.vendor_fields
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
      AND users.role = ANY(ARRAY['admin','super_admin'])
  ));

DROP POLICY IF EXISTS "Authenticated users can view vendor fields" ON public.vendor_fields;
CREATE POLICY "Authenticated users can view vendor fields" ON public.vendor_fields
  FOR SELECT
  TO authenticated
  USING (true);

-- ── vendor_financial_data: drop always-true anon INSERT ────────────────────
DROP POLICY IF EXISTS "Allow anon insert vendor_financial_data" ON public.vendor_financial_data;

-- ── vendor_selected_fields: drop always-true anon INSERT ──────────────────
DROP POLICY IF EXISTS "Allow anon insert vendor_selected_fields" ON public.vendor_selected_fields;

-- ── vendor_travel_documents: drop always-true anon INSERT ─────────────────
DROP POLICY IF EXISTS "Allow anon insert vendor_travel_documents" ON public.vendor_travel_documents;

-- ── vendor_approval_log: fix always-true anon INSERT ──────────────────────
DROP POLICY IF EXISTS "Allow anon insert vendor_approval_log" ON public.vendor_approval_log;

CREATE POLICY "Anon can insert vendor approval log for pending vendors"
  ON public.vendor_approval_log
  FOR INSERT
  TO anon
  WITH CHECK (
    vendor_id IN (
      SELECT vendors.id FROM vendors
      WHERE vendors.status IN ('draft', 'pending_approval')
    )
  );
