-- ============================================================================
-- SCOPE PROJECTS BY MANAGER (team-based visibility)  — Phase 1 (projects table)
-- ============================================================================
-- Goal:
--   • super-admin (نظامي) + محاسب (accountant)  -> ALL projects (view + write)
--   • مدير مشروع (project_manager)               -> only projects he created OR
--       is assigned to (project_manager_id), view + write
--   • مساعد مدير مشروع (assistant)               -> same as his assigned manager
--       (team), view + write. Linked via users.manager_id.
--   • client portal                              -> own client's projects (unchanged)
--
-- Because permissive RLS policies are OR-ed, EVERY is_admin() grant on projects
-- is replaced with role-aware logic (otherwise is_admin()=true for a manager would
-- leak all projects). Child-table isolation is handled in a follow-up migration.
-- ============================================================================

-- 1. Assistant -> manager link
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS manager_id uuid
  REFERENCES public.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON public.users(manager_id);

-- 2. Helper functions ---------------------------------------------------------
-- Full projects access: super-admin / system role / accountant.
CREATE OR REPLACE FUNCTION public.projects_unrestricted() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u LEFT JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND u.is_active
      AND (u.role IN ('super_admin','accountant') OR r.is_system)
  );
$$;

-- The team-owner id the current restricted user is scoped to:
-- assistant -> their manager_id ; manager -> own id ; everyone else -> NULL.
CREATE OR REPLACE FUNCTION public.project_scope_owner() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE(u.manager_id, u.id) FROM public.users u
   WHERE u.id = auth.uid() AND u.is_active AND u.role_id IS NOT NULL
     AND u.role NOT IN ('super_admin','accountant');
$$;

-- The team-owner of an arbitrary user (manager themselves, or an assistant's manager).
-- Lets a project created by EITHER the manager or one of their assistants resolve to
-- the same team owner, so the whole team sees it.
CREATE OR REPLACE FUNCTION public.team_owner_of(p_user uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE(manager_id, id) FROM public.users WHERE id = p_user;
$$;

-- 3. projects policies (replace every is_admin() grant) -----------------------
DROP POLICY IF EXISTS "View projects" ON public.projects;
CREATE POLICY "View projects" ON public.projects FOR SELECT TO authenticated USING (
  public.projects_unrestricted()
  OR (public.project_scope_owner() IS NOT NULL
      AND (project_manager_id = public.project_scope_owner()
           OR public.team_owner_of(created_by) = public.project_scope_owner()))
  OR EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = projects.client_id
      AND (clients.user_id = (SELECT auth.uid())
           OR EXISTS (SELECT 1 FROM public.user_client_access
                      WHERE user_client_access.client_id = clients.id
                        AND user_client_access.user_id = (SELECT auth.uid())))
  )
);

DROP POLICY IF EXISTS "portal_client_read_own_projects" ON public.projects;
CREATE POLICY "portal_client_read_own_projects" ON public.projects FOR SELECT TO authenticated
  USING (client_id = ((auth.jwt() -> 'app_metadata' ->> 'client_id'))::uuid);

DROP POLICY IF EXISTS "Admins insert projects" ON public.projects;
CREATE POLICY "Admins insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (
  public.projects_unrestricted()
  OR (public.project_scope_owner() IS NOT NULL AND created_by = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "Admins update projects" ON public.projects;
CREATE POLICY "Admins update projects" ON public.projects FOR UPDATE TO authenticated
  USING (
    public.projects_unrestricted()
    OR (public.project_scope_owner() IS NOT NULL
        AND (project_manager_id = public.project_scope_owner()
             OR public.team_owner_of(created_by) = public.project_scope_owner()))
  )
  WITH CHECK (
    public.projects_unrestricted()
    OR (public.project_scope_owner() IS NOT NULL
        AND (project_manager_id = public.project_scope_owner()
             OR public.team_owner_of(created_by) = public.project_scope_owner()))
  );

DROP POLICY IF EXISTS "Admins delete projects" ON public.projects;
CREATE POLICY "Admins delete projects" ON public.projects FOR DELETE TO authenticated
  USING (
    public.projects_unrestricted()
    OR (public.project_scope_owner() IS NOT NULL
        AND (project_manager_id = public.project_scope_owner()
             OR public.team_owner_of(created_by) = public.project_scope_owner()))
  );
