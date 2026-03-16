/*
  # Fix Security and Performance Issues - Part 1: Indexes

  1. **Add Missing Foreign Key Indexes**
    - expense_payments.created_by
    - legal_pages.created_by
    - legal_pages_history.created_by
    - terms_and_privacy_settings.updated_by
    - vendor_approval_log.performed_by

  2. **Remove Unused Indexes**
    - 70+ unused indexes that slow down write operations
*/

-- =====================================================
-- Add Missing Foreign Key Indexes
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'expense_payments' AND indexname = 'idx_expense_payments_created_by'
  ) THEN
    CREATE INDEX idx_expense_payments_created_by ON public.expense_payments(created_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'legal_pages' AND indexname = 'idx_legal_pages_created_by'
  ) THEN
    CREATE INDEX idx_legal_pages_created_by ON public.legal_pages(created_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'legal_pages_history' AND indexname = 'idx_legal_pages_history_created_by'
  ) THEN
    CREATE INDEX idx_legal_pages_history_created_by ON public.legal_pages_history(created_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'terms_and_privacy_settings' AND indexname = 'idx_terms_and_privacy_settings_updated_by'
  ) THEN
    CREATE INDEX idx_terms_and_privacy_settings_updated_by ON public.terms_and_privacy_settings(updated_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'vendor_approval_log' AND indexname = 'idx_vendor_approval_log_performed_by'
  ) THEN
    CREATE INDEX idx_vendor_approval_log_performed_by ON public.vendor_approval_log(performed_by);
  END IF;
END $$;

-- =====================================================
-- Remove Unused Indexes
-- =====================================================

DROP INDEX IF EXISTS public.idx_users_username;
DROP INDEX IF EXISTS public.idx_users_is_active;
DROP INDEX IF EXISTS public.idx_clients_user_id;
DROP INDEX IF EXISTS public.idx_clients_created_by;
DROP INDEX IF EXISTS public.idx_invoices_status;
DROP INDEX IF EXISTS public.idx_invoices_created_by;
DROP INDEX IF EXISTS public.idx_production_tasks_status;
DROP INDEX IF EXISTS public.idx_production_tasks_project;
DROP INDEX IF EXISTS public.idx_production_tasks_created_by;
DROP INDEX IF EXISTS public.idx_purchase_orders_status;
DROP INDEX IF EXISTS public.idx_purchase_orders_created_by;
DROP INDEX IF EXISTS public.idx_user_client_access_client_id;
DROP INDEX IF EXISTS public.idx_user_client_access_user_id;
DROP INDEX IF EXISTS public.idx_projects_project_code;
DROP INDEX IF EXISTS public.idx_projects_project_manager_id;
DROP INDEX IF EXISTS public.idx_projects_created_by;
DROP INDEX IF EXISTS public.idx_service_items_item_number;
DROP INDEX IF EXISTS public.idx_service_items_is_active;
DROP INDEX IF EXISTS public.idx_service_items_created_by;
DROP INDEX IF EXISTS public.idx_project_items_service_item_id;
DROP INDEX IF EXISTS public.idx_project_items_category_id;
DROP INDEX IF EXISTS public.idx_project_files_file_type;
DROP INDEX IF EXISTS public.idx_project_files_uploaded_by;
DROP INDEX IF EXISTS public.idx_project_milestones_project_id;
DROP INDEX IF EXISTS public.idx_project_milestones_created_by;
DROP INDEX IF EXISTS public.idx_task_po_allocations_task_id;
DROP INDEX IF EXISTS public.idx_task_po_allocations_po_id;
DROP INDEX IF EXISTS public.idx_activity_logs_project_id;
DROP INDEX IF EXISTS public.idx_activity_logs_user_id;
DROP INDEX IF EXISTS public.idx_activity_logs_created_at;
DROP INDEX IF EXISTS public.idx_activity_logs_action_type;
DROP INDEX IF EXISTS public.idx_project_tasks_project_id;
DROP INDEX IF EXISTS public.idx_project_tasks_assigned_to;
DROP INDEX IF EXISTS public.idx_project_tasks_status;
DROP INDEX IF EXISTS public.idx_project_tasks_due_date;
DROP INDEX IF EXISTS public.idx_project_tasks_created_by;
DROP INDEX IF EXISTS public.idx_system_activity_log_user_id;
DROP INDEX IF EXISTS public.idx_system_activity_log_entity_type;
DROP INDEX IF EXISTS public.idx_system_activity_log_created_at;
DROP INDEX IF EXISTS public.idx_vendor_drafts_phone;
DROP INDEX IF EXISTS public.idx_vendor_drafts_expires;
DROP INDEX IF EXISTS public.idx_item_categories_created_by;
DROP INDEX IF EXISTS public.idx_countries_iso_code;
DROP INDEX IF EXISTS public.idx_settings_config_updated_by;
DROP INDEX IF EXISTS public.idx_vendor_documents_uploaded_by;
DROP INDEX IF EXISTS public.idx_vendor_invoices_project_id;
DROP INDEX IF EXISTS public.idx_vendor_invoices_client_id;
DROP INDEX IF EXISTS public.idx_vendors_created_by;
DROP INDEX IF EXISTS public.idx_vendors_user_id;
DROP INDEX IF EXISTS public.idx_vendors_reviewed_by;
DROP INDEX IF EXISTS public.idx_vendor_financial_data_bank_id;
DROP INDEX IF EXISTS public.idx_expense_payments_expense_id;
DROP INDEX IF EXISTS public.idx_equipment_catalog_active;
DROP INDEX IF EXISTS public.idx_cities_name;
DROP INDEX IF EXISTS public.idx_cities_active;
DROP INDEX IF EXISTS public.idx_vendor_notifications_user_id;
DROP INDEX IF EXISTS public.idx_vendor_notifications_vendor_id;
DROP INDEX IF EXISTS public.idx_vendor_notifications_is_read;
DROP INDEX IF EXISTS public.idx_vendor_activity_log_vendor_id;
DROP INDEX IF EXISTS public.idx_vendor_activity_log_performed_by;
DROP INDEX IF EXISTS public.idx_activation_tokens_token;
DROP INDEX IF EXISTS public.idx_activation_tokens_vendor_id;
DROP INDEX IF EXISTS public.idx_activation_tokens_used;
DROP INDEX IF EXISTS public.idx_activation_tokens_expires_at;
DROP INDEX IF EXISTS public.idx_vendor_fields_parent_id;
DROP INDEX IF EXISTS public.idx_vendor_fields_is_active;
DROP INDEX IF EXISTS public.idx_vendor_selected_fields_field_id;
DROP INDEX IF EXISTS public.idx_vendor_approval_log_vendor_id;
DROP INDEX IF EXISTS public.idx_vendor_approval_log_action;
DROP INDEX IF EXISTS public.idx_vendor_approval_log_created_at;
DROP INDEX IF EXISTS public.idx_terms_privacy_type_active;
DROP INDEX IF EXISTS public.idx_legal_pages_active;
DROP INDEX IF EXISTS public.idx_legal_pages_history_page_id;
DROP INDEX IF EXISTS public.idx_otp_codes_expires;
