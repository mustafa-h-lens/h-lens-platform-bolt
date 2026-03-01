import type { PurchaseOrder, TaskPOAllocation, POSettings } from '../types/database';

export interface POCalculationResult {
  usedAmount: number;
  remainingAmount: number;
  usagePercentage: number;
  status: 'active' | 'near_complete' | 'completed' | 'cancelled';
  canAllocate: boolean;
}

export function calculatePOUsage(
  po: PurchaseOrder,
  allocations: TaskPOAllocation[],
  settings?: POSettings
): POCalculationResult {
  const usedAmount = allocations.reduce((sum, alloc) => sum + (alloc.amount || 0), 0);
  const remainingAmount = Math.max(0, po.total_amount - usedAmount);
  const usagePercentage = po.total_amount > 0 ? (usedAmount / po.total_amount) * 100 : 0;

  let status: 'active' | 'near_complete' | 'completed' | 'cancelled' = po.status;

  if (po.status === 'cancelled') {
    status = 'cancelled';
  } else if (usagePercentage >= 100) {
    status = 'completed';
  } else if (settings && usagePercentage >= settings.warning_threshold) {
    status = 'near_complete';
  } else {
    status = 'active';
  }

  return {
    usedAmount,
    remainingAmount,
    usagePercentage: Math.min(100, usagePercentage),
    status,
    canAllocate: remainingAmount > 0 || (settings?.allow_po_exceed ?? false),
  };
}

export function canAllocateAmount(
  po: PurchaseOrder,
  allocations: TaskPOAllocation[],
  requestedAmount: number,
  settings?: POSettings
): { canAllocate: boolean; reason?: string } {
  if (po.status === 'cancelled') {
    return { canAllocate: false, reason: 'أمر الشراء ملغي' };
  }

  const calculation = calculatePOUsage(po, allocations, settings);

  if (requestedAmount <= 0) {
    return { canAllocate: false, reason: 'المبلغ يجب أن يكون أكبر من صفر' };
  }

  if (requestedAmount > calculation.remainingAmount) {
    if (settings?.allow_po_exceed) {
      return { canAllocate: true };
    } else {
      return {
        canAllocate: false,
        reason: `المبلغ المتبقي في أمر الشراء هو ${calculation.remainingAmount.toFixed(2)} ريال فقط`,
      };
    }
  }

  return { canAllocate: true };
}

export function getPOStatusBadgeColor(status: string): {
  bg: string;
  text: string;
} {
  switch (status) {
    case 'active':
      return { bg: 'var(--color-info)', text: '#ffffff' };
    case 'near_complete':
      return { bg: 'var(--color-warning)', text: '#ffffff' };
    case 'completed':
      return { bg: 'var(--color-success)', text: '#ffffff' };
    case 'cancelled':
      return { bg: 'var(--color-background-hover)', text: 'var(--color-text-muted)' };
    default:
      return { bg: 'var(--color-background-hover)', text: 'var(--color-text-primary)' };
  }
}

export function getPOStatusText(status: string): string {
  switch (status) {
    case 'active':
      return 'نشط';
    case 'near_complete':
      return 'شارف على الانتهاء';
    case 'completed':
      return 'مكتمل';
    case 'cancelled':
      return 'ملغي';
    default:
      return status;
  }
}

export function getTaskAllocationStatus(
  taskAllocations: TaskPOAllocation[]
): 'unlinked' | 'linked' {
  return taskAllocations.length > 0 ? 'linked' : 'unlinked';
}

export function getTaskAllocationStatusText(status: 'unlinked' | 'linked'): string {
  return status === 'linked' ? 'مربوطة' : 'غير مربوطة';
}

export function getTaskAllocationStatusColor(status: 'unlinked' | 'linked'): {
  bg: string;
  text: string;
} {
  return status === 'linked'
    ? { bg: 'var(--color-success)', text: '#ffffff' }
    : { bg: 'var(--color-warning)', text: '#ffffff' };
}
