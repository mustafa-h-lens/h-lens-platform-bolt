import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';

// ─── Generic fetch hook ───────────────────────────────────────
export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (e: any) {
      setError(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { data, loading, error, refetch: run };
}

// ─── Dashboard stats ──────────────────────────────────────────
export async function fetchDashboardStats(vendorId: string) {
  const { data: invoices, error } = await supabase
    .from('vendor_invoices')
    .select('*')
    .eq('vendor_id', vendorId);

  if (error) throw error;

  const projectIds = new Set((invoices || []).map((i: any) => i.project_id));
  const clientIds  = new Set((invoices || []).map((i: any) => i.client_id));
  const total  = (invoices || []).reduce((s: number, i: any) => s + Number(i.amount_total  || 0), 0);
  const paid   = (invoices || []).reduce((s: number, i: any) => s + Number(i.amount_paid   || 0), 0);

  return {
    projectsCount: projectIds.size,
    clientsCount:  clientIds.size,
    totalAmount:   total,
    paidAmount:    paid,
    unpaidAmount:  total - paid,
  };
}

// ─── Vendor full profile ──────────────────────────────────────
export async function fetchVendorProfile(vendorId: string) {
  const { data, error } = await supabase
    .from('vendors')
    .select(`
      id, full_name, phone, email, profile_image,
      id_number, nationality, primary_city,
      available_other_cities, other_cities, status,
      bank_id, iban, account_name, vendor_type
    `)
    .eq('id', vendorId)
    .single();
  if (error) throw error;
  return data;
}

// ─── Cities (from DB) ─────────────────────────────────────────
export async function fetchCities() {
  const { data, error } = await supabase
    .from('cities')
    .select('id, name, name_en')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

// ─── Banks (from DB) ──────────────────────────────────────────
export async function fetchBanks() {
  const { data, error } = await supabase
    .from('banks')
    .select('id, name_ar, name_en')
    .eq('is_active', true)
    .order('name_ar');
  if (error) throw error;
  return data || [];
}

// ─── Vendor fields (services) ─────────────────────────────────
export async function fetchVendorFields() {
  const { data: cats, error: cErr } = await supabase
    .from('vendor_fields')
    .select('id, name_ar, name_en, parent_id, display_order')
    .is('parent_id', null)
    .eq('is_active', true)
    .order('display_order');
  if (cErr) throw cErr;

  const { data: subs, error: sErr } = await supabase
    .from('vendor_fields')
    .select('id, name_ar, name_en, parent_id, display_order')
    .not('parent_id', 'is', null)
    .eq('is_active', true)
    .order('display_order');
  if (sErr) throw sErr;

  return (cats || []).map((c: any) => ({
    ...c,
    subcategories: (subs || []).filter((s: any) => s.parent_id === c.id),
  }));
}

// ─── Selected services ────────────────────────────────────────
export async function fetchSelectedServices(vendorId: string) {
  const { data, error } = await supabase
    .from('vendor_selected_fields')
    .select('id, field_id, rate_from, rate_to, currency, vendor_fields(id, name_ar, name_en, parent_id)')
    .eq('vendor_id', vendorId);
  if (error) throw error;
  return data || [];
}

// ─── Equipment ────────────────────────────────────────────────
export async function fetchVendorEquipment(vendorId: string) {
  const { data, error } = await supabase
    .from('vendor_equipment')
    .select(`
      id, vendor_id, serial_number, notes, quantity, created_at,
      catalog_item_id,
      equipment_catalog(id, name, name_en, image_url,
        equipment_categories(id, name, name_en),
        equipment_brands(id, name, name_en)
      )
    `)
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchEquipmentCatalog() {
  const { data, error } = await supabase
    .from('equipment_catalog')
    .select(`
      id, name, name_en, image_url,
      equipment_categories(id, name, name_en),
      equipment_brands(id, name, name_en)
    `)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchEquipmentCategories() {
  const { data, error } = await supabase
    .from('equipment_categories')
    .select('id, name, name_en')
    .order('name');
  if (error) throw error;
  return data || [];
}

// ─── Documents ────────────────────────────────────────────────
export async function fetchVendorDocuments(vendorId: string) {
  const { data, error } = await supabase
    .from('vendor_documents')
    .select('id, vendor_id, document_type, file_url, file_name, created_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Travel docs ──────────────────────────────────────────────
export async function fetchTravelDocs(vendorId: string) {
  const { data, error } = await supabase
    .from('vendor_travel_documents')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Projects ─────────────────────────────────────────────────
export async function fetchVendorProjects(vendorId: string) {
  const { data, error } = await supabase
    .from('vendor_invoices')
    .select(`
      id, amount_total, amount_paid, status, created_at,
      project:projects(id, name, status, start_date, end_date),
      client:clients(id, name)
    `)
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Invoices ─────────────────────────────────────────────────
export async function fetchVendorInvoices(vendorId: string) {
  const { data, error } = await supabase
    .from('vendor_invoices')
    .select(`
      id, amount_total, amount_paid, amount_remaining, status, due_date, created_at,
      project:projects(id, name),
      client:clients(id, name)
    `)
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Upload helper ────────────────────────────────────────────
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}
