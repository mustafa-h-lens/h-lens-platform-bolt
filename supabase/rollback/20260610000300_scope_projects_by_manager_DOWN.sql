-- ============================================================================
-- ROLLBACK for 20260610000300_scope_projects_by_manager
-- Restores the original is_admin()-based projects policies, drops helpers + column.
-- ============================================================================

-- Restore original projects policies
DROP POLICY IF EXISTS "View projects" ON public.projects;
CREATE POLICY "View projects" ON public.projects FOR SELECT TO authenticated USING (
  is_admin() OR (EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = projects.client_id
      AND (clients.user_id = (SELECT auth.uid())
           OR EXISTS (SELECT 1 FROM user_client_access
                      WHERE user_client_access.client_id = clients.id
                        AND user_client_access.user_id = (SELECT auth.uid())))))
);

DROP POLICY IF EXISTS "portal_client_read_own_projects" ON public.projects;
CREATE POLICY "portal_client_read_own_projects" ON public.projects FOR SELECT TO authenticated
  USING ((client_id = ((auth.jwt() -> 'app_metadata' ->> 'client_id'))::uuid) OR is_admin());

DROP POLICY IF EXISTS "Admins insert projects" ON public.projects;
CREATE POLICY "Admins insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins update projects" ON public.projects;
CREATE POLICY "Admins update projects" ON public.projects FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins delete projects" ON public.projects;
CREATE POLICY "Admins delete projects" ON public.projects FOR DELETE TO authenticated USING (is_admin());

-- Drop helpers + column
DROP FUNCTION IF EXISTS public.projects_unrestricted();
DROP FUNCTION IF EXISTS public.project_scope_owner();
DROP FUNCTION IF EXISTS public.team_owner_of(uuid);
DROP INDEX IF EXISTS public.idx_users_manager_id;
ALTER TABLE public.users DROP COLUMN IF EXISTS manager_id;
