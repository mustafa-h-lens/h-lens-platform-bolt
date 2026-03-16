// Vendor portal shared types and constants

export interface VendorField {
  id: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  subcategories?: VendorField[];
}

export interface SelectedField {
  id: string;
  field_id: string;
  rate_from: number | null;
  rate_to: number | null;
  currency: string;
  vendor_fields: { name_ar: string; name_en: string };
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  condition?: string;
  quantity: number;
  notes?: string;
  catalog_item_id?: string;
  equipment_catalog?: {
    name: string;
    image_url: string;
    equipment_categories?: { name: string };
  };
}

export interface CatalogItem {
  id: string;
  name: string;
  name_en: string | null;
  image_url: string | null;
  equipment_categories?: { name: string };
  equipment_brands?: { name: string };
}

export interface Project {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  clients?: { name: string };
  vendor_role?: string;
}

export interface Invoice {
  id: string;
  amount_total: number;
  amount_paid?: number;
  amount_remaining?: number;
  category?: string | null;
  due_date?: string | null;
  notes?: string | null;
  status: string;
  created_at: string;
  projects?: { name: string };
}

export interface VendorDoc {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

export interface FinancialData {
  id?: string;
  payment_method: 'bank_transfer' | 'cash' | 'other';
  price_includes_tax: boolean;
  bank_name: string;
  beneficiary_name: string;
  iban: string;
  account_number: string;
}

export interface Bank {
  id: string;
  name_ar: string;
  name_en: string | null;
}

export const CONDITIONS = ['ممتازة', 'جيدة', 'مقبولة', 'تحتاج صيانة'];

export const DOC_TYPES = [
  { k: 'contract',    l: 'عقد',    icon: 'FileText'   },
  { k: 'nda',         l: 'NDA',    icon: 'Lock'       },
  { k: 'certificate', l: 'شهادة',  icon: 'Award'      },
  { k: 'other',       l: 'أخرى',   icon: 'Paperclip'  },
];

export const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active:      { label: 'نشط',          color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  in_progress: { label: 'جارٍ',         color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  completed:   { label: 'مكتمل',        color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  cancelled:   { label: 'ملغي',         color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  pending:     { label: 'قيد الانتظار', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  paid:        { label: 'مدفوعة',       color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  unpaid:      { label: 'غير مدفوعة',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  partial:     { label: 'جزئية',        color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
};
