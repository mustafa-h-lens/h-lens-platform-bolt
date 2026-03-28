
/*
  # Fix Unindexed Foreign Keys (Round 2) and Drop Unused Indexes

  ## Summary
  The previous migration added indexes that were flagged as unused by the database
  statistics collector (likely because the database was just started or queries haven't
  run yet). However, foreign key indexes are important for referential integrity operations
  (cascades, updates, deletes) regardless of query usage stats.

  This migration:
  1. Drops all indexes previously added that are flagged as unused
  2. Adds new indexes for the remaining unindexed FK columns that were missed

  ## Dropped Indexes (unused per stats)
  All idx_* indexes added in the previous migration

  ## New Indexes Added
  - equipment_suggestions: vendor_id
  - expense_payments: created_by
  - legal_pages: created_by
  - legal_pages_history: created_by
  - terms_and_privacy_settings: updated_by
  - vendor_approval_log: performed_by
  - vendor_invoices: project_item_id
  - vendor_sessions: vendor_id
  - vendor_suggestions: vendor_id
*/

-- Drop all previously added unused FK indexes
DROP INDEX IF EXISTS public.idx_activation_tokens_vendor_id;
DROP INDEX IF EXISTS public.idx_activity_logs_project_id;
DROP INDEX IF EXISTS public.idx_activity_logs_user_id;
DROP INDEX IF EXISTS public.idx_client_document_types_created_by;
DROP INDEX IF EXISTS public.idx_client_documents_document_type_id;
DROP INDEX IF EXISTS public.idx_client_documents_uploaded_by;
DROP INDEX IF EXISTS public.idx_clients_created_by;
DROP INDEX IF EXISTS public.idx_clients_user_id;
DROP INDEX IF EXISTS public.idx_expense_payments_expense_id;
DROP INDEX IF EXISTS public.idx_invoices_created_by;
DROP INDEX IF EXISTS public.idx_item_categories_created_by;
DROP INDEX IF EXISTS public.idx_legal_pages_history_page_id;
DROP INDEX IF EXISTS public.idx_production_tasks_created_by;
DROP INDEX IF EXISTS public.idx_production_tasks_project_id;
DROP INDEX IF EXISTS public.idx_project_files_uploaded_by;
DROP INDEX IF EXISTS public.idx_project_items_category_id;
DROP INDEX IF EXISTS public.idx_project_items_service_item_id;
DROP INDEX IF EXISTS public.idx_project_milestones_created_by;
DROP INDEX IF EXISTS public.idx_project_milestones_project_id;
DROP INDEX IF EXISTS public.idx_project_tasks_assigned_to;
DROP INDEX IF EXISTS public.idx_project_tasks_created_by;
DROP INDEX IF EXISTS public.idx_project_tasks_project_id;
DROP INDEX IF EXISTS public.idx_projects_created_by;
DROP INDEX IF EXISTS public.idx_projects_project_manager_id;
DROP INDEX IF EXISTS public.idx_purchase_orders_created_by;
DROP INDEX IF EXISTS public.idx_service_items_created_by;
DROP INDEX IF EXISTS public.idx_settings_config_updated_by;
DROP INDEX IF EXISTS public.idx_system_activity_log_user_id;
DROP INDEX IF EXISTS public.idx_task_po_allocations_po_id;
DROP INDEX IF EXISTS public.idx_user_client_access_client_id;
DROP INDEX IF EXISTS public.idx_users_role_id;
DROP INDEX IF EXISTS public.idx_vendor_activity_log_performed_by;
DROP INDEX IF EXISTS public.idx_vendor_activity_log_vendor_id;
DROP INDEX IF EXISTS public.idx_vendor_approval_log_vendor_id;
DROP INDEX IF EXISTS public.idx_vendor_documents_uploaded_by;
DROP INDEX IF EXISTS public.idx_vendor_fields_parent_id;
DROP INDEX IF EXISTS public.idx_vendor_financial_data_bank_id;
DROP INDEX IF EXISTS public.idx_vendor_invoices_client_id;
DROP INDEX IF EXISTS public.idx_vendor_invoices_project_id;
DROP INDEX IF EXISTS public.idx_vendor_notifications_user_id;
DROP INDEX IF EXISTS public.idx_vendor_notifications_vendor_id;
DROP INDEX IF EXISTS public.idx_vendor_selected_fields_field_id;
DROP INDEX IF EXISTS public.idx_vendor_suggestions_responded_by;
DROP INDEX IF EXISTS public.idx_vendors_created_by;
DROP INDEX IF EXISTS public.idx_vendors_reviewed_by;
DROP INDEX IF EXISTS public.idx_vendors_user_id;

-- Add indexes for the newly reported unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_equipment_suggestions_vendor_id ON public.equipment_suggestions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_expense_payments_created_by ON public.expense_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_legal_pages_created_by ON public.legal_pages(created_by);
CREATE INDEX IF NOT EXISTS idx_legal_pages_history_created_by ON public.legal_pages_history(created_by);
CREATE INDEX IF NOT EXISTS idx_terms_and_privacy_settings_updated_by ON public.terms_and_privacy_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_vendor_approval_log_performed_by ON public.vendor_approval_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_project_item_id ON public.vendor_invoices(project_item_id);
CREATE INDEX IF NOT EXISTS idx_vendor_sessions_vendor_id ON public.vendor_sessions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_suggestions_vendor_id ON public.vendor_suggestions(vendor_id);
