
/*
  # Add missing indexes for all unindexed foreign keys

  Adds covering indexes on every foreign key column that lacks one.
  This resolves the "Unindexed foreign keys" warnings and improves
  JOIN and cascade-delete query performance across all affected tables.

  Tables covered:
  - activation_tokens, activity_logs, client_document_types,
    client_documents, clients, expense_payments, invoices,
    item_categories, legal_pages_history, production_tasks,
    project_files, project_items, project_milestones, project_tasks,
    projects, purchase_orders, service_items, settings_config,
    system_activity_log, task_po_allocations, user_client_access,
    users, vendor_activity_log, vendor_approval_log, vendor_documents,
    vendor_fields, vendor_financial_data, vendor_invoices,
    vendor_notifications, vendor_selected_fields, vendor_suggestions,
    vendors
*/

CREATE INDEX IF NOT EXISTS idx_activation_tokens_vendor_id ON public.activation_tokens (vendor_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON public.activity_logs (project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_client_document_types_created_by ON public.client_document_types (created_by);

CREATE INDEX IF NOT EXISTS idx_client_documents_document_type_id ON public.client_documents (document_type_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_uploaded_by ON public.client_documents (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients (created_by);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients (user_id);

CREATE INDEX IF NOT EXISTS idx_expense_payments_expense_id ON public.expense_payments (expense_id);

CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON public.invoices (created_by);

CREATE INDEX IF NOT EXISTS idx_item_categories_created_by ON public.item_categories (created_by);

CREATE INDEX IF NOT EXISTS idx_legal_pages_history_page_id ON public.legal_pages_history (page_id);

CREATE INDEX IF NOT EXISTS idx_production_tasks_created_by ON public.production_tasks (created_by);
CREATE INDEX IF NOT EXISTS idx_production_tasks_project_id ON public.production_tasks (project_id);

CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_by ON public.project_files (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_project_items_category_id ON public.project_items (category_id);
CREATE INDEX IF NOT EXISTS idx_project_items_service_item_id ON public.project_items (service_item_id);

CREATE INDEX IF NOT EXISTS idx_project_milestones_created_by ON public.project_milestones (created_by);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON public.project_milestones (project_id);

CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON public.project_tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_tasks_created_by ON public.project_tasks (created_by);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON public.project_tasks (project_id);

CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects (created_by);
CREATE INDEX IF NOT EXISTS idx_projects_project_manager_id ON public.projects (project_manager_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON public.purchase_orders (created_by);

CREATE INDEX IF NOT EXISTS idx_service_items_created_by ON public.service_items (created_by);

CREATE INDEX IF NOT EXISTS idx_settings_config_updated_by ON public.settings_config (updated_by);

CREATE INDEX IF NOT EXISTS idx_system_activity_log_user_id ON public.system_activity_log (user_id);

CREATE INDEX IF NOT EXISTS idx_task_po_allocations_po_id ON public.task_po_allocations (po_id);

CREATE INDEX IF NOT EXISTS idx_user_client_access_client_id ON public.user_client_access (client_id);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users (role_id);

CREATE INDEX IF NOT EXISTS idx_vendor_activity_log_performed_by ON public.vendor_activity_log (performed_by);
CREATE INDEX IF NOT EXISTS idx_vendor_activity_log_vendor_id ON public.vendor_activity_log (vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_approval_log_vendor_id ON public.vendor_approval_log (vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_documents_uploaded_by ON public.vendor_documents (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_vendor_fields_parent_id ON public.vendor_fields (parent_id);

CREATE INDEX IF NOT EXISTS idx_vendor_financial_data_bank_id ON public.vendor_financial_data (bank_id);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_client_id ON public.vendor_invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_project_id ON public.vendor_invoices (project_id);

CREATE INDEX IF NOT EXISTS idx_vendor_notifications_user_id ON public.vendor_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_notifications_vendor_id ON public.vendor_notifications (vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_selected_fields_field_id ON public.vendor_selected_fields (field_id);

CREATE INDEX IF NOT EXISTS idx_vendor_suggestions_responded_by ON public.vendor_suggestions (responded_by);

CREATE INDEX IF NOT EXISTS idx_vendors_created_by ON public.vendors (created_by);
CREATE INDEX IF NOT EXISTS idx_vendors_reviewed_by ON public.vendors (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors (user_id);
