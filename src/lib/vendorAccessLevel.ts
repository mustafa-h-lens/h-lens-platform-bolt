import type { VendorStatus } from './vendorStatusMachine';

export type VendorAccess = 'preview' | 'full' | 'locked';

/**
 * Single source of truth for what a vendor can do in the portal, derived
 * purely from their lifecycle status. UI gating (sidebars, buttons, route
 * guards) must read from this helper — never branch on the raw status string.
 *
 *  preview  → logged in, real mutating actions blocked, demo fixtures shown
 *  full     → approved vendor, all real features unlocked
 *  locked   → rejected or suspended: fullscreen block page, no portal nav
 */
export function accessLevelFor(status: VendorStatus | string | undefined | null): VendorAccess {
  if (status === 'active' || status === 'approved') return 'full';
  if (status === 'rejected' || status === 'suspended' || status === 'blocked') return 'locked';
  // draft / pending_approval / revision_requested / resubmitted / anything unknown
  return 'preview';
}

/** True when the vendor is logged in but still awaiting (or working through) approval. */
export function isPreviewAccess(status: VendorStatus | string | undefined | null): boolean {
  return accessLevelFor(status) === 'preview';
}

/** Human-readable label used by status chips and the dashboard timeline. */
export function statusDisplay(status: VendorStatus | string | undefined | null): {
  label: string;
  tone: 'info' | 'warn' | 'success' | 'danger' | 'muted';
} {
  switch (status) {
    case 'pending_approval':  return { label: 'قيد المراجعة', tone: 'info' };
    case 'revision_requested':return { label: 'مطلوب تعديلات', tone: 'warn' };
    case 'resubmitted':       return { label: 'إعادة مراجعة', tone: 'info' };
    case 'approved':
    case 'active':            return { label: 'نشط', tone: 'success' };
    case 'rejected':          return { label: 'مرفوض', tone: 'danger' };
    case 'suspended':         return { label: 'موقوف', tone: 'warn' };
    case 'blocked':           return { label: 'محظور', tone: 'danger' };
    case 'inactive':          return { label: 'غير نشط', tone: 'muted' };
    default:                  return { label: 'غير معروف', tone: 'muted' };
  }
}
