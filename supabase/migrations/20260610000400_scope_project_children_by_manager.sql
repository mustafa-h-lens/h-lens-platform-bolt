-- ============================================================================
-- SCOPE PROJECT CHILD TABLES BY MANAGER  — Phase 2 (defense-in-depth)
-- ============================================================================
-- Phase 1 scoped the projects table. The child tables still granted via is_admin()
-- (true for every panel user) or USING(true), so a manager could read another
-- team's project DETAILS by direct API. This routes every such grant through
-- can_access_project(project_id), which reuses the Phase-1 team logic. Client and
-- vendor PORTAL policies are preserved (their is_admin() OR-branch is dropped).
-- Writes already limited to admin/super_admin (production_tasks, vendor_invoices)
-- are left unchanged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.projects_unrestricted()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = p_project_id
        AND public.project_scope_owner() IS NOT NULL
        AND (p.project_manager_id = public.project_scope_owner()
             OR public.team_owner_of(p.created_by) = public.project_scope_owner())
    );
$$;

-- ── project_items / project_files / project_tasks (same shape) ───────────────
DROP POLICY IF EXISTS "View project items" ON public.project_items;
CREATE POLICY "View project items" ON public.project_items FOR SELECT TO authenticated USING (
  public.can_access_project(project_id)
  OR EXISTS (SELECT 1 FROM projects JOIN clients ON clients.id=projects.client_id
       WHERE projects.id = project_items.project_id
         AND (clients.user_id=(SELECT auth.uid())
              OR EXISTS (SELECT 1 FROM user_client_access WHERE user_client_access.client_id=clients.id AND user_client_access.user_id=(SELECT auth.uid())))));
DROP POLICY IF EXISTS "Admins can insert project items" ON public.project_items;
CREATE POLICY "Admins can insert project items" ON public.project_items FOR INSERT TO authenticated WITH CHECK (public.can_access_project(project_id));
DROP POLICY IF EXISTS "Admins can update project items" ON public.project_items;
CREATE POLICY "Admins can update project items" ON public.project_items FOR UPDATE TO authenticated USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));
DROP POLICY IF EXISTS "Admins can delete project items" ON public.project_items;
CREATE POLICY "Admins can delete project items" ON public.project_items FOR DELETE TO authenticated USING (public.can_access_project(project_id));

DROP POLICY IF EXISTS "View project files" ON public.project_files;
CREATE POLICY "View project files" ON public.project_files FOR SELECT TO authenticated USING (
  public.can_access_project(project_id)
  OR EXISTS (SELECT 1 FROM projects JOIN clients ON clients.id=projects.client_id
       WHERE projects.id = project_files.project_id
         AND (clients.user_id=(SELECT auth.uid())
              OR EXISTS (SELECT 1 FROM user_client_access WHERE user_client_access.client_id=clients.id AND user_client_access.user_id=(SELECT auth.uid())))));
DROP POLICY IF EXISTS "Admins can insert project files" ON public.project_files;
CREATE POLICY "Admins can insert project files" ON public.project_files FOR INSERT TO authenticated WITH CHECK (public.can_access_project(project_id));
DROP POLICY IF EXISTS "Admins can update project files" ON public.project_files;
CREATE POLICY "Admins can update project files" ON public.project_files FOR UPDATE TO authenticated USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));
DROP POLICY IF EXISTS "Admins can delete project files" ON public.project_files;
CREATE POLICY "Admins can delete project files" ON public.project_files FOR DELETE TO authenticated USING (public.can_access_project(project_id));

DROP POLICY IF EXISTS "View project tasks" ON public.project_tasks;
CREATE POLICY "View project tasks" ON public.project_tasks FOR SELECT TO authenticated USING (
  public.can_access_project(project_id)
  OR EXISTS (SELECT 1 FROM projects JOIN clients ON clients.id=projects.client_id
       WHERE projects.id = project_tasks.project_id
         AND (clients.user_id=(SELECT auth.uid())
              OR EXISTS (SELECT 1 FROM user_client_access WHERE user_client_access.client_id=clients.id AND user_client_access.user_id=(SELECT auth.uid())))));
DROP POLICY IF EXISTS "Admins can insert project tasks" ON public.project_tasks;
CREATE POLICY "Admins can insert project tasks" ON public.project_tasks FOR INSERT TO authenticated WITH CHECK (public.can_access_project(project_id));
DROP POLICY IF EXISTS "Admins can update project tasks" ON public.project_tasks;
CREATE POLICY "Admins can update project tasks" ON public.project_tasks FOR UPDATE TO authenticated USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));
DROP POLICY IF EXISTS "Admins can delete project tasks" ON public.project_tasks;
CREATE POLICY "Admins can delete project tasks" ON public.project_tasks FOR DELETE TO authenticated USING (public.can_access_project(project_id));

-- ── project_milestones (has client portal policy) ────────────────────────────
DROP POLICY IF EXISTS "View project milestones" ON public.project_milestones;
CREATE POLICY "View project milestones" ON public.project_milestones FOR SELECT TO authenticated USING (
  public.can_access_project(project_id)
  OR EXISTS (SELECT 1 FROM projects JOIN clients ON clients.id=projects.client_id
       WHERE projects.id = project_milestones.project_id
         AND (clients.user_id=(SELECT auth.uid())
              OR EXISTS (SELECT 1 FROM user_client_access WHERE user_client_access.client_id=clients.id AND user_client_access.user_id=(SELECT auth.uid())))));
DROP POLICY IF EXISTS "portal_client_read_own_milestones" ON public.project_milestones;
CREATE POLICY "portal_client_read_own_milestones" ON public.project_milestones FOR SELECT TO authenticated USING (
  project_id IN (SELECT id FROM projects WHERE client_id = ((auth.jwt() -> 'app_metadata' ->> 'client_id'))::uuid));
DROP POLICY IF EXISTS "Admins can insert project milestones" ON public.project_milestones;
CREATE POLICY "Admins can insert project milestones" ON public.project_milestones FOR INSERT TO authenticated WITH CHECK (public.can_access_project(project_id));
DROP POLICY IF EXISTS "Admins can update project milestones" ON public.project_milestones;
CREATE POLICY "Admins can update project milestones" ON public.project_milestones FOR UPDATE TO authenticated USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));
DROP POLICY IF EXISTS "Admins can delete project milestones" ON public.project_milestones;
CREATE POLICY "Admins can delete project milestones" ON public.project_milestones FOR DELETE TO authenticated USING (public.can_access_project(project_id));

-- ── invoices (client clause keyed on client_id; has client portal policy) ────
DROP POLICY IF EXISTS "View invoices" ON public.invoices;
CREATE POLICY "View invoices" ON public.invoices FOR SELECT TO authenticated USING (
  public.can_access_project(project_id)
  OR EXISTS (SELECT 1 FROM clients
       WHERE clients.id = invoices.client_id
         AND (clients.user_id=(SELECT auth.uid())
              OR EXISTS (SELECT 1 FROM user_client_access WHERE user_client_access.client_id=clients.id AND user_client_access.user_id=(SELECT auth.uid())))));
DROP POLICY IF EXISTS "portal_client_read_own_invoices" ON public.invoices;
CREATE POLICY "portal_client_read_own_invoices" ON public.invoices FOR SELECT TO authenticated USING (
  client_id = ((auth.jwt() -> 'app_metadata' ->> 'client_id'))::uuid);
DROP POLICY IF EXISTS "Admins insert invoices" ON public.invoices;
CREATE POLICY "Admins insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.can_access_project(project_id));
DROP POLICY IF EXISTS "Admins update invoices" ON public.invoices;
CREATE POLICY "Admins update invoices" ON public.invoices FOR UPDATE TO authenticated USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));
DROP POLICY IF EXISTS "Admins delete invoices" ON public.invoices;
CREATE POLICY "Admins delete invoices" ON public.invoices FOR DELETE TO authenticated USING (public.can_access_project(project_id));

-- ── vendor_invoices: SELECT only (keep vendor portal; writes stay admin-only) ─
DROP POLICY IF EXISTS "portal_vendor_read_own_vendor_invoices" ON public.vendor_invoices;
CREATE POLICY "portal_vendor_read_own_vendor_invoices" ON public.vendor_invoices FOR SELECT TO authenticated USING (
  (vendor_id = ((auth.jwt() -> 'app_metadata' ->> 'vendor_id'))::uuid)
  OR public.can_access_project(project_id));

-- ── production_tasks: SELECT was USING(true) — scope it (writes stay admin-only)
DROP POLICY IF EXISTS "Users can view production tasks" ON public.production_tasks;
CREATE POLICY "Users can view production tasks" ON public.production_tasks FOR SELECT TO authenticated USING (
  public.can_access_project(project_id));

-- ── activity_logs: SELECT only ───────────────────────────────────────────────
DROP POLICY IF EXISTS "View activity logs" ON public.activity_logs;
CREATE POLICY "View activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (
  public.can_access_project(project_id)
  OR EXISTS (SELECT 1 FROM projects JOIN clients ON clients.id=projects.client_id
       WHERE projects.id = activity_logs.project_id
         AND (clients.user_id=(SELECT auth.uid())
              OR EXISTS (SELECT 1 FROM user_client_access WHERE user_client_access.client_id=clients.id AND user_client_access.user_id=(SELECT auth.uid())))));
