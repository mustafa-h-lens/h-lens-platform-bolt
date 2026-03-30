
/*
  # Drop unused indexes

  Removes indexes that have never been used and only add write overhead:
  - idx_equipment_suggestions_vendor_id
  - idx_expense_payments_created_by
  - idx_legal_pages_created_by
  - idx_legal_pages_history_created_by
  - idx_terms_and_privacy_settings_updated_by
  - idx_vendor_approval_log_performed_by
  - idx_vendor_invoices_project_item_id
  - idx_vendor_sessions_vendor_id
  - idx_vendor_suggestions_vendor_id
*/

DROP INDEX IF EXISTS public.idx_equipment_suggestions_vendor_id;
DROP INDEX IF EXISTS public.idx_expense_payments_created_by;
DROP INDEX IF EXISTS public.idx_legal_pages_created_by;
DROP INDEX IF EXISTS public.idx_legal_pages_history_created_by;
DROP INDEX IF EXISTS public.idx_terms_and_privacy_settings_updated_by;
DROP INDEX IF EXISTS public.idx_vendor_approval_log_performed_by;
DROP INDEX IF EXISTS public.idx_vendor_invoices_project_item_id;
DROP INDEX IF EXISTS public.idx_vendor_sessions_vendor_id;
DROP INDEX IF EXISTS public.idx_vendor_suggestions_vendor_id;
