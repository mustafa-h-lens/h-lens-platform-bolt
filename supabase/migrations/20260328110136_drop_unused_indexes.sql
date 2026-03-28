
/*
  # Drop Unused Indexes

  ## Summary
  Removes indexes that have never been used, freeing up storage and reducing
  write overhead on those tables.

  ## Dropped Indexes
  - idx_vendor_sessions_token (vendor_sessions)
  - idx_vendor_approval_log_performed_by (vendor_approval_log)
  - idx_expense_payments_created_by (expense_payments)
  - idx_legal_pages_created_by (legal_pages)
  - idx_legal_pages_history_created_by (legal_pages_history)
  - idx_terms_and_privacy_settings_updated_by (terms_and_privacy_settings)
  - idx_equipment_suggestions_vendor_id (equipment_suggestions)
  - idx_equipment_suggestions_status (equipment_suggestions)
  - idx_vendor_sessions_vendor_id (vendor_sessions)
  - idx_vendor_sessions_expires_at (vendor_sessions)
  - idx_vendor_suggestions_vendor_id (vendor_suggestions)
  - idx_vendor_suggestions_status (vendor_suggestions)
  - idx_vendor_suggestions_created_at (vendor_suggestions)
  - idx_vendor_invoices_project_item_id (vendor_invoices)
  - idx_client_sessions_token (client_sessions)

  Note: idx_vendor_approval_log_performed_by is dropped here; a new one covering
  the foreign key was added in the foreign key indexes migration.
*/

DROP INDEX IF EXISTS public.idx_vendor_sessions_token;
DROP INDEX IF EXISTS public.idx_vendor_approval_log_performed_by;
DROP INDEX IF EXISTS public.idx_expense_payments_created_by;
DROP INDEX IF EXISTS public.idx_legal_pages_created_by;
DROP INDEX IF EXISTS public.idx_legal_pages_history_created_by;
DROP INDEX IF EXISTS public.idx_terms_and_privacy_settings_updated_by;
DROP INDEX IF EXISTS public.idx_equipment_suggestions_vendor_id;
DROP INDEX IF EXISTS public.idx_equipment_suggestions_status;
DROP INDEX IF EXISTS public.idx_vendor_sessions_vendor_id;
DROP INDEX IF EXISTS public.idx_vendor_sessions_expires_at;
DROP INDEX IF EXISTS public.idx_vendor_suggestions_vendor_id;
DROP INDEX IF EXISTS public.idx_vendor_suggestions_status;
DROP INDEX IF EXISTS public.idx_vendor_suggestions_created_at;
DROP INDEX IF EXISTS public.idx_vendor_invoices_project_item_id;
DROP INDEX IF EXISTS public.idx_client_sessions_token;
