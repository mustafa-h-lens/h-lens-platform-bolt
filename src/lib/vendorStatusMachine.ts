// Vendor Status State Machine
// Defines valid status transitions and enforces them

export type VendorStatus =
  | 'pending_approval'
  | 'revision_requested'
  | 'rejected'
  | 'active'
  | 'inactive'
  | 'blocked';

const VALID_TRANSITIONS: Record<VendorStatus, VendorStatus[]> = {
  pending_approval: ['active', 'rejected', 'revision_requested'],
  revision_requested: ['pending_approval', 'revision_requested', 'active', 'rejected'],
  rejected: ['pending_approval'],
  active: ['inactive', 'blocked'],
  inactive: ['active', 'blocked'],
  blocked: ['active', 'inactive'],
};

export function canTransition(from: VendorStatus, to: VendorStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidTransitions(from: VendorStatus): VendorStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}

export const STATUS_LABELS: Record<VendorStatus, { label: string; color: string; bgColor: string }> = {
  pending_approval: { label: 'بانتظار الموافقة', color: '#ffffff', bgColor: '#f59e0b' },
  revision_requested: { label: 'مطلوب تعديلات', color: '#ffffff', bgColor: '#8b5cf6' },
  rejected: { label: 'مرفوض', color: '#ffffff', bgColor: '#ef4444' },
  active: { label: 'نشط', color: '#ffffff', bgColor: 'var(--color-success, #22c55e)' },
  inactive: { label: 'غير نشط', color: 'var(--color-text-primary, #1e293b)', bgColor: 'var(--color-background-hover, #e2e8f0)' },
  blocked: { label: 'محظور', color: '#ffffff', bgColor: 'var(--color-danger, #ef4444)' },
};

export function isApprovalStatus(status: string): boolean {
  return ['pending_approval', 'revision_requested', 'rejected'].includes(status);
}

export function isOperationalStatus(status: string): boolean {
  return ['active', 'inactive', 'blocked'].includes(status);
}
