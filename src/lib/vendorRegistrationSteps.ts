// Step & field registry for the vendor registration wizard.
// Used by: RevisionFlagModal (admin), RevisionCenter (vendor),
// field-lock map on resubmit, and the structured revision email.
//
// IMPORTANT: step ids are stable identifiers stored in
// vendor_approval_log.flags — do not rename without a migration.

export type VendorStepId =
  | 'identity'
  | 'contact'
  | 'documents'
  | 'travel'
  | 'financial'
  | 'fields'
  | 'review';

export interface FieldDef {
  id: string;         // stable identifier (stored in flags)
  label: string;      // Arabic label shown to admin + vendor
  table?: string;     // underlying table (for delta/update targeting)
}

export interface StepDef {
  id: VendorStepId;
  label: string;
  fields: FieldDef[];
}

export const VENDOR_REGISTRATION_STEPS: StepDef[] = [
  {
    id: 'identity',
    label: 'الهوية الأساسية',
    fields: [
      { id: 'full_name', label: 'الاسم الكامل', table: 'vendors' },
      { id: 'nationality', label: 'الجنسية', table: 'vendors' },
      { id: 'vendor_type', label: 'نوع المورد', table: 'vendors' },
      { id: 'id_number', label: 'رقم الهوية', table: 'vendors' },
    ],
  },
  {
    id: 'contact',
    label: 'بيانات التواصل',
    fields: [
      { id: 'email', label: 'البريد الإلكتروني', table: 'vendors' },
      { id: 'phone', label: 'رقم الجوال', table: 'vendors' },
      { id: 'primary_city', label: 'المدينة الأساسية', table: 'vendors' },
      { id: 'other_cities', label: 'مدن أخرى', table: 'vendors' },
      { id: 'portfolio_url', label: 'رابط البورتفوليو', table: 'vendors' },
    ],
  },
  {
    id: 'documents',
    label: 'المستندات والصور',
    fields: [
      { id: 'profile_image', label: 'الصورة الشخصية', table: 'vendors' },
      { id: 'id_image', label: 'صورة الهوية', table: 'vendors' },
    ],
  },
  {
    id: 'travel',
    label: 'وثائق السفر',
    fields: [
      { id: 'passport_number', label: 'رقم جواز السفر', table: 'vendor_travel_documents' },
      { id: 'passport_issuing_country', label: 'بلد إصدار الجواز', table: 'vendor_travel_documents' },
      { id: 'passport_expiry_date', label: 'تاريخ انتهاء الجواز', table: 'vendor_travel_documents' },
      { id: 'passport_file', label: 'صورة جواز السفر', table: 'vendor_travel_documents' },
      { id: 'visa_country', label: 'بلد التأشيرة', table: 'vendor_travel_documents' },
      { id: 'visa_file', label: 'مستند التأشيرة', table: 'vendor_travel_documents' },
    ],
  },
  {
    id: 'financial',
    label: 'البيانات المالية',
    fields: [
      { id: 'bank_id', label: 'البنك', table: 'vendor_financial_data' },
      { id: 'account_name', label: 'اسم الحساب', table: 'vendor_financial_data' },
      { id: 'iban', label: 'رقم الآيبان (IBAN)', table: 'vendor_financial_data' },
      { id: 'price_includes_tax', label: 'الأسعار تشمل ضريبة', table: 'vendor_financial_data' },
      { id: 'company_name', label: 'اسم الشركة', table: 'vendor_financial_data' },
      { id: 'vat_number', label: 'الرقم الضريبي', table: 'vendor_financial_data' },
    ],
  },
  {
    id: 'fields',
    label: 'المجالات والأسعار',
    fields: [
      { id: 'selected_fields', label: 'المجالات المختارة', table: 'vendor_selected_fields' },
      { id: 'rates', label: 'نطاقات الأسعار', table: 'vendor_selected_fields' },
    ],
  },
  {
    id: 'review',
    label: 'المراجعة النهائية',
    fields: [],
  },
];

export const STEP_BY_ID: Record<VendorStepId, StepDef> = Object.fromEntries(
  VENDOR_REGISTRATION_STEPS.map((s) => [s.id, s])
) as Record<VendorStepId, StepDef>;

export function getStepLabel(id: string): string {
  return STEP_BY_ID[id as VendorStepId]?.label || id;
}

export function getFieldLabel(stepId: string, fieldId: string): string {
  const step = STEP_BY_ID[stepId as VendorStepId];
  return step?.fields.find((f) => f.id === fieldId)?.label || fieldId;
}

// ── Flag schema ──
// Stored on vendor_approval_log.flags for action='revision_requested':
//   { steps: { [stepId]: { comment: string, fields: string[] } } }
// Stored on vendor_approval_log.flags for action='resubmitted':
//   { delta: { [stepId]: { [fieldId]: { from: unknown, to: unknown } } } }

export interface RevisionFlags {
  steps: Record<string, { comment: string; fields: string[] }>;
}

export interface ResubmissionDelta {
  delta: Record<string, Record<string, { from: unknown; to: unknown }>>;
}
