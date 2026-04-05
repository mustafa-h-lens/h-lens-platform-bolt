/*
  # Drop Unused Indexes

  ## Summary
  The following indexes have never been used and are consuming storage/write overhead
  without providing query performance benefits. Dropping them improves write performance.

  ## Dropped Indexes
  - idx_activation_tokens_vendor_id
  - idx_activity_logs_project_id
  - idx_activity_logs_user_id
  - idx_client_document_types_created_by
  - idx_client_documents_document_type_id
  - idx_client_documents_uploaded_by
  - idx_clients_created_by
  - idx_clients_user_id
  - idx_expense_payments_expense_id
  - idx_invoices_created_by
  - idx_item_categories_created_by
  - idx_legal_pages_history_page_id
  - idx_production_tasks_created_by
  - idx_production_tasks_project_id
  - idx_project_files_uploaded_by
  - idx_project_items_category_id
  - idx_project_items_service_item_id
  - idx_project_milestones_created_by
  - idx_project_milestones_project_id
  - idx_project_tasks_assigned_to
  - idx_project_tasks_created_by
  - idx_project_tasks_project_id
  - idx_projects_created_by
  - idx_projects_project_manager_id
  - idx_purchase_orders_created_by
  - idx_service_items_created_by
  - idx_settings_config_updated_by
  - idx_system_activity_log_user_id
  - idx_task_po_allocations_po_id
  - idx_user_client_access_client_id
  - idx_users_role_id
  - idx_vendor_activity_log_performed_by
  - idx_vendor_activity_log_vendor_id
  - idx_vendor_approval_log_vendor_id
  - idx_vendor_documents_uploaded_by
  - idx_vendor_fields_parent_id
  - idx_vendor_financial_data_bank_id
  - idx_vendor_invoices_client_id
  - idx_vendor_invoices_project_id
  - idx_vendor_notifications_user_id
  - idx_vendor_notifications_vendor_id
  - idx_vendor_selected_fields_field_id
  - idx_vendor_suggestions_responded_by
  - idx_vendors_created_by
  - idx_vendors_reviewed_by
*/

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
