/*
  # Lock Down SECURITY DEFINER Functions and Fix Search Path

  ## Problem
  1. `public.delete_expired_vendor_drafts` has a mutable search_path (search_path hijacking risk).
  2. Many SECURITY DEFINER functions grant EXECUTE to `anon`, `authenticated`, and `PUBLIC` by default.
     This allows any user to run them via PostgREST `/rest/v1/rpc/<name>` even when they shouldn't.
     Most of these are trigger functions that must never be called directly by clients.
  3. `public.exec_sql(sql_text text)` is a dangerous arbitrary-SQL runner exposed to public - must be removed.

  ## Fix
  1. Add `SET search_path = public` to `delete_expired_vendor_drafts`.
  2. Drop `exec_sql` entirely — no client should be able to execute arbitrary SQL.
  3. Revoke EXECUTE from PUBLIC, anon, and authenticated on ALL listed functions.
  4. Re-grant EXECUTE only to `authenticated` (and `anon` where necessary) for the small set of
     functions that are legitimately called from the client via `.rpc(...)`:
       - `auto_unblock_expired_vendors` (called from SupplierLogin anon + VendorsPage authenticated)
       - `generate_invoice_number` (authenticated only)
       - `generate_po_number` (authenticated only)
       - `delete_expired_vendor_drafts` (authenticated only, admin DataHealth screen)

  ## Why Trigger Functions Still Work After Revoke
  Trigger functions are invoked by the table owner (the database superuser) — not the caller.
  Revoking EXECUTE from anon/authenticated/PUBLIC does not affect trigger firing.

  ## Security Impact
  After this migration:
  - `exec_sql` is gone — arbitrary SQL execution is no longer exposed via RPC.
  - Only 4 functions are callable via `/rest/v1/rpc/...` by ordinary clients; everything else is
    blocked at the grant level, eliminating the "Public Can Execute SECURITY DEFINER" attack surface.
*/

-- ── 1) Fix search_path on delete_expired_vendor_drafts ──────────────────────
ALTER FUNCTION public.delete_expired_vendor_drafts() SET search_path = public;

-- ── 2) Drop the dangerous exec_sql function ─────────────────────────────────
DROP FUNCTION IF EXISTS public.exec_sql(sql_text text);

-- ── 3) Revoke EXECUTE on all exposed SECURITY DEFINER functions ─────────────
-- Trigger functions and internal helpers: no one should call these via RPC.
DO $$
DECLARE
  fn text;
  fn_list text[] := ARRAY[
    'public.auto_unblock_expired_vendors()',
    'public.cleanup_expired_otps()',
    'public.cleanup_expired_sessions()',
    'public.delete_expired_vendor_drafts()',
    'public.generate_invoice_number()',
    'public.generate_po_number()',
    'public.generate_project_code()',
    'public.get_next_legal_page_version(page_type text)',
    'public.get_next_legal_page_version(page_id_param uuid)',
    'public.has_module_access(p_module_key text)',
    'public.is_admin()',
    'public.log_activity(p_project_id uuid, p_action_type text, p_action_details jsonb, p_old_value text, p_new_value text)',
    'public.log_equipment_brand_changes()',
    'public.log_equipment_category_changes()',
    'public.log_expense_payment_changes()',
    'public.log_invoice_changes()',
    'public.log_invoice_creation()',
    'public.log_po_settings_changes()',
    'public.log_production_task_changes()',
    'public.log_project_changes()',
    'public.log_project_file_changes()',
    'public.log_project_file_upload()',
    'public.log_project_item_changes()',
    'public.log_project_status_change()',
    'public.log_purchase_order_changes()',
    'public.log_service_item_changes()',
    'public.log_settings_changes()',
    'public.log_task_po_allocation_changes()',
    'public.log_terms_privacy_changes()',
    'public.log_vendor_invoice_changes()',
    'public.log_vendor_suggestion_changes()',
    'public.log_vendor_travel_doc_changes()',
    'public.publish_legal_page(page_id uuid)',
    'public.publish_legal_page(page_id_param uuid, user_id_param uuid)',
    'public.sync_po_used_amount()',
    'public.sync_project_total_cost()',
    'public.sync_task_allocated_amount()',
    'public.update_expense_from_payments()',
    'public.update_po_status()',
    'public.update_project_total_from_items()',
    'public.update_roles_updated_at()',
    'public.update_updated_at_column()'
  ];
BEGIN
  FOREACH fn IN ARRAY fn_list LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'function % does not exist, skipping revoke', fn;
    END;
  END LOOP;
END $$;

-- ── 4) Re-grant EXECUTE only for functions legitimately called from the client ──
-- Called from anon SupplierLogin and authenticated VendorsPage admin flow
GRANT EXECUTE ON FUNCTION public.auto_unblock_expired_vendors() TO anon, authenticated;

-- Called only from authenticated admin screens
GRANT EXECUTE ON FUNCTION public.generate_invoice_number()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_po_number()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_expired_vendor_drafts()   TO authenticated;
