export interface User {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  role: 'super_admin' | 'project_manager' | 'client';
  role_id: string | null;
  is_active: boolean;
  created_at: string;
  roles?: Role;
}

export const MODULE_KEYS = [
  'dashboard', 'clients', 'vendors', 'projects', 'expenses',
  'suggestions', 'reports', 'activity', 'settings', 'users',
] as const;

export type ModuleKey = typeof MODULE_KEYS[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: 'الرئيسية',
  clients: 'العملاء',
  vendors: 'الموردين',
  projects: 'المشاريع',
  expenses: 'المصروفات',
  suggestions: 'الاقتراحات',
  reports: 'التقارير',
  activity: 'سجل النشاط',
  settings: 'الإعدادات',
  users: 'إدارة المستخدمين',
};

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  module_key: ModuleKey;
  has_access: boolean;
  created_at: string;
}

export interface RoleWithPermissions extends Role {
  role_permissions: RolePermission[];
}

export interface ClientContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  client_image: string | null;
  contacts: ClientContact[] | null;
  created_at: string;
  updated_at: string;
}

export interface UserClientAccess {
  id: string;
  user_id: string;
  client_id: string;
  created_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  project_code: string | null;
  description: string | null;
  project_mode: 'STANDARD' | 'FRAMEWORK' | 'CONTRACT';
  status: 'request' | 'quoted' | 'invoiced' | 'po_issued' | 'partial_paid' | 'paid' | 'closed' | 'cancelled' | 'pending' | 'in_progress' | 'completed';
  start_date: string | null;
  end_date: string | null;
  activation_time: string | null;
  project_manager_id: string | null;
  internal_notes: string | null;
  total_cost: number;
  total_price: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceItem {
  id: string;
  item_number: string;
  name: string;
  description: string | null;
  default_quantity: number;
  unit_price: number;
  currency: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  id: string;
  project_id: string;
  service_item_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  sort_order: number;
  category_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  file_name: string;
  file_type: 'quote' | 'invoice' | 'po' | 'plan' | 'contract' | 'other';
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  link_url: string;
  link_type: 'deliverable' | 'video' | 'design' | 'documentation' | 'other';
  description: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  project_id: string;
  user_id: string | null;
  action_type: string;
  action_details: Record<string, any>;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  status: 'todo' | 'in_progress' | 'done';
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: 'bank_transfer' | 'cash' | 'check';
  notes: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  project_id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: 'paid' | 'unpaid' | 'partial' | 'cancelled' | 'draft' | 'sent';
  total_amount: number;
  paid_amount: number;
  currency: string;
  file_url: string | null;
  notes: string | null;
  payments: InvoicePayment[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithRelations extends Project {
  client: Client;
  project_manager?: User;
}

export interface ProjectItemWithService extends ProjectItem {
  service_item?: ServiceItem;
}

export interface ActivityLogWithUser extends ActivityLog {
  user?: User;
}

export interface PurchaseOrder {
  id: string;
  client_id: string;
  po_number: string;
  title: string;
  description: string | null;
  total_amount: number;
  currency: string;
  issue_date: string;
  expiry_date: string | null;
  status: 'active' | 'near_complete' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductionTask {
  id: string;
  client_id: string;
  project_id: string | null;
  task_name: string;
  description: string | null;
  amount: number;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskPOAllocation {
  id: string;
  task_id: string;
  po_id: string;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface POSettings {
  id: string;
  warning_threshold: number;
  allow_split_task: boolean;
  allow_po_exceed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskPOAllocationWithRelations extends TaskPOAllocation {
  production_task?: ProductionTask;
  purchase_order?: PurchaseOrder;
}

export interface PurchaseOrderWithAllocations extends PurchaseOrder {
  allocations?: TaskPOAllocation[];
  used_amount?: number;
  remaining_amount?: number;
  usage_percentage?: number;
}

export interface ProductionTaskWithAllocations extends ProductionTask {
  allocations?: TaskPOAllocation[];
  allocated_amount?: number;
  allocation_status?: 'unlinked' | 'linked';
}

export interface EquipmentBrand {
  id: string;
  name: string;
  name_en: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface EquipmentCategory {
  id: string;
  name: string;
  name_en: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface EquipmentCatalog {
  id: string;
  brand_id: string | null;
  name: string;
  name_en: string | null;
  category_id: string | null;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquipmentCatalogWithRelations extends EquipmentCatalog {
  equipment_brands?: EquipmentBrand;
  equipment_categories?: EquipmentCategory;
}

// Vendor field from vendor_fields table (loaded dynamically)
export interface VendorField {
  id: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
}

export const PAYMENT_METHODS: Record<string, string> = {
  bank_transfer: 'تحويل بنكي',
  cash: 'نقدي',
  check: 'شيك',
};
