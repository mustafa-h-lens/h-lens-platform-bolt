/*
  # Convert Functions from SECURITY DEFINER to SECURITY INVOKER

  ## Problem
  Five functions were exposed as SECURITY DEFINER to authenticated users via
  PostgREST RPC. SECURITY DEFINER functions run with the owner's privileges,
  bypassing RLS. This is dangerous if the caller shouldn't have owner-level
  access to the underlying tables.

  ## Fix
  Switch these functions to SECURITY INVOKER so they run with the caller's
  privileges and respect RLS policies on the underlying tables.

  ## Functions Changed
  1. `generate_invoice_number()` - reads invoices. authenticated users already
     have SELECT on invoices via RLS.
  2. `generate_po_number()` - reads purchase_orders. Same as above.
  3. `has_module_access(text)` - reads users/roles/role_permissions for auth.uid().
     Users can read their own row via RLS.
  4. `is_admin()` - reads users/roles for auth.uid(). Same as above.
  5. `log_activity(...)` - inserts activity_logs with user_id = auth.uid().
     authenticated INSERT is already permitted by RLS.
*/

ALTER FUNCTION public.generate_invoice_number() SECURITY INVOKER;
ALTER FUNCTION public.generate_po_number() SECURITY INVOKER;
ALTER FUNCTION public.has_module_access(text) SECURITY INVOKER;
ALTER FUNCTION public.is_admin() SECURITY INVOKER;
ALTER FUNCTION public.log_activity(uuid, text, jsonb, text, text) SECURITY INVOKER;
