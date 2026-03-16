import React, { useState, useEffect, useRef } from 'react';
import {
  User, Phone, Mail, CreditCard, Globe, Building2,
  Wrench, Landmark, Hash, ChevronDown, ChevronUp,
  Loader2, Upload, Pencil, X, Search, Check,
  Plane, FileText, Lock, Award, Paperclip, Trash2, Download, AlertTriangle, Image,
  MapPin, Briefcase, ToggleLeft, ToggleRight, Eye, Star,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useVendor } from '../../contexts/VendorContext';
import { useNotification } from '../../contexts/NotificationContext';
import { toEnglishNumbers } from '../../lib/numberUtils';
import { PageCard, TabButton, FieldLabel, TextInput, SelectInput, SaveButton, LoadingSpinner } from './shared';
import type { VendorField, SelectedField, FinancialData, Bank } from './shared/types';
import { ConfirmationModal } from '../shared/ConfirmationModal';
import { getNationalityItems, getCountryCodeItems } from '../../lib/shared-data';

interface City { id: string; name_ar: string; }

// Searchable dropdown — hides arrow in view mode
function SearchableSelect({ value, onChange, items, placeholder, disabled, compact }: {
  value: string; onChange: (v: string) => void;
  items: { value: string; label: string; prefix?: string }[];
  placeholder: string; disabled?: boolean; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = items.filter(i => i.label.includes(search) || i.value.includes(search));
  const selected = items.find(i => i.value === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(!open)} className="vp-inp"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'right',
          padding: compact ? '9px 10px' : '9px 14px',
          width: compact ? 'auto' : '100%', minWidth: compact ? 110 : undefined,
          borderRadius: compact ? '9px 0 0 9px' : 9,
          whiteSpace: 'nowrap', gap: 4,
        }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: compact ? '.78rem' : undefined }}>
          {selected ? (
            compact ? (<>{selected.prefix && <span>{selected.prefix}</span>} <span style={{ direction: 'ltr' }}>{selected.value}</span></>) : (<>{selected.prefix && <span>{selected.prefix}</span>} {selected.label}</>)
          ) : (<span style={{ color: 'var(--textMut)' }}>{placeholder}</span>)}
        </span>
        {!disabled && <ChevronDown size={compact ? 12 : 14} style={{ color: 'var(--textMut)', flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', zIndex: 50, marginTop: 4, borderRadius: 10, background: 'var(--cardSolid, var(--card))', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.3)', maxHeight: 240, overflow: 'hidden', display: 'flex', flexDirection: 'column', ...(compact ? { left: 0, width: 240 } : { right: 0, left: 0 }) }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={14} style={{ color: 'var(--textMut)', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." autoFocus
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--textPri)', fontFamily: 'Cairo, sans-serif', fontSize: '.82rem' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 12, textAlign: 'center', fontSize: '.78rem', color: 'var(--textMut)' }}>لا توجد نتائج</div>
            ) : filtered.map(item => (
              <button key={item.value} onClick={() => { onChange(item.value); setOpen(false); setSearch(''); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: value === item.value ? 'var(--tagBg)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: '.82rem', color: value === item.value ? 'var(--tagC)' : 'var(--textPri)', fontWeight: value === item.value ? 700 : 400, textAlign: 'right', transition: 'background .12s' }}
                onMouseEnter={e => { if (value !== item.value) e.currentTarget.style.background = 'var(--rowHover)'; }}
                onMouseLeave={e => { if (value !== item.value) e.currentTarget.style.background = 'transparent'; }}>
                {item.prefix && <span style={{ fontSize: '1rem' }}>{item.prefix}</span>}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function VendorProfile() {
  const { vendor, refreshVendor } = useVendor();
  const { showSuccess, showError } = useNotification();
  const [tab, setTab] = useState<'info' | 'services' | 'financial' | 'travel' | 'docs'>('info');

  // Info
  const [infoForm, setInfoForm] = useState({
    full_name: vendor?.full_name || '', phone: vendor?.phone || '', email: vendor?.email || '',
    nationality: vendor?.nationality || '', primary_city: vendor?.primary_city || '',
    id_number: vendor?.id_number || '',
    portfolio_url: (vendor as any)?.portfolio_url || '',
    vendor_type: vendor?.vendor_type || 'individual',
    available_other_cities: vendor?.available_other_cities || false,
    other_cities: vendor?.other_cities || [] as string[],
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const [savedInfo, setSavedInfo] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);

  // Sync infoForm when vendor data changes (after refreshVendor)
  useEffect(() => {
    if (!editingInfo && vendor) {
      setInfoForm({
        full_name: vendor.full_name || '', phone: vendor.phone || '', email: vendor.email || '',
        nationality: vendor.nationality || '', primary_city: vendor.primary_city || '',
        id_number: vendor.id_number || '',
        portfolio_url: (vendor as any)?.portfolio_url || '',
        vendor_type: vendor.vendor_type || 'individual',
        available_other_cities: vendor.available_other_cities || false,
        other_cities: vendor.other_cities || [],
      });
    }
  }, [vendor?.full_name, vendor?.phone, vendor?.nationality, vendor?.primary_city, vendor?.id_number, vendor?.vendor_type, vendor?.available_other_cities, vendor?.profile_image]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingIdImage, setUploadingIdImage] = useState(false);
  const [uploadingVehicleImage, setUploadingVehicleImage] = useState(false);
  const vehicleImageRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const idImageRef = useRef<HTMLInputElement>(null);

  // Passport number (stored in vendor_travel_documents)
  const [passportNumber, setPassportNumber] = useState('');

  // Services
  const [allFields, setAllFields] = useState<VendorField[]>([]);
  const [selectedFields, setSelectedFields] = useState<SelectedField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [savingFields, setSavingFields] = useState(false);
  const [savedFields, setSavedFields] = useState(false);
  const [editingServices, setEditingServices] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  // Financial
  const [financial, setFinancial] = useState<FinancialData>({ payment_method: 'bank_transfer', price_includes_tax: false, bank_name: '', beneficiary_name: '', iban: '', account_number: '' });
  const [banks, setBanks] = useState<Bank[]>([]);
  const [savingFin, setSavingFin] = useState(false);
  const [savedFin, setSavedFin] = useState(false);
  const [editingFin, setEditingFin] = useState(false);

  // Travel documents
  const [travelDocs, setTravelDocs] = useState<any[]>([]);
  const [uploadingTravel, setUploadingTravel] = useState(false);
  const travelRef = useRef<HTMLInputElement>(null);

  // Other documents
  const [otherDocs, setOtherDocs] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docType, setDocType] = useState('contract');
  const docRef = useRef<HTMLInputElement>(null);

  // Confirmation modal for deleting documents
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; docId: string | null; isTravelDoc: boolean }>({
    isOpen: false,
    docId: null,
    isTravelDoc: false,
  });

  // Cities from Supabase
  const [citiesList, setCitiesList] = useState<string[]>([]);

  useEffect(() => { if (vendor?.id) { fetchFields(); fetchFinancial(); fetchBanks(); fetchTravelDocs(); fetchOtherDocs(); fetchPassport(); fetchCities(); } }, [vendor?.id]);

  const FALLBACK_CITIES = ['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الظهران','الطائف','تبوك','بريدة','عنيزة','حائل','خميس مشيط','أبها','نجران','جازان','ينبع','الجبيل','القطيف','الأحساء','حفر الباطن','الخرج','سكاكا','عرعر','الباحة','العلا','رابغ','بيشة'];
  const fetchCities = async () => {
    const { data } = await supabase.from('cities').select('name').eq('is_active', true).order('name');
    setCitiesList(data && data.length > 0 ? data.map(c => c.name) : FALLBACK_CITIES);
  };
  const FALLBACK_BANKS: Bank[] = [
    { id: 'fb1', name_ar: 'البنك الأهلي السعودي', name_en: 'SNB' },
    { id: 'fb2', name_ar: 'بنك الراجحي', name_en: 'Al Rajhi Bank' },
    { id: 'fb3', name_ar: 'بنك الرياض', name_en: 'Riyad Bank' },
    { id: 'fb4', name_ar: 'بنك ساب', name_en: 'SABB' },
    { id: 'fb5', name_ar: 'البنك السعودي الفرنسي', name_en: 'BSF' },
    { id: 'fb6', name_ar: 'بنك البلاد', name_en: 'Bank AlBilad' },
    { id: 'fb7', name_ar: 'بنك الجزيرة', name_en: 'Bank AlJazira' },
    { id: 'fb8', name_ar: 'بنك الإنماء', name_en: 'Alinma Bank' },
    { id: 'fb9', name_ar: 'البنك العربي الوطني', name_en: 'ANB' },
    { id: 'fb10', name_ar: 'بنك السعودي للاستثمار', name_en: 'SAIB' },
  ];
  const fetchBanks = async () => {
    const { data } = await supabase.from('banks').select('id, name_ar, name_en').eq('is_active', true).order('name_ar');
    setBanks(data && data.length > 0 ? data : FALLBACK_BANKS);
  };
  const fetchFields = async () => {
    setLoadingFields(true);
    try {
      const [fieldsRes, selectedRes] = await Promise.all([
        supabase.from('vendor_fields').select('*').is('parent_id', null).eq('is_active', true).order('display_order'),
        supabase.from('vendor_selected_fields').select('*, vendor_fields(name_ar, name_en)').eq('vendor_id', vendor!.id),
      ]);
      if (fieldsRes.data) {
        const { data: subs } = await supabase.from('vendor_fields').select('*').not('parent_id', 'is', null).eq('is_active', true).order('display_order');
        setAllFields(fieldsRes.data.map(f => ({ ...f, subcategories: subs?.filter(s => s.parent_id === f.id) || [] })));
      }
      if (selectedRes.data) setSelectedFields(selectedRes.data as SelectedField[]);
    } catch (err) { console.error(err); }
    finally { setLoadingFields(false); }
  };
  const fetchFinancial = async () => { const { data } = await supabase.from('vendor_financial_data').select('*').eq('vendor_id', vendor!.id).maybeSingle(); if (data) setFinancial(data); };
  const fetchPassport = async () => {
    const { data } = await supabase.from('vendor_travel_documents').select('passport_number').eq('vendor_id', vendor!.id).maybeSingle();
    if (data?.passport_number) setPassportNumber(data.passport_number);
  };
  const uploadIdImage = async (file: File) => {
    if (!vendor?.id) return;
    const err = validateFile(file);
    if (err) { showError(err); return; }
    setUploadingIdImage(true);
    try {
      const path = `id_images/${vendor.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('vendor-images').upload(path, file, { upsert: true });
      if (upErr) { console.error('Storage upload error:', upErr); throw upErr; }
      const { data: { publicUrl } } = supabase.storage.from('vendor-images').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('vendors').update({ id_image: publicUrl, updated_at: new Date().toISOString() }).eq('id', vendor.id);
      if (dbErr) { console.error('DB update error:', dbErr); throw dbErr; }
      showSuccess('تم تحديث صورة الهوية');
      await refreshVendor();
    } catch (e) { console.error('uploadIdImage error:', e); showError('حدث خطأ أثناء رفع الصورة'); }
    finally { setUploadingIdImage(false); }
  };

  const uploadVehicleImage = async (file: File) => {
    if (!vendor?.id) return;
    const err = validateFile(file);
    if (err) { showError(err); return; }
    setUploadingVehicleImage(true);
    try {
      const path = `vehicle_images/${vendor.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('vendor-images').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('vendor-images').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('vendors').update({ vehicle_registration_image: publicUrl, updated_at: new Date().toISOString() }).eq('id', vendor.id);
      if (dbErr) throw dbErr;
      showSuccess('تم رفع صورة استمارة المركبة');
      await refreshVendor();
    } catch (e) { console.error('uploadVehicleImage error:', e); showError('حدث خطأ أثناء رفع الصورة'); }
    finally { setUploadingVehicleImage(false); }
  };

  const TRAVEL_TYPES = ['passport', 'visa', 'travel', 'visa_usa', 'visa_uk', 'visa_schengen', 'visa_japan'];
  const fetchTravelDocs = async () => {
    const { data } = await supabase.from('vendor_documents').select('*').eq('vendor_id', vendor!.id).in('document_type', TRAVEL_TYPES).order('created_at', { ascending: false });
    if (data) setTravelDocs(data);
  };
  const fetchOtherDocs = async () => {
    const { data } = await supabase.from('vendor_documents').select('*').eq('vendor_id', vendor!.id).order('created_at', { ascending: false });
    if (data) setOtherDocs(data.filter(d => !TRAVEL_TYPES.includes(d.document_type)));
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) return 'الملفات المسموحة: JPG, PNG, WebP, PDF';
    if (file.size > MAX_FILE_SIZE) return 'الحد الأقصى لحجم الملف 5 ميجابايت';
    return null;
  };

  const uploadDocument = async (file: File, type: string, isTravelDoc: boolean) => {
    if (!vendor?.id) return;
    const err = validateFile(file);
    if (err) { showError(err); return; }
    isTravelDoc ? setUploadingTravel(true) : setUploadingDoc(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `vendor-docs/${vendor.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('vendor-images').upload(path, file);
      if (upErr) { console.error('Storage upload error:', upErr); throw upErr; }
      const { data: { publicUrl } } = supabase.storage.from('vendor-images').getPublicUrl(path);
      // Don't send uploaded_by for vendors (they're not in the users table)
      const { error: dbErr } = await supabase.from('vendor_documents').insert({
        vendor_id: vendor.id,
        document_type: type,
        file_url: publicUrl,
        file_name: file.name,
      });
      if (dbErr) { console.error('DB insert error:', dbErr); throw dbErr; }
      showSuccess('تم رفع المستند بنجاح');
      isTravelDoc ? await fetchTravelDocs() : await fetchOtherDocs();
    } catch (e) { console.error('uploadDocument error:', e); showError('حدث خطأ أثناء رفع المستند'); }
    finally { isTravelDoc ? setUploadingTravel(false) : setUploadingDoc(false); }
  };

  const deleteDocument = async (id: string, isTravelDoc: boolean) => {
    setDeleteConfirm({ isOpen: true, docId: id, isTravelDoc });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.docId) return;

    const { error } = await supabase.from('vendor_documents').delete().eq('id', deleteConfirm.docId);
    if (!error) {
      showSuccess('تم الحذف');
      deleteConfirm.isTravelDoc
        ? setTravelDocs(prev => prev.filter(d => d.id !== deleteConfirm.docId))
        : setOtherDocs(prev => prev.filter(d => d.id !== deleteConfirm.docId));
    } else {
      showError('حدث خطأ أثناء الحذف');
    }

    setDeleteConfirm({ isOpen: false, docId: null, isTravelDoc: false });
  };

  const uploadProfileImage = async (file: File) => {
    if (!vendor?.id) return; setUploadingImage(true);
    try {
      const path = `profile_images/${vendor.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('vendor-images').upload(path, file, { upsert: true });
      if (upErr) { console.error('Storage upload error:', upErr); throw upErr; }
      const { data: { publicUrl } } = supabase.storage.from('vendor-images').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('vendors').update({ profile_image: publicUrl, updated_at: new Date().toISOString() }).eq('id', vendor.id);
      if (dbErr) { console.error('DB update error:', dbErr); throw dbErr; }
      showSuccess('تم تحديث الصورة'); await refreshVendor();
    } catch (e) { console.error('uploadProfileImage error:', e); showError('حدث خطأ أثناء رفع الصورة'); } finally { setUploadingImage(false); }
  };
  const saveInfo = async () => {
    setSavingInfo(true);
    try {
      // Only send fields that have values — don't overwrite with empty strings
      const payload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (infoForm.full_name) payload.full_name = infoForm.full_name;
      if (infoForm.phone) payload.phone = infoForm.phone;
      if (infoForm.nationality) payload.nationality = infoForm.nationality;
      if (infoForm.primary_city) payload.primary_city = infoForm.primary_city;
      if (infoForm.id_number) payload.id_number = infoForm.id_number;
      if (infoForm.vendor_type) payload.vendor_type = infoForm.vendor_type;
      if (infoForm.email) payload.email = infoForm.email;
      payload.portfolio_url = infoForm.portfolio_url || null;
      payload.available_other_cities = infoForm.available_other_cities;
      payload.other_cities = infoForm.other_cities;

      const { error } = await supabase.from('vendors').update(payload).eq('id', vendor!.id);
      if (error) throw error;
      showSuccess('تم حفظ البيانات');
      setSavedInfo(true); setEditingInfo(false);
      setTimeout(() => setSavedInfo(false), 2500);
      await refreshVendor();
    } catch (err: any) {
      console.error('Save error:', err);
      showError('حدث خطأ أثناء الحفظ');
    } finally { setSavingInfo(false); }
  };
  const toggleField = (fieldId: string) => {
    if (!editingServices) return;
    const exists = selectedFields.find(sf => sf.field_id === fieldId);
    if (exists) {
      setSelectedFields(prev => prev.filter(sf => sf.field_id !== fieldId));
    } else {
      // Find the field name from allFields
      let name_ar = '', name_en = '';
      for (const cat of allFields) {
        const sub = (cat.subcategories || []).find(s => s.id === fieldId);
        if (sub) { name_ar = sub.name_ar; name_en = sub.name_en || ''; break; }
      }
      setSelectedFields(prev => [...prev, { id: '', field_id: fieldId, rate_from: null, rate_to: null, currency: 'SAR', vendor_fields: { name_ar, name_en } }]);
    }
  };
  const updateRate = (fieldId: string, key: 'rate_from' | 'rate_to', val: string) => {
    setSelectedFields(prev => prev.map(sf => sf.field_id === fieldId ? { ...sf, [key]: val ? Number(toEnglishNumbers(val)) : null } : sf));
  };
  const saveServices = async () => {
    setSavingFields(true);
    try {
      // Delete old entries then insert new ones
      try {
        await supabase.from('vendor_selected_fields').delete().eq('vendor_id', vendor!.id);
      } catch (delErr) {
        console.warn('Delete error (non-blocking):', delErr);
      }

      if (selectedFields.length > 0) {
        const rows = selectedFields.map(sf => ({
          vendor_id: vendor!.id,
          field_id: sf.field_id,
          rate_from: sf.rate_from || 0,
          rate_to: sf.rate_to || 0,
          currency: 'SAR',
        }));
        const { error, data } = await supabase.from('vendor_selected_fields').insert(rows).select();
        if (error) {
          console.error('Insert error details:', JSON.stringify(error));
          throw error;
        }
        console.log('Inserted services:', data);
      }

      // Update primary_field on vendors table (first selected = main)
      const mainField = selectedFields[0];
      const fieldName = mainField?.vendor_fields?.name_ar || '';
      if (fieldName) {
        await supabase.from('vendors').update({ primary_field: fieldName, updated_at: new Date().toISOString() }).eq('id', vendor!.id).catch(() => {});
      }

      showSuccess('تم حفظ الخدمات');
      setSavedFields(true); setEditingServices(false);
      setTimeout(() => setSavedFields(false), 2500);
      await fetchFields();
      await refreshVendor();
    } catch (err: any) {
      console.error('Save services error:', err);
      showError(`خطأ: ${err?.message || err?.code || 'حدث خطأ أثناء حفظ الخدمات'}`);
    } finally { setSavingFields(false); }
  };
  const validateIBAN = (iban: string): string | null => {
    if (!iban) return null; // optional
    const clean = iban.replace(/\s/g, '').toUpperCase();
    if (!clean.startsWith('SA')) return 'رقم الآيبان يجب أن يبدأ بـ SA';
    if (clean.length !== 24) return `رقم الآيبان يجب أن يكون 24 حرف (حالياً ${clean.length})`;
    if (!/^SA\d{22}$/.test(clean)) return 'رقم الآيبان يجب أن يحتوي على SA متبوعاً بـ 22 رقم';
    return null;
  };
  const saveFinancial = async () => {
    // Validate IBAN before save
    const ibanErr = validateIBAN(financial.iban);
    if (ibanErr) { showError(ibanErr); return; }
    setSavingFin(true);
    try {
      const payload = { ...financial, vendor_id: vendor!.id, updated_at: new Date().toISOString() };
      if (financial.id) { await supabase.from('vendor_financial_data').update(payload).eq('id', financial.id); }
      else { const { data } = await supabase.from('vendor_financial_data').insert(payload).select().single(); if (data) setFinancial(data); }
      showSuccess('تم حفظ البيانات المالية'); setSavedFin(true); setEditingFin(false); setTimeout(() => setSavedFin(false), 2500);
    } catch { showError('حدث خطأ'); } finally { setSavingFin(false); }
  };

  const initials = vendor?.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('') || '?';
  const ibanDigits = (financial.iban.startsWith('SA') ? financial.iban.slice(2) : financial.iban).replace(/\D/g, '');
  const nationalityItems = getNationalityItems();
  const cityItems = citiesList.map(c => ({ value: c, label: c }));

  const EditBtn = ({ editing, onEdit, onCancel }: { editing: boolean; onEdit: () => void; onCancel: () => void }) => (
    !editing
      ? <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: 'var(--tagBg)', border: '1px solid var(--borderHi)', color: 'var(--tagC)', fontFamily: 'Cairo,sans-serif', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer' }}><Pencil size={13} /> تعديل</button>
      : <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', fontFamily: 'Cairo,sans-serif', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer' }}><X size={13} /> إلغاء</button>
  );

  // Group selected fields by parent category for services view
  const selectedByCategory = allFields.map(cat => ({
    ...cat,
    selected: (cat.subcategories || []).filter(s => selectedFields.find(sf => sf.field_id === s.id)),
  })).filter(cat => cat.selected.length > 0 || editingServices);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Profile header */}
      <PageCard style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          {vendor?.profile_image ? (
            <img src={vendor.profile_image} alt="" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', border: '2px solid var(--border)' }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>{initials}</div>
          )}
          <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadProfileImage(f); e.target.value = ''; }} />
          <button onClick={() => imageRef.current?.click()} disabled={uploadingImage} style={{ position: 'absolute', bottom: -4, left: -4, width: 26, height: 26, borderRadius: 8, background: '#3b82f6', border: '2px solid var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            {uploadingImage ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          </button>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--textPri)' }}>{vendor?.full_name || '—'}</span>
            <span style={{ padding: '2px 8px', borderRadius: 5, background: vendor?.vendor_type === 'company' ? 'rgba(139,92,246,0.12)' : 'var(--tagBg)', color: vendor?.vendor_type === 'company' ? '#8b5cf6' : 'var(--tagC)', fontSize: '.65rem', fontWeight: 700 }}>
              {vendor?.vendor_type === 'company' ? 'شركة' : 'فرد'}
            </span>
          </div>
          <div style={{ fontSize: '.78rem', color: 'var(--textMut)', marginTop: 2 }}>{vendor?.email}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--textMut)', marginTop: 1, display: 'flex', gap: 8 }}>
            {vendor?.primary_city && <span>{vendor.primary_city}</span>}
            {vendor?.nationality && <span>· {vendor.nationality}</span>}
          </div>
        </div>
      </PageCard>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
        <TabButton active={tab === 'info'} onClick={() => setTab('info')}><User size={14} /> البيانات الشخصية</TabButton>
        <TabButton active={tab === 'services'} onClick={() => setTab('services')}><Wrench size={14} /> الخدمات والتسعير</TabButton>
        <TabButton active={tab === 'financial'} onClick={() => setTab('financial')}><CreditCard size={14} /> البيانات المالية</TabButton>
        <TabButton active={tab === 'travel'} onClick={() => setTab('travel')}><Plane size={14} /> وثائق السفر</TabButton>
        <TabButton active={tab === 'docs'} onClick={() => setTab('docs')}><FileText size={14} /> المستندات</TabButton>
      </div>

      {/* ── INFO TAB ── */}
      {tab === 'info' && (
        <PageCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--textSec)' }}>البيانات الشخصية</span>
            <EditBtn editing={editingInfo} onEdit={() => setEditingInfo(true)} onCancel={() => { setEditingInfo(false); setInfoForm({ full_name: vendor?.full_name || '', phone: vendor?.phone || '', email: vendor?.email || '', nationality: vendor?.nationality || '', primary_city: vendor?.primary_city || '', id_number: vendor?.id_number || '', portfolio_url: (vendor as any)?.portfolio_url || '', vendor_type: vendor?.vendor_type || 'individual', country_code: (vendor as any)?.country_code || '+966', available_other_cities: vendor?.available_other_cities || false, other_cities: vendor?.other_cities || [] }); }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {/* Row 1: Name + Vendor Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><FieldLabel icon={User}>الاسم الكامل</FieldLabel><TextInput value={infoForm.full_name} onChange={(e: any) => setInfoForm(f => ({ ...f, full_name: e.target.value }))} placeholder="الاسم كما في الهوية" disabled={!editingInfo} /></div>
              <div>
                <FieldLabel icon={Briefcase}>نوع المورد</FieldLabel>
                {editingInfo ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ k: 'individual', l: 'فرد' }, { k: 'company', l: 'شركة' }].map(t => (
                      <button key={t.k} onClick={() => setInfoForm(f => ({ ...f, vendor_type: t.k }))} className={`vp-chip${infoForm.vendor_type === t.k ? ' active' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>
                        {t.l}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '9px 12px', borderRadius: 9, background: 'var(--inp)', border: '1px solid var(--inpBorder)', fontSize: '.82rem', color: 'var(--textPri)', opacity: 0.6 }}>
                    {infoForm.vendor_type === 'company' ? 'شركة' : 'فرد'}
                  </div>
                )}
              </div>
            </div>
            {/* Row 2: Phone with country code + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <FieldLabel icon={Phone}>رقم الجوال</FieldLabel>
                <div style={{ display: 'flex', gap: 0, direction: 'ltr' }}>
                  <SearchableSelect value={infoForm.country_code || '+966'} onChange={v => setInfoForm(f => ({ ...f, country_code: v }))} items={getCountryCodeItems()} placeholder="+966" disabled={!editingInfo} compact />
                  <div style={{ flex: 1 }}>
                    <input value={infoForm.phone} onChange={(e: any) => setInfoForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 9) }))} placeholder="512345678" dir="ltr" disabled={!editingInfo} className="vp-inp" style={{ borderRadius: '0 9px 9px 0', borderLeft: 'none' }} />
                  </div>
                </div>
                <div style={{ fontSize: '.63rem', color: 'var(--textMut)', marginTop: 3, textAlign: 'left' }}>{infoForm.phone.length}/9</div>
              </div>
              <div><FieldLabel icon={Mail}>البريد الإلكتروني</FieldLabel><TextInput value={infoForm.email} disabled placeholder="name@email.com" dir="ltr" /></div>
            </div>
            {/* Row 3: ID Number + Nationality */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><FieldLabel icon={CreditCard}>رقم الهوية</FieldLabel><TextInput value={infoForm.id_number} onChange={(e: any) => setInfoForm(f => ({ ...f, id_number: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="1234567890" dir="ltr" disabled={!editingInfo} /><div style={{ fontSize: '.63rem', color: 'var(--textMut)', marginTop: 3, textAlign: 'left' }}>{infoForm.id_number.length}/10</div></div>
              <div><FieldLabel icon={Globe}>الجنسية</FieldLabel><SearchableSelect value={infoForm.nationality} onChange={v => setInfoForm(f => ({ ...f, nationality: v }))} items={nationalityItems} placeholder="اختر الجنسية" disabled={!editingInfo} /></div>
            </div>
            {/* Row 4: City + ID Image */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><FieldLabel icon={Building2}>مدينة الإقامة</FieldLabel><SearchableSelect value={infoForm.primary_city} onChange={v => setInfoForm(f => ({ ...f, primary_city: v }))} items={cityItems} placeholder="اختر المدينة" disabled={!editingInfo} /></div>
              <div>
                <FieldLabel icon={Image}>صورة الهوية</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {(vendor as any)?.id_image && (
                    <a href={(vendor as any).id_image} target="_blank" rel="noopener noreferrer" className="vp-btn-ghost" style={{ fontSize: '.76rem', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Eye size={14} /> عرض
                    </a>
                  )}
                  {!editingInfo && !(vendor as any)?.id_image && (
                    <span style={{ fontSize: '.75rem', color: 'var(--textMut)' }}>لم يتم رفع صورة الهوية</span>
                  )}
                  {editingInfo && (
                    <>
                      <input ref={idImageRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadIdImage(f); e.target.value = ''; }} />
                      <button onClick={() => idImageRef.current?.click()} disabled={uploadingIdImage} className="vp-btn-primary" style={{ padding: '6px 12px', fontSize: '.74rem' }}>
                        {uploadingIdImage ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        {(vendor as any)?.id_image ? 'تحديث' : 'رفع'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Row 5: Other cities toggle + cities */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: editingInfo && infoForm.available_other_cities ? 8 : 0 }}>
                <FieldLabel icon={MapPin}>متاح للعمل في مدن أخرى</FieldLabel>
                <button
                  onClick={() => editingInfo && setInfoForm(f => ({ ...f, available_other_cities: !f.available_other_cities }))}
                  style={{ background: 'none', border: 'none', cursor: editingInfo ? 'pointer' : 'default', display: 'flex', color: infoForm.available_other_cities ? '#10b981' : 'var(--textMut)' }}
                >
                  {infoForm.available_other_cities ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                <span style={{ fontSize: '.72rem', color: infoForm.available_other_cities ? '#10b981' : 'var(--textMut)', fontWeight: 600 }}>
                  {infoForm.available_other_cities ? 'نعم' : 'لا'}
                </span>
              </div>
              {infoForm.available_other_cities && (
                <div style={{ animation: 'fadeUp .2s ease' }}>
                  {editingInfo ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto', padding: '8px 0' }}>
                      {citiesList.filter(c => c !== infoForm.primary_city).map(city => {
                        const isSel = infoForm.other_cities.includes(city);
                        return (
                          <button key={city} onClick={() => setInfoForm(f => ({ ...f, other_cities: isSel ? f.other_cities.filter(c => c !== city) : [...f.other_cities, city] }))}
                            className={`vp-chip${isSel ? ' active' : ''}`} style={{ fontSize: '.72rem', padding: '4px 10px' }}>
                            {isSel && <Check size={11} />} {city}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {(infoForm.other_cities || []).length === 0 ? (
                        <span style={{ fontSize: '.75rem', color: 'var(--textMut)' }}>لم يتم تحديد مدن</span>
                      ) : infoForm.other_cities.map(c => (
                        <span key={c} style={{ padding: '3px 10px', borderRadius: 6, background: 'var(--tagBg)', color: 'var(--tagC)', fontSize: '.72rem', fontWeight: 600 }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Row 6: Portfolio URL */}
            <div>
              <FieldLabel icon={Globe}>رابط البورتفوليو</FieldLabel>
              {editingInfo ? (
                <TextInput value={infoForm.portfolio_url} onChange={(e: any) => setInfoForm(f => ({ ...f, portfolio_url: e.target.value }))} placeholder="https://behance.net/yourname" dir="ltr" style={{ fontFamily: 'var(--font-mono)', textAlign: 'left' }} />
              ) : (
                infoForm.portfolio_url ? (
                  <a href={infoForm.portfolio_url} target="_blank" rel="noopener noreferrer" dir="ltr" style={{ fontSize: '.82rem', color: 'var(--accent, #3b82f6)', textDecoration: 'none', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                    {infoForm.portfolio_url}
                  </a>
                ) : (
                  <span style={{ fontSize: '.82rem', color: 'var(--textMut)' }}>—</span>
                )
              )}
            </div>
            {editingInfo && <SaveButton loading={savingInfo} saved={savedInfo} onClick={saveInfo} />}
          </div>
        </PageCard>
      )}

      {/* ── VEHICLE DATA (within info tab, controlled by editingInfo) ── */}
      {tab === 'info' && (
        <PageCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--textSec)' }}>🚗 صورة استمارة المركبة <span style={{ fontSize: '.68rem', color: 'var(--textMut)', fontWeight: 400 }}>(اختياري)</span></span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(vendor as any)?.vehicle_registration_image ? (
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
                <img
                  src={(vendor as any).vehicle_registration_image}
                  alt="استمارة المركبة"
                  style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
                />
                <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 6 }}>
                  <a href={(vendor as any).vehicle_registration_image} target="_blank" rel="noopener noreferrer"
                    className="vp-btn-ghost" style={{ padding: '4px 10px', fontSize: '.7rem', backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.5)' }}>
                    <Eye size={12} /> عرض
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 16px', borderRadius: 12, border: '2px dashed var(--border, rgba(255,255,255,0.1))', color: 'var(--textMut)' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🚗</div>
                <div style={{ fontSize: '.78rem' }}>لم يتم رفع صورة الاستمارة بعد</div>
              </div>
            )}
            {editingInfo && (
              <div>
                <input ref={vehicleImageRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadVehicleImage(f); e.target.value = ''; }} />
                <button onClick={() => vehicleImageRef.current?.click()} disabled={uploadingVehicleImage} className="vp-btn-primary" style={{ padding: '8px 16px', fontSize: '.78rem', width: '100%' }}>
                  {uploadingVehicleImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {(vendor as any)?.vehicle_registration_image ? 'تحديث الصورة' : 'رفع صورة الاستمارة'}
                </button>
              </div>
            )}
          </div>
        </PageCard>
      )}

      {/* ── SERVICES TAB — Redesigned UX ── */}
      {tab === 'services' && (
        <PageCard>
          {/* Portfolio link */}
          {(vendor as any)?.portfolio_url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 14, borderRadius: 10, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.12)' }}>
              <span style={{ fontSize: 14 }}>🔗</span>
              <span style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--textSec)' }}>البورتفوليو:</span>
              <a href={(vendor as any).portfolio_url} target="_blank" rel="noopener noreferrer" dir="ltr" style={{ fontSize: '.78rem', color: 'var(--accent, #3b82f6)', textDecoration: 'none', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(vendor as any).portfolio_url}
              </a>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--textSec)' }}>الخدمات والتسعير</span>
              <div style={{ fontSize: '.68rem', color: 'var(--textMut)', marginTop: 2 }}>{selectedFields.length} خدمة مختارة</div>
            </div>
            <EditBtn editing={editingServices} onEdit={() => {
      setEditingServices(true);
      // Auto-expand categories that have selections
      const expanded = new Set<string>();
      allFields.forEach(cat => { if ((cat.subcategories || []).some(s => selectedFields.find(sf => sf.field_id === s.id))) expanded.add(cat.id); });
      setExpandedCats(expanded);
    }} onCancel={() => { setEditingServices(false); fetchFields(); }} />
          </div>
          {loadingFields ? <LoadingSpinner /> : (
            <>
              {/* View mode: show selected as tag chips */}
              {!editingServices && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedFields.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--textMut)', fontSize: '.82rem' }}>لم يتم اختيار خدمات بعد — اضغط تعديل لإضافة خدماتك</div>
                  ) : (
                    allFields.filter(cat => (cat.subcategories || []).some(s => selectedFields.find(sf => sf.field_id === s.id))).map(cat => (
                      <div key={cat.id}>
                        <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--textMut)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>{cat.name_ar}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {(cat.subcategories || []).filter(s => selectedFields.find(sf => sf.field_id === s.id)).map(sub => {
                            const sf = selectedFields.find(f => f.field_id === sub.id);
                            const isMain = selectedFields.indexOf(sf!) === 0;
                            return (
                              <div key={sub.id} style={{ padding: '8px 14px', borderRadius: 10, background: isMain ? 'rgba(245,158,11,0.08)' : 'var(--tagBg)', border: `1px solid ${isMain ? 'rgba(245,158,11,0.3)' : 'var(--borderHi)'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                                {isMain ? <Star size={13} style={{ color: '#f59e0b' }} /> : <Check size={13} style={{ color: 'var(--tagC)' }} />}
                                <span style={{ fontSize: '.8rem', fontWeight: 600, color: isMain ? '#f59e0b' : 'var(--tagC)' }}>{sub.name_ar}</span>
                                {isMain && <span style={{ fontSize: '.62rem', padding: '1px 6px', borderRadius: 5, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700 }}>رئيسي</span>}
                                {sf?.rate_from && (
                                  <span style={{ fontSize: '.7rem', color: '#10b981', fontWeight: 600, direction: 'ltr' }}>
                                    {sf.rate_from}{sf.rate_to ? `–${sf.rate_to}` : ''} SAR
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Edit mode: selected services with main/secondary + category accordion */}
              {editingServices && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Selected services summary with main/secondary controls */}
                  {selectedFields.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--textMut)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>الخدمات المختارة ({selectedFields.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {selectedFields.map((sf, idx) => {
                          const fieldName = sf.vendor_fields?.name_ar || '';
                          const isMain = idx === 0; // First selected = main
                          return (
                            <div key={sf.field_id} style={{
                              padding: '10px 14px', borderRadius: 10,
                              border: `1px solid ${isMain ? 'rgba(245,158,11,0.3)' : 'var(--borderHi)'}`,
                              background: isMain ? 'rgba(245,158,11,0.08)' : 'var(--tagBg)',
                              display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: 6, fontSize: '.65rem', fontWeight: 700,
                                background: isMain ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.15)',
                                color: isMain ? '#f59e0b' : 'var(--textMut)',
                              }}>
                                {isMain ? 'رئيسي' : 'ثانوي'}
                              </span>
                              <span style={{ flex: 1, fontSize: '.82rem', fontWeight: 600, color: 'var(--textPri)' }}>{fieldName}</span>
                              {!isMain && (
                                <button
                                  onClick={() => {
                                    // Move this field to first position (make it main)
                                    setSelectedFields(prev => {
                                      const field = prev.find(f => f.field_id === sf.field_id);
                                      if (!field) return prev;
                                      return [field, ...prev.filter(f => f.field_id !== sf.field_id)];
                                    });
                                  }}
                                  title="تعيين كرئيسي"
                                  style={{
                                    background: 'none', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6,
                                    padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                    fontSize: '.68rem', fontWeight: 600, color: '#f59e0b',
                                  }}
                                >
                                  <Star size={11} /> رئيسي
                                </button>
                              )}
                              <button
                                onClick={() => toggleField(sf.field_id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--textMut)', padding: 2 }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category accordion */}
                  {allFields.map(cat => {
                    const selectedCount = (cat.subcategories || []).filter(s => selectedFields.find(sf => sf.field_id === s.id)).length;
                    const isExpanded = expandedCats.has(cat.id);
                    return (
                      <div key={cat.id} className="vp-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <button onClick={() => setExpandedCats(prev => { const next = new Set(prev); isExpanded ? next.delete(cat.id) : next.add(cat.id); return next; })} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo,sans-serif' }}>
                          <span style={{ fontSize: '.84rem', fontWeight: 700, color: 'var(--textPri)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {cat.name_ar}
                            {selectedCount > 0 && <span style={{ fontSize: '.65rem', padding: '2px 7px', borderRadius: 6, background: 'var(--tagBg)', color: 'var(--tagC)', fontWeight: 700 }}>{selectedCount}</span>}
                          </span>
                          {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--textMut)' }} /> : <ChevronDown size={16} style={{ color: 'var(--textMut)' }} />}
                        </button>
                        {isExpanded && (
                          <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(cat.subcategories || []).map(sub => {
                              const sel = selectedFields.find(sf => sf.field_id === sub.id);
                              return (
                                <div key={sub.id} style={{ borderRadius: 10, border: `1px solid ${sel ? 'var(--borderHi)' : 'var(--border)'}`, background: sel ? 'var(--tagBg)' : 'transparent', overflow: 'hidden', transition: 'all .18s' }}>
                                  <div onClick={() => toggleField(sub.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}>
                                    <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: sel ? '#3b82f6' : 'transparent', border: `2px solid ${sel ? '#3b82f6' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                                      {sel && <Check size={12} style={{ color: 'white' }} />}
                                    </div>
                                    <span style={{ flex: 1, fontSize: '.84rem', fontWeight: sel ? 600 : 400, color: sel ? 'var(--tagC)' : 'var(--textSec)' }}>{sub.name_ar}</span>
                                    {sel?.rate_from && <span style={{ fontSize: '.72rem', color: '#10b981', fontWeight: 600 }}>{sel.rate_from}{sel.rate_to ? `–${sel.rate_to}` : ''} SAR</span>}
                                  </div>
                                  {sel && (
                                    <div style={{ padding: '0 14px 10px', display: 'flex', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                                      <div style={{ flex: 1 }}><div style={{ fontSize: '.68rem', color: 'var(--textMut)', marginBottom: 3 }}>من (SAR)</div><TextInput value={sel.rate_from ?? ''} onChange={(e: any) => { e.stopPropagation(); updateRate(sub.id, 'rate_from', e.target.value); }} placeholder="0" dir="ltr" type="number" /></div>
                                      <div style={{ flex: 1 }}><div style={{ fontSize: '.68rem', color: 'var(--textMut)', marginBottom: 3 }}>إلى (SAR)</div><TextInput value={sel.rate_to ?? ''} onChange={(e: any) => { e.stopPropagation(); updateRate(sub.id, 'rate_to', e.target.value); }} placeholder="0" dir="ltr" type="number" /></div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ paddingTop: 6 }}><SaveButton loading={savingFields} saved={savedFields} onClick={saveServices} /></div>
                </div>
              )}
            </>
          )}
        </PageCard>
      )}

      {/* ── FINANCIAL TAB ── */}
      {tab === 'financial' && (
        <PageCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--textSec)' }}>البيانات المالية</span>
            <EditBtn editing={editingFin} onEdit={() => setEditingFin(true)} onCancel={() => { setEditingFin(false); fetchFinancial(); }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div><FieldLabel icon={Landmark}>اسم البنك</FieldLabel><SearchableSelect value={financial.bank_name} onChange={v => setFinancial(f => ({ ...f, bank_name: v }))} items={banks.map(b => ({ value: b.name_ar, label: b.name_ar }))} placeholder="اختر البنك" disabled={!editingFin} /></div>
            <div><FieldLabel icon={User}>اسم المستفيد</FieldLabel><TextInput value={financial.beneficiary_name} onChange={(e: any) => setFinancial(f => ({ ...f, beneficiary_name: e.target.value }))} placeholder="كما في كشف الحساب" disabled={!editingFin} /></div>
            <div>
              <FieldLabel icon={Hash}>رقم الآيبان (SA + 22 رقم)</FieldLabel>
              <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', border: '1px solid var(--border)', direction: 'ltr', opacity: editingFin ? 1 : 0.6 }}>
                <div style={{ padding: '0 11px', background: 'var(--tagBg)', borderLeft: '1px solid var(--borderHi)', display: 'flex', alignItems: 'center', flexShrink: 0 }}><span style={{ fontSize: '.84rem', fontWeight: 800, color: 'var(--tagC)' }}>SA</span></div>
                <input value={ibanDigits} maxLength={22} disabled={!editingFin} onChange={e => setFinancial(f => ({ ...f, iban: 'SA' + e.target.value.replace(/\D/g, '').slice(0, 22) }))} placeholder="0380000000608010167519" dir="ltr" style={{ flex: 1, padding: '9px 12px', background: 'var(--inp)', border: 'none', color: 'var(--textPri)', fontFamily: 'Cairo,sans-serif', fontSize: '.82rem', outline: 'none', letterSpacing: '.04em' }} />
                <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', fontSize: '.65rem', color: 'var(--textMut)', flexShrink: 0 }}>{ibanDigits.length}/22</div>
              </div>
            </div>
            <div><FieldLabel icon={CreditCard}>طريقة الدفع</FieldLabel><SearchableSelect value={financial.payment_method} onChange={v => setFinancial(f => ({ ...f, payment_method: v }))} items={[{ value: 'bank_transfer', label: 'تحويل بنكي' }, { value: 'cash', label: 'نقدي' }, { value: 'other', label: 'أخرى' }]} placeholder="اختر طريقة الدفع" disabled={!editingFin} /></div>
            {/* Price includes tax */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FieldLabel>السعر يشمل الضريبة (VAT)</FieldLabel>
              <button
                onClick={() => editingFin && setFinancial(f => ({ ...f, price_includes_tax: !f.price_includes_tax }))}
                style={{ background: 'none', border: 'none', cursor: editingFin ? 'pointer' : 'default', display: 'flex', color: financial.price_includes_tax ? '#10b981' : 'var(--textMut)' }}
              >
                {financial.price_includes_tax ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
              </button>
              <span style={{ fontSize: '.72rem', color: financial.price_includes_tax ? '#10b981' : 'var(--textMut)', fontWeight: 600 }}>
                {financial.price_includes_tax ? 'نعم' : 'لا'}
              </span>
            </div>
            {editingFin && <SaveButton loading={savingFin} saved={savedFin} onClick={saveFinancial} />}
          </div>
        </PageCard>
      )}

      {/* ── TRAVEL DOCUMENTS TAB ── */}
      {tab === 'travel' && <TravelDocsTab vendor={vendor} travelDocs={travelDocs} uploadingTravel={uploadingTravel} travelRef={travelRef} uploadDocument={uploadDocument} deleteDocument={deleteDocument} passportNumber={passportNumber} setPassportNumber={setPassportNumber} />}

      {/* ── OTHER DOCUMENTS TAB ── */}
      {tab === 'docs' && <OtherDocsTab vendor={vendor} otherDocs={otherDocs} uploadingDoc={uploadingDoc} docType={docType} setDocType={setDocType} docRef={docRef} uploadDocument={uploadDocument} deleteDocument={deleteDocument} />}

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, docId: null, isTravelDoc: false })}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TRAVEL DOCUMENTS TAB
// ─────────────────────────────────────────────────────────────
const VISA_TYPES = [
  { k: 'visa_usa', label: 'تأشيرة أمريكا', flag: '🇺🇸' },
  { k: 'visa_uk', label: 'تأشيرة بريطانيا', flag: '🇬🇧' },
  { k: 'visa_schengen', label: 'تأشيرة شنغن', flag: '🇪🇺' },
  { k: 'visa_japan', label: 'تأشيرة اليابان', flag: '🇯🇵' },
];

function TravelDocsTab({ vendor, travelDocs, uploadingTravel, travelRef, uploadDocument, deleteDocument, passportNumber, setPassportNumber }: any) {
  const [travelType, setTravelType] = useState('passport');
  const [selectedVisa, setSelectedVisa] = useState('visa_usa');
  const [editingPassport, setEditingPassport] = useState(false);
  const [savingPassport, setSavingPassport] = useState(false);
  const { showSuccess, showError } = useNotification();

  const currentType = travelType === 'passport' ? 'passport' : selectedVisa;
  const typeLabels: Record<string, string> = {
    passport: 'جواز سفر', visa_usa: '🇺🇸 تأشيرة أمريكا', visa_uk: '🇬🇧 تأشيرة بريطانيا',
    visa_schengen: '🇪🇺 تأشيرة شنغن', visa_japan: '🇯🇵 تأشيرة اليابان',
  };

  const savePassport = async () => {
    setSavingPassport(true);
    try {
      const { data: existing } = await supabase.from('vendor_travel_documents').select('id').eq('vendor_id', vendor.id).maybeSingle();
      if (existing) {
        await supabase.from('vendor_travel_documents').update({ passport_number: passportNumber }).eq('id', existing.id);
      } else {
        await supabase.from('vendor_travel_documents').insert({ vendor_id: vendor.id, passport_number: passportNumber });
      }
      showSuccess('تم حفظ رقم جواز السفر');
      setEditingPassport(false);
    } catch { showError('حدث خطأ'); }
    finally { setSavingPassport(false); }
  };

  return (
    <PageCard>
      <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--textSec)', marginBottom: 6 }}>وثائق السفر</div>
      <div style={{ fontSize: '.72rem', color: 'var(--textMut)', marginBottom: 14 }}>جواز السفر، التأشيرات، وتصاريح السفر</div>

      {/* Passport number */}
      <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--statBg)', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <FieldLabel icon={Hash}>رقم جواز السفر</FieldLabel>
          {!editingPassport ? (
            <button onClick={() => setEditingPassport(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tagC)', fontSize: '.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Pencil size={11} /> تعديل</button>
          ) : (
            <button onClick={() => setEditingPassport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><X size={11} /> إلغاء</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TextInput value={passportNumber} onChange={(e: any) => setPassportNumber(e.target.value)} placeholder="رقم جواز السفر" dir="ltr" disabled={!editingPassport} />
          {editingPassport && (
            <button onClick={savePassport} disabled={savingPassport} className="vp-btn-primary" style={{ padding: '8px 14px', fontSize: '.76rem', flexShrink: 0 }}>
              {savingPassport ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} حفظ
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--statBg)', border: '1px solid var(--border)', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <AlertTriangle size={15} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '.72rem', color: 'var(--textMut)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--textSec)' }}>تعليمات الرفع:</strong><br />
          • الصيغ المسموحة: JPG, PNG, WebP, PDF<br />
          • الحد الأقصى لحجم الملف: 5 ميجابايت<br />
          • تأكد من وضوح الصورة وظهور جميع البيانات
        </div>
      </div>

      {/* Passport or Visa */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={() => setTravelType('passport')} className={`vp-chip${travelType === 'passport' ? ' active' : ''}`}><Plane size={13} /> جواز سفر</button>
        <button onClick={() => setTravelType('visa')} className={`vp-chip${travelType === 'visa' ? ' active' : ''}`}><FileText size={13} /> تأشيرة</button>
      </div>

      {/* Visa country selector */}
      {travelType === 'visa' && (
        <div style={{ marginBottom: 12, animation: 'fadeUp .2s ease' }}>
          <FieldLabel>نوع التأشيرة</FieldLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {VISA_TYPES.map(v => (
              <button key={v.k} onClick={() => setSelectedVisa(v.k)} className={`vp-chip${selectedVisa === v.k ? ' active' : ''}`}>
                <span style={{ fontSize: '1rem' }}>{v.flag}</span> {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload */}
      <input ref={travelRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadDocument(f, currentType, true); e.target.value = ''; }} />
      <button onClick={() => travelRef.current?.click()} disabled={uploadingTravel} className="vp-btn-primary" style={{ padding: '8px 16px', fontSize: '.78rem', marginBottom: 16 }}>
        {uploadingTravel ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploadingTravel ? 'جارٍ الرفع...' : `رفع ${travelType === 'passport' ? 'جواز السفر' : typeLabels[selectedVisa] || 'تأشيرة'}`}
      </button>

      {/* List */}
      {travelDocs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--textMut)', fontSize: '.82rem' }}>لا توجد وثائق سفر مرفوعة</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {travelDocs.map((doc: any) => (
            <div key={doc.id} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--rowHover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {doc.document_type === 'passport' ? <Plane size={15} style={{ color: '#06b6d4' }} /> : <FileText size={15} style={{ color: '#06b6d4' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--textPri)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</div>
                <div style={{ fontSize: '.67rem', color: 'var(--textMut)', marginTop: 1 }}>{typeLabels[doc.document_type] || doc.document_type} · {new Date(doc.created_at).toLocaleDateString('en-US')}</div>
              </div>
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="vp-btn-ghost" style={{ fontSize: '.76rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }} title="عرض">
                <Eye size={14} /> عرض
              </a>
              <button onClick={() => deleteDocument(doc.id, true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px 6px', borderRadius: 5, display: 'flex' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </PageCard>
  );
}

// ─────────────────────────────────────────────────────────────
// OTHER DOCUMENTS TAB
// ─────────────────────────────────────────────────────────────
const DOC_TYPES_LIST = [
  { k: 'contract', l: 'عقد', Icon: FileText, color: '#3b82f6' },
  { k: 'nda', l: 'NDA', Icon: Lock, color: '#8b5cf6' },
  { k: 'certificate', l: 'شهادة', Icon: Award, color: '#f59e0b' },
  { k: 'other', l: 'أخرى', Icon: Paperclip, color: '#64748b' },
];

function OtherDocsTab({ otherDocs, uploadingDoc, docType, setDocType, docRef, uploadDocument, deleteDocument }: any) {
  const [customName, setCustomName] = useState('');
  const { showError } = useNotification();

  return (
    <PageCard>
      <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--textSec)', marginBottom: 6 }}>المستندات</div>
      <div style={{ fontSize: '.72rem', color: 'var(--textMut)', marginBottom: 14 }}>العقود، الشهادات، وأي مستندات أخرى</div>

      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--statBg)', border: '1px solid var(--border)', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Image size={15} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '.72rem', color: 'var(--textMut)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--textSec)' }}>تعليمات الرفع:</strong><br />
          • الصيغ المسموحة: JPG, PNG, WebP, PDF<br />
          • الحد الأقصى لحجم الملف: 5 ميجابايت<br />
          • اختر نوع المستند قبل الرفع
        </div>
      </div>

      {/* Type selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {DOC_TYPES_LIST.map(dt => (
          <button key={dt.k} onClick={() => { setDocType(dt.k); if (dt.k !== 'other') setCustomName(''); }} className={`vp-chip${docType === dt.k ? ' active' : ''}`}>
            <dt.Icon size={13} /> {dt.l}
          </button>
        ))}
      </div>

      {/* Custom name when "other" */}
      {docType === 'other' && (
        <div style={{ marginBottom: 12, animation: 'fadeUp .2s ease' }}>
          <FieldLabel>اسم المستند *</FieldLabel>
          <TextInput value={customName} onChange={(e: any) => setCustomName(e.target.value)} placeholder="مثال: شهادة تدريب، رخصة قيادة..." />
        </div>
      )}

      {/* Upload */}
      <input ref={docRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) uploadDocument(f, docType === 'other' ? `other:${customName.trim()}` : docType, false);
          e.target.value = '';
        }} />
      <button onClick={() => {
        if (docType === 'other' && !customName.trim()) { showError('أدخل اسم المستند أولاً'); return; }
        docRef.current?.click();
      }} disabled={uploadingDoc} className="vp-btn-primary" style={{ padding: '8px 16px', fontSize: '.78rem', marginBottom: 16 }}>
        {uploadingDoc ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploadingDoc ? 'جارٍ الرفع...' : 'اختر ملفاً لرفعه'}
      </button>

      {/* List */}
      {otherDocs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--textMut)', fontSize: '.82rem' }}>لا توجد مستندات مرفوعة</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {otherDocs.map((doc: any) => {
            const isCustom = doc.document_type?.startsWith('other:');
            const customLabel = isCustom ? doc.document_type.replace('other:', '') : null;
            const t = DOC_TYPES_LIST.find(d => d.k === doc.document_type) || DOC_TYPES_LIST[3];
            return (
              <div key={doc.id} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, transition: 'background .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--rowHover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: `${t.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <t.Icon size={15} style={{ color: t.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--textPri)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customLabel || doc.file_name}</div>
                  <div style={{ fontSize: '.67rem', color: 'var(--textMut)', marginTop: 1 }}>{isCustom ? 'أخرى' : t.l} · {new Date(doc.created_at).toLocaleDateString('en-US')}</div>
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="vp-btn-ghost" style={{ fontSize: '.76rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }} title="عرض">
                <Eye size={14} /> عرض
              </a>
                <button onClick={() => deleteDocument(doc.id, false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px 6px', borderRadius: 5, display: 'flex' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>
      )}
    </PageCard>
  );
}
