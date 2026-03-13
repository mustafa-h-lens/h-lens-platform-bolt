import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// ─────────────────────────────────────────────────────────────
// Banks
// ─────────────────────────────────────────────────────────────
export interface Bank { id: string; name_ar: string; name_en: string; }

export function useBanks() {
  const [banks, setBanks]   = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('banks').select('id, name_ar, name_en').eq('is_active', true).order('name_ar')
      .then(({ data }) => { if (data) setBanks(data); setLoading(false); });
  }, []);

  return { banks, loading };
}

// ─────────────────────────────────────────────────────────────
// Cities
// ─────────────────────────────────────────────────────────────
export interface City { id: string; name: string; name_en?: string; region?: string; }

export function useCities() {
  const [cities, setCities]   = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('cities').select('id, name, name_en, region').eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setCities(data); setLoading(false); });
  }, []);

  return { cities, loading };
}

// ─────────────────────────────────────────────────────────────
// Vendor Fields (services catalog)
// ─────────────────────────────────────────────────────────────
export interface VendorField {
  id: string; name_ar: string; name_en: string;
  parent_id: string | null; display_order: number;
  subcategories?: VendorField[];
}

export function useVendorFields() {
  const [fields, setFields]   = useState<VendorField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [cats, subs] = await Promise.all([
        supabase.from('vendor_fields').select('*').is('parent_id', null).eq('is_active', true).order('display_order'),
        supabase.from('vendor_fields').select('*').not('parent_id', 'is', null).eq('is_active', true).order('display_order'),
      ]);
      if (cats.data) {
        setFields(cats.data.map(c => ({
          ...c,
          subcategories: subs.data?.filter(s => s.parent_id === c.id) || [],
        })));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { fields, loading };
}

// ─────────────────────────────────────────────────────────────
// Equipment catalog
// ─────────────────────────────────────────────────────────────
export interface CatalogItem {
  id: string; name: string; name_en: string | null;
  image_url: string | null; category_id: string | null; brand_id: string | null;
  equipment_categories?: { id: string; name: string };
  equipment_brands?: { id: string; name: string };
}

export function useEquipmentCatalog() {
  const [catalog, setCatalog]   = useState<CatalogItem[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase.from('equipment_catalog')
      .select('id, name, name_en, image_url, category_id, brand_id, equipment_categories(id, name), equipment_brands(id, name)')
      .eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setCatalog(data as CatalogItem[]); setLoading(false); });
  }, []);

  return { catalog, loading };
}

// ─────────────────────────────────────────────────────────────
// Equipment categories
// ─────────────────────────────────────────────────────────────
export interface EquipmentCategory { id: string; name: string; }

export function useEquipmentCategories() {
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);

  useEffect(() => {
    supabase.from('equipment_categories').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setCategories(data); });
  }, []);

  return { categories };
}

// ─────────────────────────────────────────────────────────────
// Vendor selected fields (services + rates)
// ─────────────────────────────────────────────────────────────
export interface SelectedField {
  id: string; field_id: string; rate_from: number | null; rate_to: number | null;
  currency: string;
  vendor_fields?: { name_ar: string; name_en: string };
}

export function useSelectedFields(vendorId: string) {
  const [fields, setFields]   = useState<SelectedField[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    const { data } = await supabase
      .from('vendor_selected_fields')
      .select('*, vendor_fields(name_ar, name_en)')
      .eq('vendor_id', vendorId);
    if (data) setFields(data as SelectedField[]);
    setLoading(false);
  }, [vendorId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { fields, loading, refetch: fetch };
}

// ─────────────────────────────────────────────────────────────
// Vendor equipment
// ─────────────────────────────────────────────────────────────
export interface VendorEquipment {
  id: string; vendor_id: string; catalog_item_id: string | null;
  name: string; type: string; serial_number: string | null; quantity: number;
  created_at: string;
  equipment_catalog?: { name: string; image_url: string | null; equipment_categories?: { name: string } };
}

export function useVendorEquipment(vendorId: string) {
  const [equipment, setEquipment] = useState<VendorEquipment[]>([]);
  const [loading, setLoading]     = useState(true);

  const fetch = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    const { data } = await supabase
      .from('vendor_equipment')
      .select('*, equipment_catalog(name, image_url, equipment_categories(name))')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });
    if (data) setEquipment(data as VendorEquipment[]);
    setLoading(false);
  }, [vendorId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { equipment, loading, refetch: fetch };
}

// ─────────────────────────────────────────────────────────────
// Vendor documents
// ─────────────────────────────────────────────────────────────
export interface VendorDocument {
  id: string; vendor_id: string;
  document_type: string; file_url: string; file_name: string;
  created_at: string;
}

export function useVendorDocuments(vendorId: string) {
  const [docs, setDocs]       = useState<VendorDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    const { data } = await supabase
      .from('vendor_documents')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });
    if (data) setDocs(data);
    setLoading(false);
  }, [vendorId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { docs, loading, refetch: fetch };
}

// ─────────────────────────────────────────────────────────────
// Vendor invoices
// ─────────────────────────────────────────────────────────────
export interface VendorInvoice {
  id: string; vendor_id: string; project_id: string; client_id: string;
  amount_total: number; amount_paid: number; amount_remaining: number;
  status: string; due_date?: string; created_at: string;
  project?: { name: string }; client?: { name: string };
}

export function useVendorInvoices(vendorId: string) {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetch = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    const { data } = await supabase
      .from('vendor_invoices')
      .select('*, project:projects(name), client:clients(name)')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });
    if (data) setInvoices(data as VendorInvoice[]);
    setLoading(false);
  }, [vendorId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { invoices, loading, refetch: fetch };
}

// ─────────────────────────────────────────────────────────────
// Vendor dashboard stats
// ─────────────────────────────────────────────────────────────
export interface DashboardStats {
  projectsCount: number; clientsCount: number;
  totalAmount: number; paidAmount: number; unpaidAmount: number;
}

export function useVendorStats(vendorId: string) {
  const [stats, setStats]     = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorId) return;
    const fetch = async () => {
      const { data: invoices } = await supabase
        .from('vendor_invoices').select('*').eq('vendor_id', vendorId);

      const projectIds = new Set(invoices?.map(i => i.project_id) || []);
      const clientIds  = new Set(invoices?.map(i => i.client_id) || []);
      const total  = invoices?.reduce((s, i) => s + Number(i.amount_total || 0), 0) || 0;
      const paid   = invoices?.reduce((s, i) => s + Number(i.amount_paid  || 0), 0) || 0;

      setStats({ projectsCount: projectIds.size, clientsCount: clientIds.size, totalAmount: total, paidAmount: paid, unpaidAmount: total - paid });
      setLoading(false);
    };
    fetch();
  }, [vendorId]);

  return { stats, loading };
}

// ─────────────────────────────────────────────────────────────
// Vendor financial data
// ─────────────────────────────────────────────────────────────
export interface FinancialData {
  id?: string; vendor_id?: string;
  payment_method: 'bank_transfer' | 'cash' | 'other';
  price_includes_tax: boolean;
  bank_id?: string | null;
  beneficiary_name?: string;
  iban?: string;
  account_number?: string;
  banks?: { name_ar: string };
}

export function useVendorFinancial(vendorId: string) {
  const [data, setData]       = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    const { data: fd } = await supabase
      .from('vendor_financial_data')
      .select('*, banks(name_ar)')
      .eq('vendor_id', vendorId)
      .maybeSingle();
    if (fd) setData(fd as FinancialData);
    setLoading(false);
  }, [vendorId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
}

// ─────────────────────────────────────────────────────────────
// Travel documents
// ─────────────────────────────────────────────────────────────
export interface TravelDoc {
  id: string; vendor_id: string;
  document_type: 'passport' | 'visa';
  passport_number?: string; passport_issuing_country?: string;
  passport_issue_date?: string; passport_expiry_date?: string; passport_file?: string;
  visa_country?: string; visa_type?: string;
  visa_start_date?: string; visa_expiry_date?: string;
  visa_file?: string; visa_status?: string;
  created_at: string; updated_at: string;
}

export function useTravelDocs(vendorId: string) {
  const [passport, setPassport] = useState<TravelDoc | null>(null);
  const [visas, setVisas]       = useState<TravelDoc[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetch = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    const { data } = await supabase
      .from('vendor_travel_documents').select('*').eq('vendor_id', vendorId);
    setPassport(data?.find(d => d.document_type === 'passport') || null);
    setVisas(data?.filter(d => d.document_type === 'visa') || []);
    setLoading(false);
  }, [vendorId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { passport, visas, loading, refetch: fetch };
}
