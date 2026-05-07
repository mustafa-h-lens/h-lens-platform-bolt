import { supabase } from './supabaseClient';
import { toEnglishNumbers } from './numberUtils';

export type DuplicateField = 'email' | 'phone' | 'id_number';

export interface ExistingVendor {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  id_number: string | null;
  status: string;
}

export interface DuplicateMatch {
  field: DuplicateField;
  vendor: ExistingVendor;
}

interface CheckParams {
  email?: string | null;
  phone?: string | null;
  id_number?: string | null;
  excludeId?: string;
  // Rejected vendors are reusable in the self-registration flow — pass true
  // there. Admin flows pass false so the conflict is surfaced regardless of
  // status.
  ignoreRejected?: boolean;
}

const ARABIC_MSG: Record<DuplicateField, string> = {
  email: 'هذا البريد الإلكتروني مسجل بالفعل لمورد آخر',
  phone: 'رقم الجوال مسجل بالفعل لمورد آخر',
  id_number: 'رقم الهوية مسجل بالفعل لمورد آخر',
};

export function duplicateMessage(match: DuplicateMatch): string {
  return ARABIC_MSG[match.field];
}

const SELECT_COLS = 'id, full_name, email, phone, id_number, status';

async function findByField(
  field: DuplicateField,
  value: string,
  excludeId: string | undefined,
  ignoreRejected: boolean,
): Promise<ExistingVendor | null> {
  let query = supabase.from('vendors').select(SELECT_COLS).limit(1);
  if (field === 'email') {
    query = query.ilike('email', value);
  } else {
    query = query.eq(field, value);
  }
  if (excludeId) query = query.neq('id', excludeId);
  if (ignoreRejected) query = query.neq('status', 'rejected');
  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error(`vendor duplicate check (${field}) failed:`, error);
    return null;
  }
  return (data as ExistingVendor | null) ?? null;
}

/**
 * Returns the first conflicting field (email, then phone, then id_number) or
 * null if no duplicate is found. Empty/null inputs are skipped so vendors
 * without an email don't collide with each other.
 */
export async function checkVendorDuplicates({
  email,
  phone,
  id_number,
  excludeId,
  ignoreRejected = false,
}: CheckParams): Promise<DuplicateMatch | null> {
  const trimmedEmail = email?.trim();
  if (trimmedEmail) {
    const v = await findByField('email', trimmedEmail, excludeId, ignoreRejected);
    if (v) return { field: 'email', vendor: v };
  }

  const trimmedPhone = phone?.trim();
  if (trimmedPhone) {
    const v = await findByField('phone', toEnglishNumbers(trimmedPhone), excludeId, ignoreRejected);
    if (v) return { field: 'phone', vendor: v };
  }

  const trimmedId = id_number?.trim();
  if (trimmedId) {
    const v = await findByField('id_number', toEnglishNumbers(trimmedId), excludeId, ignoreRejected);
    if (v) return { field: 'id_number', vendor: v };
  }

  return null;
}
