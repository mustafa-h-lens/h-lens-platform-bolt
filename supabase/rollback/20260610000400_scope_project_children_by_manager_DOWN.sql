-- ============================================================================
-- ROLLBACK for 20260610000400_scope_project_children_by_manager
-- Restores the original is_admin()/USING(true) child-table policies.
-- ============================================================================
-- Helper for the original client clause is inlined per table below.

-- project_items
DROP POLICY IF EXISTS "View project items" ON public.project_items;
CREATE POLICY "View project items" ON public.project_items FOR SELECT TO authenticated USING (is_admin() OR EXISTS (SELECT 1 FROM projects JOIN clients ON clients.id=projects.client_id WHERE projects.id=project_items.project_id AND (clients.user_id=(SELECT auth.uid()) OR EXISTS (SELECT 1 FROM user_client_access WHERE user_client_access.client_id=clients.id AND user_client_access.user_id=(SELECT auth.uid())))));
DROP POLICY IF EXISTS "Admins can insert project items" ON public.project_items;
CREATE POLICY "Admins can insert project items" ON public.project_items FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update project items" ON public.project_items;
CREATE POLICY "Admins can update project items" ON public.project_items FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can delete project items" ON public.project_items;
CREATE POLICY "Admins can delete project items" ON public.project_items FOR DELETE TO authenticated USING (is_admin());

-- project_files
DROP POLICY IF EXISTS "View project files" ON public.project_files;
CREATE POLICY "View project files" ON public.project_files FOR SELECT TO authenticated USING (is_admin() OR EXISTS (SELECT 1 FROM projects JOIN clients ON clients.id=projects.client_id WHERE projects.id=project_files.project_id AND (clients.user_id=(SELECT auth.uid()) OR EXISTS (SELECT 1 FROM user_client_access WHERE user_client_access.client_id=clients.id AND user_client_access.user_id=(SELECT auth.uid())))));
DROP POLICY IF EXISTS "Admins can insert project files" ON public.project_files;
CREATE POLICY "Admins can insert project files" ON public.project_files FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update project files" ON public.project_files;
CREATE POLICY "Admins can update project files" ON public.project_files FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can delete project files" ON public.project_files;
CREATE POLICY "Admins can delete project files" ON public.project_files FOR DELETE TO authenticated USING (is_admin());

-- project_tasks
DROP POLICY IF EXISTS "View project tasks" ON public.project_tasks;
CREATE POLICY "View project tasks" ON public.project_tasks FOR SELECT TO authenticated USING (is_admin() OR EXISTS (SELECT 1 FROM projects JOIN clients ON clients.id=projects.client_id WHERE projects.id=project_tasks.project_id AND (clients.user_id=(SELECT auth.uid()) OR EXISTS (SELECT 1 FROM user_client_access WHERE user_client_access.client_id=clients.id AND user_client_access.user_id=(SELECT auth.uid())))));
DROP POLICY IF EXISTS "Admins can insert project tasks" ON public.project_tasks;
CREATE POLICY "Admins can insert project tasks" ON public.project_tasks FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update project tasks" ON public.project_tasks;
CREATE POLICY "Admins can update project tasks" ON public.project_tasks FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can delete project tasks" ON public.project_tasks;
CREATE POLICY "Admins can delete project tasks" ON public.project_tasks FOR DELETE TO authenticated USING (is_admin());

-- project_milestones
DROP POLICY IF EXISTS "View project milestones" ON public.project_milestones;
CREATE POLICY "View project milestones" ON public.project_milestones FOR SELECT TO authenticated USING (is_admin() OR EXISTS (SELECT 1 FROM projects JOIN clients ON clients.id=projects.client_id WHERE projects.id=project_milestones.project_id AND (clients.user_id=(SELECT auth.uid()) OR EXISTS (SELECT 1 FROM user_client_access WHERE user_client_access.client_id=clients.id AND user_client_access.user_id=(SELECT auth.uid())))));
DROP POLICY IF EXISTS "portal_client_read_own_milestones" ON public.project_milestones;
CREATE POLICY "portal_client_read_own_milestones" ON public.project_milestones FOR SELECT TO authenticated USING ((project_id IN (SELECT id FROM projects WHERE client_id = ((auth.jwt() -> 'app_metadata' ->> 'client_id'))::uuid)) OR is_admin());
DROP POLICY IF EXISTS "Admins can insert project milestones" ON public.project_milestones;
CREATE POLICY "Admins can insert project milestones" ON public.project_milestones FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update project milestones" ON public.project_milestones;
CREATE POLICY "Admins can update project milestones" ON public.project_milestones FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can delete project milestones" ON public.project_milestones;
CREATE POLICY "Admins can delete project milestones" ON public.project_milestones FOR DELETE TO authenticated USING (is_admin());

-- invoices
DROP POLICY IF EXISTS "View invoices" ON public.invoices;
CREATE POLICY "View invoices" ON public.invoices FOR SELECT TO authenticated USING (is_admin() OR EXISTS (SELECT 1 FROM clients WHERE clients.id=invoices.client_id AND (clients.user_id=(SELECT auth.uid()) OR EXISTS (SELECT 1 FROM user_client_access WHERE user_client_access.client_id=clients.id AND user_client_access.user_id=(SELECT auth.uid())))));
DROP POLICY IF EXISTS "portal_client_read_own_invoices" ON public.invoices;
CREATE POLICY "portal_client_read_own_invoices" ON public.invoices FOR SELECT TO authenticated USING ((client_id = ((auth.jwt() -> 'app_metadata' ->> 'client_id'))::uuid) OR is_admin());
DROP POLICY IF EXISTS "Admins insert invoices" ON public.invoices;
CREATE POLICY "Admins insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins update invoices" ON public.invoices;
CREATE POLICY "Admins update invoices" ON public.invoices FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins delete invoices" ON public.invoices;
CREATE POLICY "Admins delete invoices" ON public.invoices FOR DELETE TO authenticated USING (is_admin());

-- vendor_invoices SELECT
DROP POLICY IF EXISTS "portal_vendor_read_own_vendor_invoices" ON public.vendor_invoices;
CREATE POLICY "portal_vendor_read_own_vendor_invoices" ON public.vendor_invoices FOR SELECT TO authenticated USING ((vendor_id = ((auth.jwt() -> 'app_metadata' ->> 'vendor_id'))::uuid) OR is_admin());

-- production_tasks SELECT
DROP POLICY IF EXISTS "Users can view production tasks" ON public.production_tasks;
CREATE POLICY "Users can view production tasks" ON public.production_tasks FOR SELECT TO authenticated USING (true);

-- activity_logs SELECT
DROP POLICY IF EXISTS "View activity logs" ON public.activity_logs;
CREATE POLICY "View activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (is_admin() OR EXISTS (SELECT 1 FROM projects JOIN clients ON clients.id=projects.client_id WHERE projects.id=activity_logs.project_id AND (clients.user_id=(SELECT auth.uid()) OR EXISTS (SELECT 1 FROM user_client_access WHERE user_client_access.client_id=clients.id AND user_client_access.user_id=(SELECT auth.uid())))));

DROP FUNCTION IF EXISTS public.can_access_project(uuid);
