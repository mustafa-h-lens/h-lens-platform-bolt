-- Restore SECURITY DEFINER on is_admin() and has_module_access() to break the
-- infinite recursion that surfaces as "stack depth limit exceeded" on every
-- authenticated query.
--
-- Why this migration must NOT be reverted to SECURITY INVOKER:
--   The public.users SELECT policy is `auth.uid() = id OR is_admin()`.
--   With SECURITY INVOKER, is_admin() runs as the caller and its query against
--   public.users re-triggers that very policy, which calls is_admin() again —
--   a 2 MB stack-overflow grenade. SECURITY DEFINER lets the helper bypass RLS
--   when it reads its own dependency tables, breaking the cycle.
--
-- The earlier migration 20260430142437_convert_functions_to_security_invoker
-- mistakenly tried to "harden" these helpers by switching them to INVOKER and
-- removed EXECUTE grants in 20260430141900_lock_down_security_definer_functions.
-- That combination broke every authenticated page that joins user-scoped data.
-- This migration re-applies the canonical definitions from
-- 20260326100000_dynamic_roles_permissions.sql and re-grants the EXECUTE
-- privileges those policies need.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $func$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u
    LEFT JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
    AND u.is_active = true
    AND (
      u.role IN ('project_manager', 'super_admin')
      OR r.is_system = true
      OR u.role_id IS NOT NULL
    )
  );
END;
$func$;

CREATE OR REPLACE FUNCTION public.has_module_access(p_module_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $func$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    LEFT JOIN public.role_permissions rp ON rp.role_id = r.id AND rp.module_key = p_module_key
    WHERE u.id = auth.uid()
    AND u.is_active = true
    AND (r.is_system = true OR rp.has_access = true)
  );
END;
$func$;

-- These helpers are referenced from RLS policy expressions, which evaluate
-- function permission checks against the calling role. The lock-down migration
-- revoked EXECUTE; restore it for authenticated and anon so policy evaluation
-- doesn't fall over with "permission denied for function".
GRANT EXECUTE ON FUNCTION public.is_admin()                          TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_module_access(text)             TO authenticated, anon;
