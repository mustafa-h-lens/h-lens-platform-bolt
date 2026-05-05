-- Fix Security Audit: Revoke anon execute on SECURITY DEFINER functions
-- These permission-check functions should only be callable by authenticated users

REVOKE EXECUTE ON FUNCTION public.has_module_access(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- Ensure authenticated users can still call them
GRANT EXECUTE ON FUNCTION public.has_module_access(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
