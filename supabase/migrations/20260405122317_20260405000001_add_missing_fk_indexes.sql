/*
  # Add Missing Foreign Key Indexes

  ## Summary
  Several tables have foreign key constraints without corresponding indexes, causing
  suboptimal query performance. This migration adds the missing indexes.

  ## New Indexes
  - equipment_suggestions.vendor_id
  - expense_payments.approved_by, created_by, transferred_by
  - legal_pages.created_by
  - legal_pages_history.created_by
  - terms_and_privacy_settings.updated_by
  - vendor_approval_log.performed_by
  - vendor_invoices.paid_by_user_id, project_item_id, team_member_id
  - vendor_sessions.vendor_id
  - vendor_suggestions.vendor_id
*/

CREATE INDEX IF NOT EXISTS idx_equipment_suggestions_vendor_id
  ON public.equipment_suggestions (vendor_id);

CREATE INDEX IF NOT EXISTS idx_expense_payments_approved_by
  ON public.expense_payments (approved_by);

CREATE INDEX IF NOT EXISTS idx_expense_payments_created_by
  ON public.expense_payments (created_by);

CREATE INDEX IF NOT EXISTS idx_expense_payments_transferred_by
  ON public.expense_payments (transferred_by);

CREATE INDEX IF NOT EXISTS idx_legal_pages_created_by
  ON public.legal_pages (created_by);

CREATE INDEX IF NOT EXISTS idx_legal_pages_history_created_by
  ON public.legal_pages_history (created_by);

CREATE INDEX IF NOT EXISTS idx_terms_and_privacy_settings_updated_by
  ON public.terms_and_privacy_settings (updated_by);

CREATE INDEX IF NOT EXISTS idx_vendor_approval_log_performed_by
  ON public.vendor_approval_log (performed_by);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_paid_by_user_id
  ON public.vendor_invoices (paid_by_user_id);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_project_item_id
  ON public.vendor_invoices (project_item_id);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_team_member_id
  ON public.vendor_invoices (team_member_id);

CREATE INDEX IF NOT EXISTS idx_vendor_sessions_vendor_id
  ON public.vendor_sessions (vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_suggestions_vendor_id
  ON public.vendor_suggestions (vendor_id);
