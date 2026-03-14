import React, { useState, useEffect, useRef } from 'react';
import {
  User, Phone, Mail, CreditCard, Globe, Building2,
  Wrench, Landmark, Hash, ChevronDown, ChevronUp,
  Loader2, Upload, Pencil, X, Search, Check,
  Plane, FileText, Lock, Award, Paperclip, Trash2, Download, AlertTriangle, Image,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useVendor } from '../../contexts/VendorContext';
import { useNotification } from '../../contexts/NotificationContext';
import { toEnglishNumbers } from '../../lib/numberUtils';
import { PageCard, TabButton, FieldLabel, TextInput, SelectInput, SaveButton, LoadingSpinner } from './shared';
import type { VendorField, SelectedField, FinancialData, Bank } from './shared/types';

// Countries — Saudi → Gulf → Arab → Islamic/Asian → Western → African (no Israel)
const COUNTRIES = [
  { flag: '🇸🇦', name: 'السعودية' },
  { flag: '🇦🇪', name: 'الإمارات' }, { flag: '🇰🇼', name: 'الكويت' }, { flag: '🇶🇦', name: 'قطر' },
  { flag: '🇧🇭', name: 'البحرين' }, { flag: '🇴🇲', name: 'عُمان' },
  { flag: '🇪🇬', name: 'مصر' }, { flag: '🇯🇴', name: 'الأردن' }, { flag: '🇱🇧', name: 'لبنان' },
  { flag: '🇮🇶', name: 'العراق' }, { flag: '🇸🇾', name: 'سوريا' }, { flag: '🇵🇸', name: 'فلسطين' },
  { flag: '🇾🇪', name: 'اليمن' }, { flag: '🇸🇩', name: 'السودان' }, { flag: '🇱🇾', name: 'ليبيا' },
  { flag: '🇹🇳', name: 'تونس' }, { flag: '🇩🇿', name: 'الجزائر' }, { flag: '🇲🇦', name: 'المغرب' },
  { flag: '🇲🇷', name: 'موريتانيا' }, { flag: '🇸🇴', name: 'الصومال' }, { flag: '🇩🇯', name: 'جيبوتي' },
  { flag: '🇰🇲', name: 'جزر القمر' },
  { flag: '🇹🇷', name: 'تركيا' }, { flag: '🇮🇷', name: 'إيران' }, { flag: '🇵🇰', name: 'باكستان' },
  { flag: '🇦🇫', name: 'أفغانستان' }, { flag: '🇮🇳', name: 'الهند' }, { flag: '🇧🇩', name: 'بنغلاديش' },
  { flag: '🇱🇰', name: 'سريلانكا' }, { flag: '🇳🇵', name: 'نيبال' }, { flag: '🇲🇲', name: 'ميانمار' },
  { flag: '🇹🇭', name: 'تايلاند' }, { flag: '🇻🇳', name: 'فيتنام' }, { flag: '🇵🇭', name: 'الفلبين' },
  { flag: '🇮🇩', name: 'إندونيسيا' }, { flag: '🇲🇾', name: 'ماليزيا' }, { flag: '🇸🇬', name: 'سنغافورة' },
  { flag: '🇨🇳', name: 'الصين' }, { flag: '🇯🇵', name: 'اليابان' }, { flag: '🇰🇷', name: 'كوريا الجنوبية' },
  { flag: '🇬🇧', name: 'بريطانيا' }, { flag: '🇺🇸', name: 'أمريكا' }, { flag: '🇨🇦', name: 'كندا' },
  { flag: '🇫🇷', name: 'فرنسا' }, { flag: '🇩🇪', name: 'ألمانيا' }, { flag: '🇮🇹', name: 'إيطاليا' },
  { flag: '🇪🇸', name: 'إسبانيا' }, { flag: '🇵🇹', name: 'البرتغال' }, { flag: '🇳🇱', name: 'هولندا' },
  { flag: '🇧🇪', name: 'بلجيكا' }, { flag: '🇨🇭', name: 'سويسرا' }, { flag: '🇦🇹', name: 'النمسا' },
  { flag: '🇸🇪', name: 'السويد' }, { flag: '🇳🇴', name: 'النرويج' }, { flag: '🇩🇰', name: 'الدنمارك' },
  { flag: '🇫🇮', name: 'فنلندا' }, { flag: '🇵🇱', name: 'بولندا' }, { flag: '🇬🇷', name: 'اليونان' },
  { flag: '🇷🇺', name: 'روسيا' }, { flag: '🇺🇦', name: 'أوكرانيا' }, { flag: '🇷🇴', name: 'رومانيا' },
  { flag: '🇦🇺', name: 'أستراليا' }, { flag: '🇳🇿', name: 'نيوزيلندا' },
  { flag: '🇧🇷', name: 'البرازيل' }, { flag: '🇦🇷', name: 'الأرجنتين' }, { flag: '🇲🇽', name: 'المكسيك' },
  { flag: '🇨🇴', name: 'كولومبيا' }, { flag: '🇨🇱', name: 'تشيلي' },
  { flag: '🇿🇦', name: 'جنوب أفريقيا' }, { flag: '🇳🇬', name: 'نيجيريا' }, { flag: '🇰🇪', name: 'كينيا' },
  { flag: '🇪🇹', name: 'إثيوبيا' }, { flag: '🇬🇭', name: 'غانا' }, { flag: '🇹🇿', name: 'تنزانيا' },
  { flag: '🇺🇬', name: 'أوغندا' }, { flag: '🇷🇼', name: 'رواندا' }, { flag: '🇲🇬', name: 'مدغشقر' },
];

// All KSA cities
const KSA_CITIES = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'الظهران',
  'الطائف', 'تبوك', 'بريدة', 'عنيزة', 'حائل', 'خميس مشيط', 'أبها', 'نجران', 'جازان',
  'ينبع', 'الجبيل', 'القطيف', 'الأحساء', 'الهفوف', 'حفر الباطن', 'الخرج', 'أملج',
  'سكاكا', 'عرعر', 'الباحة', 'بيشة', 'رابغ', 'الدوادمي', 'المجمعة', 'شقراء',
  'وادي الدواسر', 'الزلفي', 'رفحاء', 'طريف', 'القريات', 'تيماء', 'العلا', 'ضباء',
  'الوجه', 'ليلى', 'الرس', 'البكيرية', 'المذنب', 'عفيف', 'الدرعية', 'رماح',
  'ثادق', 'حوطة بني تميم', 'الحريق', 'المزاحمية', 'ضرماء', 'القويعية', 'ساجر',
  'الطوال', 'صبيا', 'أحد المسارحة', 'العيدابي', 'بيش', 'الريث', 'ضمد', 'أحد رفيدة',
  'محايل عسير', 'سراة عبيدة', 'رجال ألمع', 'النماص', 'تنومة', 'البلسمر', 'المندق',
  'القنفذة', 'الليث', 'أضم', 'العرضيات', 'المخواة',
];

interface City { id: string; name_ar: string; }

// Searchable dropdown — hides arrow in view mode
function SearchableSelect({ value, onChange, items, placeholder, disabled }: {
  value: string; onChange: (v: string) => void;
  items: { value: string; label: string; prefix?: string }[];
  placeholder: string; disabled?: boolean;
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
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'right', padding: '9px 14px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {selected ? (<>{selected.prefix && <span>{selected.prefix}</span>} {selected.label}</>) : (<span style={{ color: 'var(--textMut)' }}>{placeholder}</span>)}
        </span>
        {!disabled && <ChevronDown size={14} style={{ color: 'var(--textMut)', flexShrink: 0, marginRight: 4 }} />}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 50, marginTop: 4, borderRadius: 10, background: 'var(--cardSolid, var(--card))', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.3)', maxHeight: 240, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
  const [infoForm, setInfoForm] = useState({ full_name: vendor?.full_name || '', phone: vendor?.phone || '', email: vendor?.email || '', nationality: vendor?.nationality || '', primary_city: vendor?.primary_city || '', id_number: vendor?.id_number || '', portfolio_url: (vendor as any)?.portfolio_url || '' });
  const [savingInfo, setSavingInfo] = useState(false);
  const [savedInfo, setSavedInfo] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (vendor?.id) {
      // Sync infoForm with latest vendor data
      setInfoForm({
        full_name: vendor?.full_name || '',
        phone: vendor?.phone || '',
        email: vendor?.email || '',
        nationality: vendor?.nationality || '',
        primary_city: vendor?.primary_city || '',
        id_number: vendor?.id_number || '',
        portfolio_url: (vendor as any)?.portfolio_url || ''
      });
      fetchFields();
      fetchFinancial();
      fetchBanks();
      fetchTravelDocs();
      fetchOtherDocs();
    }
  }, [vendor?.id, vendor?.nationality, vendor?.primary_city, vendor?.full_name, vendor?.phone]);

  const fetchBanks = async () => { const { data } = await supabase.from('banks').select('id, name_ar, name_en').eq('is_active', true).order('name_ar'); if (data) setBanks(data); };
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
      const path = `vendor-docs/${vendor.id}/${type}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('vendor-images').upload(path, file);
      if (upErr) {
        console.error('Storage upload error:', upErr);
        throw upErr;
      }
      const { data: { publicUrl } } = supabase.storage.from('vendor-images').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('vendor_documents').insert({
        vendor_id: vendor.id,
        document_type: type,
        file_url: publicUrl,
        file_name: file.name,
        uploaded_by: vendor.id,
      });
      if (dbErr) {
        console.error('Database insert error:', dbErr);
        throw dbErr;
      }
      showSuccess('تم رفع المستند بنجاح');
      isTravelDoc ? await fetchTravelDocs() : await fetchOtherDocs();
    } catch (error) {
      console.error('Upload error:', error);
      showError('حدث خطأ أثناء رفع المستند');
    }
    finally { isTravelDoc ? setUploadingTravel(false) : setUploadingDoc(false); }
  };

  const deleteDocument = async (id: string, isTravelDoc: boolean) => {
    const { error } = await supabase.from('vendor_documents').delete().eq('id', id);
    if (!error) {
      showSuccess('تم الحذف');
      isTravelDoc ? setTravelDocs(prev => prev.filter(d => d.id !== id)) : setOtherDocs(prev => prev.filter(d => d.id !== id));
    } else showError('حدث خطأ أثناء الحذف');
  };

  const uploadProfileImage = async (file: File) => {
    if (!vendor?.id) return; setUploadingImage(true);
    try {
      const path = `profile_images/${vendor.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('vendor-images').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('vendor-images').getPublicUrl(path);
      await supabase.from('vendors').update({ profile_image: publicUrl, updated_at: new Date().toISOString() }).eq('id', vendor.id);
      showSuccess('تم تحديث الصورة'); await refreshVendor();
    } catch { showError('حدث خطأ أثناء رفع الصورة'); } finally { setUploadingImage(false); }
  };
  const saveInfo = async () => {
    setSavingInfo(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          full_name: infoForm.full_name,
          phone: infoForm.phone,
          nationality: infoForm.nationality,
          primary_city: infoForm.primary_city,
          id_number: infoForm.id_number,
          portfolio_url: infoForm.portfolio_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', vendor!.id);

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      showSuccess('تم حفظ البيانات');
      setSavedInfo(true);
      setEditingInfo(false);
      setTimeout(() => setSavedInfo(false), 2500);
      await refreshVendor();
    }
    catch (err) {
      console.error('Error saving info:', err);
      showError('حدث خطأ في حفظ البيانات');
    } finally {
      setSavingInfo(false);
    }
  };
  const toggleField = (fieldId: string) => {
    if (!editingServices) return;
    const exists = selectedFields.find(sf => sf.field_id === fieldId);
    if (exists) setSelectedFields(prev => prev.filter(sf => sf.field_id !== fieldId));
    else setSelectedFields(prev => [...prev, { id: '', field_id: fieldId, rate_from: null, rate_to: null, currency: 'SAR', vendor_fields: { name_ar: '', name_en: '' } }]);
  };
  const updateRate = (fieldId: string, key: 'rate_from' | 'rate_to', val: string) => {
    setSelectedFields(prev => prev.map(sf => sf.field_id === fieldId ? { ...sf, [key]: val ? Number(toEnglishNumbers(val)) : null } : sf));
  };
  const saveServices = async () => {
    setSavingFields(true);
    try {
      await supabase.from('vendor_selected_fields').delete().eq('vendor_id', vendor!.id);
      if (selectedFields.length > 0) { const { error } = await supabase.from('vendor_selected_fields').insert(selectedFields.map(sf => ({ vendor_id: vendor!.id, field_id: sf.field_id, rate_from: sf.rate_from, rate_to: sf.rate_to, currency: 'SAR' }))); if (error) throw error; }
      showSuccess('تم حفظ الخدمات'); setSavedFields(true); setEditingServices(false); setTimeout(() => setSavedFields(false), 2500); await fetchFields();
    } catch { showError('حدث خطأ'); } finally { setSavingFields(false); }
  };
  const saveFinancial = async () => {
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
  const nationalityItems = COUNTRIES.map(c => ({ value: c.name, label: c.name, prefix: c.flag }));
  const cityItems = KSA_CITIES.map(c => ({ value: c, label: c }));

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
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--textPri)' }}>{vendor?.full_name || '—'}</div>
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
            <EditBtn editing={editingInfo} onEdit={() => setEditingInfo(true)} onCancel={() => { setEditingInfo(false); setInfoForm({ full_name: vendor?.full_name || '', phone: vendor?.phone || '', email: vendor?.email || '', nationality: vendor?.nationality || '', primary_city: vendor?.primary_city || '', id_number: vendor?.id_number || '', portfolio_url: (vendor as any)?.portfolio_url || '' }); }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><FieldLabel icon={User}>الاسم الكامل</FieldLabel><TextInput value={infoForm.full_name} onChange={(e: any) => setInfoForm(f => ({ ...f, full_name: e.target.value }))} placeholder="الاسم كما في الهوية" disabled={!editingInfo} /></div>
              <div><FieldLabel icon={Phone}>رقم الجوال</FieldLabel><TextInput value={infoForm.phone} onChange={(e: any) => setInfoForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="05XXXXXXXX\" dir="ltr\" disabled={!editingInfo} /><div style={{ fontSize: '.63rem', color: 'var(--textMut)', marginTop: 3, textAlign: \'left' }}>{infoForm.phone.length}/10</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><FieldLabel icon={Mail}>البريد الإلكتروني</FieldLabel><TextInput value={infoForm.email} disabled placeholder="name@email.com" dir="ltr" /></div>
              <div><FieldLabel icon={CreditCard}>رقم الهوية</FieldLabel><TextInput value={infoForm.id_number} onChange={(e: any) => setInfoForm(f => ({ ...f, id_number: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="1XXXXXXXXX\" dir="ltr\" disabled={!editingInfo} /><div style={{ fontSize: '.63rem', color: 'var(--textMut)', marginTop: 3, textAlign: 'left' }}>{infoForm.id_number.length}/10</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><FieldLabel icon={Globe}>الجنسية</FieldLabel><SearchableSelect value={infoForm.nationality} onChange={v => setInfoForm(f => ({ ...f, nationality: v }))} items={nationalityItems} placeholder="اختر الجنسية" disabled={!editingInfo} /></div>
              <div><FieldLabel icon={Building2}>مدينة الإقامة</FieldLabel><SearchableSelect value={infoForm.primary_city} onChange={v => setInfoForm(f => ({ ...f, primary_city: v }))} items={cityItems} placeholder="اختر المدينة" disabled={!editingInfo} /></div>
            </div>
            <div>
              <FieldLabel icon={Globe}>رابط الأعمال / Portfolio</FieldLabel>
              <TextInput value={infoForm.portfolio_url || ''} onChange={(e: any) => setInfoForm(f => ({ ...f, portfolio_url: e.target.value }))} placeholder="https://your-portfolio.com" dir="ltr" disabled={!editingInfo} />
            </div>
            {editingInfo && <SaveButton loading={savingInfo} saved={savedInfo} onClick={saveInfo} />}
          </div>
        </PageCard>
      )}

      {/* ── SERVICES TAB — Redesigned UX ── */}
      {tab === 'services' && (
        <PageCard>
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
                            return (
                              <div key={sub.id} style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--tagBg)', border: '1px solid var(--borderHi)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Check size={13} style={{ color: 'var(--tagC)' }} />
                                <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--tagC)' }}>{sub.name_ar}</span>
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

              {/* Edit mode: category accordion with checkboxes */}
              {editingServices && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
            <div><FieldLabel icon={Landmark}>اسم البنك</FieldLabel><SelectInput value={financial.bank_name} onChange={(e: any) => setFinancial(f => ({ ...f, bank_name: e.target.value }))} disabled={!editingFin}><option value="">اختر البنك</option>{banks.map(b => <option key={b.id} value={b.name_ar}>{b.name_ar}</option>)}</SelectInput></div>
            <div><FieldLabel icon={User}>اسم المستفيد</FieldLabel><TextInput value={financial.beneficiary_name} onChange={(e: any) => setFinancial(f => ({ ...f, beneficiary_name: e.target.value }))} placeholder="كما في كشف الحساب" disabled={!editingFin} /></div>
            <div>
              <FieldLabel icon={Hash}>رقم الآيبان (SA + 22 رقم)</FieldLabel>
              <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', border: '1px solid var(--border)', direction: 'ltr', opacity: editingFin ? 1 : 0.6 }}>
                <div style={{ padding: '0 11px', background: 'var(--tagBg)', borderLeft: '1px solid var(--borderHi)', display: 'flex', alignItems: 'center', flexShrink: 0 }}><span style={{ fontSize: '.84rem', fontWeight: 800, color: 'var(--tagC)' }}>SA</span></div>
                <input value={ibanDigits} maxLength={22} disabled={!editingFin} onChange={e => setFinancial(f => ({ ...f, iban: 'SA' + e.target.value.replace(/\D/g, '').slice(0, 22) }))} placeholder="0380000000608010167519\" dir="ltr\" style={{ flex: 1, padding: '9px 12px', background: 'var(--inp)', border: 'none', color: 'var(--textPri)', fontFamily: 'Cairo,sans-serif', fontSize: '.82rem', outline: 'none', letterSpacing: '.04em' }} />
                <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', fontSize: '.65rem', color: 'var(--textMut)', flexShrink: 0 }}>{ibanDigits.length}/22</div>
              </div>
            </div>
            <div><FieldLabel icon={CreditCard}>طريقة الدفع</FieldLabel><SelectInput value={financial.payment_method} onChange={(e: any) => setFinancial(f => ({ ...f, payment_method: e.target.value }))} disabled={!editingFin}><option value="bank_transfer">تحويل بنكي</option><option value="cash">نقدي</option><option value="other">أخرى</option></SelectInput></div>
            {editingFin && <SaveButton loading={savingFin} saved={savedFin} onClick={saveFinancial} />}
          </div>
        </PageCard>
      )}

      {/* ── TRAVEL DOCUMENTS TAB ── */}
      {tab === 'travel' && <TravelDocsTab vendor={vendor} travelDocs={travelDocs} uploadingTravel={uploadingTravel} travelRef={travelRef} uploadDocument={uploadDocument} deleteDocument={deleteDocument} />}

      {/* ── OTHER DOCUMENTS TAB ── */}
      {tab === 'docs' && <OtherDocsTab vendor={vendor} otherDocs={otherDocs} uploadingDoc={uploadingDoc} docType={docType} setDocType={setDocType} docRef={docRef} uploadDocument={uploadDocument} deleteDocument={deleteDocument} />}

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

function TravelDocsTab({ travelDocs, uploadingTravel, travelRef, uploadDocument, deleteDocument }: any) {
  const [travelType, setTravelType] = useState('passport');
  const [selectedVisa, setSelectedVisa] = useState('visa_usa');

  const currentType = travelType === 'passport' ? 'passport' : selectedVisa;
  const typeLabels: Record<string, string> = {
    passport: 'جواز سفر', visa_usa: '🇺🇸 تأشيرة أمريكا', visa_uk: '🇬🇧 تأشيرة بريطانيا',
    visa_schengen: '🇪🇺 تأشيرة شنغن', visa_japan: '🇯🇵 تأشيرة اليابان',
  };

  return (
    <PageCard>
      <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--textSec)', marginBottom: 6 }}>وثائق السفر</div>
      <div style={{ fontSize: '.72rem', color: 'var(--textMut)', marginBottom: 14 }}>جواز السفر، التأشيرات، وتصاريح السفر</div>

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
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', display: 'flex', padding: '4px 6px' }} title="عرض"><Download size={15} /></a>
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
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', display: 'flex', padding: '4px 6px' }} title="عرض"><Download size={15} /></a>
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
