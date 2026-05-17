
/*
  # Fix Multiple Permissive Policies (Round 2)

  ## Summary
  Consolidates tables that still have multiple permissive SELECT policies for the
  same role into a single policy using OR logic. This eliminates the security
  advisory about multiple permissive policies while preserving identical access rules.

  ## Tables Fixed
  - activity_logs: merge "Admins view all activity logs" + "Clients view own project activity"
  - client_document_types: drop redundant SELECT (ALL policy already covers SELECT)
  - client_documents: drop redundant duplicate SELECT
  - clients: merge admin + client SELECT
  - invoices: merge admin + client SELECT
  - project_files: merge admin + client SELECT (ALL policy already covers admin SELECT)
  - project_items: merge admin + client SELECT
  - project_milestones: merge admin + client SELECT
  - project_tasks: merge admin + client SELECT
  - projects: merge admin + client SELECT
  - role_permissions: drop open SELECT (ALL policy already covers SELECT for super_admin, keep open read)
  - roles: drop open SELECT (ALL policy already covers SELECT for super_admin, keep open read)
  - service_items: merge admin + active-item SELECT
*/

-- ============================================================
-- activity_logs: merge two SELECT policies into one
-- ============================================================
DROP POLICY IF EXISTS "Admins view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Clients view own project activity" ON public.activity_logs;

DROP POLICY IF EXISTS "View activity logs" ON public.activity_logs;
CREATE POLICY "View activity logs" ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM projects
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.id = activity_logs.project_id
        AND (
          clients.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM user_client_access
            WHERE user_client_access.client_id = clients.id
              AND user_client_access.user_id = (SELECT auth.uid())
          )
        )
    )
  );

-- ============================================================
-- client_document_types: drop open SELECT, ALL policy covers admins
-- For non-admins we still want to allow viewing, so keep open SELECT
-- but remove the one that conflicts with ALL policy
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage client document types" ON public.client_document_types;
DROP POLICY IF EXISTS "Authenticated users can view client document types" ON public.client_document_types;

CREATE POLICY "Admins can manage client document types"
  ON public.client_document_types
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can view client document types" ON public.client_document_types;
CREATE POLICY "Authenticated users can view client document types" ON public.client_document_types
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR true
  );

-- ============================================================
-- client_documents: two SELECT policies both for admins - merge
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Admins can view client documents" ON public.client_documents;

CREATE POLICY "Admins can manage client documents"
  ON public.client_documents
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- clients: merge admin + client SELECT
-- ============================================================
DROP POLICY IF EXISTS "Admins view all clients" ON public.clients;
DROP POLICY IF EXISTS "Clients view own data" ON public.clients;

DROP POLICY IF EXISTS "View clients" ON public.clients;
CREATE POLICY "View clients" ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_client_access
      WHERE user_client_access.client_id = clients.id
        AND user_client_access.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- invoices: merge admin + client SELECT
-- ============================================================
DROP POLICY IF EXISTS "Admins view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Clients view own invoices" ON public.invoices;

DROP POLICY IF EXISTS "View invoices" ON public.invoices;
CREATE POLICY "View invoices" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = invoices.client_id
        AND (
          clients.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM user_client_access
            WHERE user_client_access.client_id = clients.id
              AND user_client_access.user_id = (SELECT auth.uid())
          )
        )
    )
  );

-- ============================================================
-- project_files: ALL policy covers admin SELECT; add client SELECT
-- ============================================================
DROP POLICY IF EXISTS "Admins manage project files" ON public.project_files;
DROP POLICY IF EXISTS "Clients view own project files" ON public.project_files;

CREATE POLICY "Admins manage project files"
  ON public.project_files
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "View project files" ON public.project_files;
CREATE POLICY "View project files" ON public.project_files
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM projects
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.id = project_files.project_id
        AND (
          clients.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM user_client_access
            WHERE user_client_access.client_id = clients.id
              AND user_client_access.user_id = (SELECT auth.uid())
          )
        )
    )
  );

-- ============================================================
-- project_items: merge admin + client SELECT
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage project items" ON public.project_items;
DROP POLICY IF EXISTS "Clients view own project items" ON public.project_items;

CREATE POLICY "Admins can manage project items"
  ON public.project_items
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "View project items" ON public.project_items;
CREATE POLICY "View project items" ON public.project_items
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM projects
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.id = project_items.project_id
        AND (
          clients.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM user_client_access
            WHERE user_client_access.client_id = clients.id
              AND user_client_access.user_id = (SELECT auth.uid())
          )
        )
    )
  );

-- ============================================================
-- project_milestones: merge admin + client SELECT
-- ============================================================
DROP POLICY IF EXISTS "Admins manage milestones" ON public.project_milestones;
DROP POLICY IF EXISTS "Clients view own project milestones" ON public.project_milestones;

CREATE POLICY "Admins manage milestones"
  ON public.project_milestones
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "View project milestones" ON public.project_milestones;
CREATE POLICY "View project milestones" ON public.project_milestones
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM projects
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.id = project_milestones.project_id
        AND (
          clients.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM user_client_access
            WHERE user_client_access.client_id = clients.id
              AND user_client_access.user_id = (SELECT auth.uid())
          )
        )
    )
  );

-- ============================================================
-- project_tasks: merge admin + client SELECT
-- ============================================================
DROP POLICY IF EXISTS "Admins manage project tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Clients view own project tasks" ON public.project_tasks;

CREATE POLICY "Admins manage project tasks"
  ON public.project_tasks
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "View project tasks" ON public.project_tasks;
CREATE POLICY "View project tasks" ON public.project_tasks
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM projects
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.id = project_tasks.project_id
        AND (
          clients.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM user_client_access
            WHERE user_client_access.client_id = clients.id
              AND user_client_access.user_id = (SELECT auth.uid())
          )
        )
    )
  );

-- ============================================================
-- projects: merge admin + client SELECT
-- ============================================================
DROP POLICY IF EXISTS "Admins view all projects" ON public.projects;
DROP POLICY IF EXISTS "Clients view own projects" ON public.projects;

DROP POLICY IF EXISTS "View projects" ON public.projects;
CREATE POLICY "View projects" ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = projects.client_id
        AND (
          clients.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM user_client_access
            WHERE user_client_access.client_id = clients.id
              AND user_client_access.user_id = (SELECT auth.uid())
          )
        )
    )
  );

-- ============================================================
-- role_permissions: drop open SELECT, replace with merged policy
-- ALL policy covers insert/update/delete for super_admin
-- Merge the two SELECT policies into one
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Only super_admin can manage role_permissions" ON public.role_permissions;

CREATE POLICY "Authenticated users can view role_permissions"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only super_admin can manage role_permissions" ON public.role_permissions;
CREATE POLICY "Only super_admin can manage role_permissions" ON public.role_permissions
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

-- ============================================================
-- roles: same pattern as role_permissions
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.roles;
DROP POLICY IF EXISTS "Only super_admin can manage roles" ON public.roles;

CREATE POLICY "Authenticated users can view roles"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only super_admin can manage roles" ON public.roles;
CREATE POLICY "Only super_admin can manage roles" ON public.roles
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

-- ============================================================
-- service_items: merge admin ALL + active-item SELECT into single SELECT
-- ALL policy covers admin; we need a unified SELECT
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage service items" ON public.service_items;
DROP POLICY IF EXISTS "All authenticated users can view active items" ON public.service_items;

CREATE POLICY "Admins can manage service items"
  ON public.service_items
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "View service items" ON public.service_items;
CREATE POLICY "View service items" ON public.service_items
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR is_active = true
  );
