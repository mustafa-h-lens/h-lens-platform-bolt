import { useState, useRef } from 'react';
import { Camera, Upload } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useVendor } from '../../../contexts/VendorContext';
import { useNotification } from '../../../contexts/NotificationContext';
import {
  useVT, VCard, FL, TInput, TSelect, VField, SaveBtn, EditBtn, CancelBtn,
  TabBtn, Grid2, FormRow, SectionTitle, SkeletonCard,
} from '../shared/UI';
import {
  useBanks, useCities, useVendorFields, useSelectedFields, useVendorFinancial,
  SelectedField,
} from '../../../hooks/useVendorData';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import { CheckCircle, Plus, Trash2, Search } from 'lucide-react';

type Tab = 'personal' | 'financial' | 'services';

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
export function VendorProfile() {
  const [tab, setTab] = useState<Tab>('personal');
  const t = useVT();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      {/* Tabs row */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${t.border.default}` }}>
        <TabBtn active={tab === 'personal'}  onClick={() => setTab('personal')}>👤 البيانات الشخصية</TabBtn>
        <TabBtn active={tab === 'financial'} onClick={() => setTab('financial')}>💳 البيانات المالية</TabBtn>
        <TabBtn active={tab === 'services'}  onClick={() => setTab('services')}>🛠 الخدمات والتسعير</TabBtn>
      </div>

      {tab === 'personal'  && <PersonalTab />}
      {tab === 'financial' && <FinancialTab />}
      {tab === 'services'  && <ServicesTab />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PERSONAL TAB
// ─────────────────────────────────────────────────────────────
function PersonalTab() {
  const { vendor, refreshVendor } = useVendor();
  const { showSuccess, showError } = useNotification();
  const { cities, loading: loadingCities } = useCities();
  const t = useVT();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const [form, setForm] = useState({
    full_name:              vendor?.full_name || '',
    phone:                  vendor?.phone || '',
    email:                  vendor?.email || '',
    id_number:              vendor?.id_number || '',
    nationality:            vendor?.nationality || '',
    primary_city:           vendor?.primary_city || '',
    available_other_cities: vendor?.available_other_cities || false,
    other_cities:           vendor?.other_cities || [] as string[],
    profile_image:          vendor?.profile_image || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = 'الاسم مطلوب';
    if (form.phone && !/^05\d{8}$/.test(form.phone)) e.phone = 'رقم جوال غير صحيح (05XXXXXXXX)';
    if (form.id_number && !/^\d{10}$/.test(form.id_number)) e.id_number = 'رقم هوية غير صحيح (10 أرقام)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const uploadProfileImage = async (file: File) => {
    setUploadingImg(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `profiles/${vendor!.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('vendor-documents').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('vendor-documents').getPublicUrl(path);
      setForm(f => ({ ...f, profile_image: publicUrl }));
    } catch {
      showError('فشل رفع الصورة');
    } finally {
      setUploadingImg(false);
    }
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('vendors').update({
        full_name: form.full_name,
        phone:     form.phone,
        email:     form.email || null,
        id_number: form.id_number || null,
        nationality: form.nationality || null,
        primary_city: form.primary_city || null,
        available_other_cities: form.available_other_cities,
        other_cities: form.other_cities,
        profile_image: form.profile_image || null,
        updated_at: new Date().toISOString(),
      }).eq('id', vendor!.id);
      if (error) throw error;
      showSuccess('تم حفظ البيانات الشخصية');
      setSaved(true); setTimeout(() => setSaved(false), 2500);
      setEditing(false);
      await refreshVendor();
    } catch {
      showError('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setForm({
      full_name: vendor?.full_name || '', phone: vendor?.phone || '',
      email: vendor?.email || '', id_number: vendor?.id_number || '',
      nationality: vendor?.nationality || '', primary_city: vendor?.primary_city || '',
      available_other_cities: vendor?.available_other_cities || false,
      other_cities: vendor?.other_cities || [],
      profile_image: vendor?.profile_image || '',
    });
    setErrors({});
    setEditing(false);
  };

  const toggleCity = (name: string) => {
    setForm(f => ({
      ...f,
      other_cities: f.other_cities.includes(name)
        ? f.other_cities.filter(c => c !== name)
        : [...f.other_cities, name],
    }));
  };

  return (
    <VCard>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <SectionTitle>البيانات الشخصية</SectionTitle>
        {!editing
          ? <EditBtn onClick={() => setEditing(true)} />
          : <div style={{ display: 'flex', gap: 8 }}>
              <CancelBtn onClick={cancel} />
              <SaveBtn loading={saving} saved={saved} onClick={save} />
            </div>
        }
      </div>

      {/* Profile image */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: form.profile_image ? 'transparent' : 'linear-gradient(135deg,#1d4ed8,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 800, color: 'white', overflow: 'hidden',
            border: `3px solid ${t.border.default}`,
          }}>
            {form.profile_image
              ? <img src={form.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : vendor?.full_name?.split(' ').slice(0,2).map(w => w[0]).join('')
            }
          </div>
          {editing && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingImg}
              style={{
                position: 'absolute', bottom: 0, left: 0,
                width: 26, height: 26, borderRadius: '50%',
                background: t.primary.main, border: `2px solid ${t.background.card}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Camera size={13} color="white" />
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadProfileImage(f); e.target.value = ''; }} />
        </div>
      </div>

      {/* ── VIEW MODE ── */}
      {!editing ? (
        <FormRow>
          <Grid2>
            <VField label="الاسم الكامل"    value={vendor?.full_name} />
            <VField label="رقم الجوال"      value={vendor?.phone} dir="ltr" />
            <VField label="البريد الإلكتروني" value={vendor?.email} dir="ltr" />
            <VField label="رقم الهوية"      value={vendor?.id_number} dir="ltr" />
            <VField label="الجنسية"         value={vendor?.nationality} />
            <VField label="مدينة العمل"     value={vendor?.primary_city} />
          </Grid2>
          <VField label="نوع الحساب" value={vendor?.vendor_type} />
          {vendor?.available_other_cities && (
            <div>
              <div style={{ fontSize: '0.72rem', color: t.text.muted, fontWeight: 700, marginBottom: 6 }}>المدن الأخرى</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(vendor.other_cities || []).map(c => (
                  <span key={c} style={{ padding: '3px 10px', borderRadius: 6, background: t.primary.light, color: t.primary.main, fontSize: '0.75rem', fontWeight: 600 }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </FormRow>
      ) : (
        /* ── EDIT MODE ── */
        <FormRow>
          <Grid2>
            <div><FL required>الاسم الكامل</FL><TInput value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} placeholder="الاسم كما في الهوية" error={errors.full_name} /></div>
            <div><FL>رقم الجوال</FL><TInput value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v.replace(/\D/g,'').slice(0,10) }))} placeholder="05XXXXXXXX" dir="ltr" error={errors.phone} /></div>
            <div><FL>البريد الإلكتروني</FL><TInput value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="name@email.com" dir="ltr" /></div>
            <div><FL>رقم الهوية</FL><TInput value={form.id_number} onChange={v => setForm(f => ({ ...f, id_number: toEnglishNumbers(v).replace(/\D/g,'').slice(0,10) }))} placeholder="1XXXXXXXXX" dir="ltr" error={errors.id_number} /></div>
            <div><FL>الجنسية</FL><TInput value={form.nationality} onChange={v => setForm(f => ({ ...f, nationality: v }))} /></div>
            <div>
              <FL>مدينة العمل الأساسية</FL>
              <TSelect value={form.primary_city} onChange={v => setForm(f => ({ ...f, primary_city: v }))}>
                <option value="">اختر مدينة</option>
                {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </TSelect>
            </div>
          </Grid2>

          {/* نوع الحساب — عرض فقط */}
          <div>
            <FL>نوع الحساب</FL>
            <div style={{ padding: '0.5625rem 0.75rem', borderRadius: 9, background: t.background.filter, border: `1px solid ${t.border.default}`, fontSize: '0.83rem', color: t.text.muted }}>
              {vendor?.vendor_type || '—'} <span style={{ fontSize: '0.68rem', color: t.text.muted }}>(لا يمكن تغييره)</span>
            </div>
          </div>

          {/* Other cities */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <input type="checkbox" id="avail" checked={form.available_other_cities} onChange={e => setForm(f => ({ ...f, available_other_cities: e.target.checked }))} />
              <label htmlFor="avail" style={{ fontSize: '0.83rem', color: t.text.secondary, cursor: 'pointer' }}>متاح للعمل في مدن أخرى</label>
            </div>
            {form.available_other_cities && !loadingCities && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px', borderRadius: 9, border: `1px solid ${t.border.default}`, background: t.background.filter, maxHeight: 160, overflowY: 'auto' }}>
                {cities.filter(c => c.name !== form.primary_city).map(c => {
                  const sel = form.other_cities.includes(c.name);
                  return (
                    <button key={c.id} onClick={() => toggleCity(c.name)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${sel ? t.primary.main : t.border.default}`, background: sel ? t.primary.light : 'transparent', color: sel ? t.primary.main : t.text.secondary, fontSize: '0.75rem', fontWeight: sel ? 700 : 400, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}>
                      {sel && '✓ '}{c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </FormRow>
      )}
    </VCard>
  );
}

// ─────────────────────────────────────────────────────────────
// FINANCIAL TAB
// ─────────────────────────────────────────────────────────────
function FinancialTab() {
  const { vendor } = useVendor();
  const { showSuccess, showError } = useNotification();
  const { banks, loading: loadingBanks } = useBanks();
  const { data: financial, loading, refetch } = useVendorFinancial(vendor?.id || '');
  const t = useVT();

  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  const emptyForm = { bank_id: '', beneficiary_name: '', iban: '', price_includes_tax: false };
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const startEdit = () => {
    setForm({
      bank_id: financial?.bank_id || '',
      beneficiary_name: financial?.beneficiary_name || '',
      iban: financial?.iban?.startsWith('SA') ? financial.iban.slice(2) : (financial?.iban || ''),
      price_includes_tax: financial?.price_includes_tax || false,
    });
    setErrors({});
    setEditing(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.bank_id) e.bank_id = 'اختر البنك';
    if (!form.beneficiary_name.trim()) e.beneficiary_name = 'اسم المستفيد مطلوب';
    if (form.iban && !/^\d{22}$/.test(form.iban)) e.iban = 'الآيبان يجب أن يكون SA + 22 رقم';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        vendor_id: vendor!.id,
        payment_method: 'bank_transfer' as const,
        bank_id: form.bank_id || null,
        beneficiary_name: form.beneficiary_name,
        iban: form.iban ? `SA${form.iban}` : null,
        price_includes_tax: form.price_includes_tax,
        updated_at: new Date().toISOString(),
      };
      if (financial?.id) {
        const { error } = await supabase.from('vendor_financial_data').update(payload).eq('id', financial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vendor_financial_data').insert(payload);
        if (error) throw error;
      }
      showSuccess('تم حفظ البيانات المالية');
      setSaved(true); setTimeout(() => setSaved(false), 2500);
      setEditing(false);
      await refetch();
    } catch {
      showError('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SkeletonCard rows={4} />;

  return (
    <VCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <SectionTitle>البيانات المالية</SectionTitle>
        {!editing
          ? <EditBtn onClick={startEdit} />
          : <div style={{ display: 'flex', gap: 8 }}>
              <CancelBtn onClick={() => setEditing(false)} />
              <SaveBtn loading={saving} saved={saved} onClick={save} />
            </div>
        }
      </div>

      {!editing ? (
        <FormRow>
          <Grid2>
            <VField label="طريقة الدفع" value="تحويل بنكي" />
            <VField label="البنك" value={financial?.banks?.name_ar || '—'} />
            <VField label="اسم المستفيد" value={financial?.beneficiary_name} />
            <VField label="رقم الآيبان" value={financial?.iban} dir="ltr" />
          </Grid2>
          <VField label="السعر" value={financial?.price_includes_tax ? 'شامل الضريبة' : 'بدون ضريبة'} />
        </FormRow>
      ) : (
        <FormRow>
          <div>
            <FL>طريقة الدفع</FL>
            <div style={{ padding: '0.5625rem 0.75rem', borderRadius: 9, background: t.background.filter, border: `1px solid ${t.border.default}`, fontSize: '0.83rem', color: t.text.muted }}>
              تحويل بنكي <span style={{ fontSize: '0.68rem' }}>(طريقة الدفع الثابتة)</span>
            </div>
          </div>
          <Grid2>
            <div>
              <FL required>البنك</FL>
              <TSelect value={form.bank_id} onChange={v => setForm(f => ({ ...f, bank_id: v }))} error={errors.bank_id}>
                <option value="">اختر البنك</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
              </TSelect>
            </div>
            <div>
              <FL required>اسم المستفيد</FL>
              <TInput value={form.beneficiary_name} onChange={v => setForm(f => ({ ...f, beneficiary_name: v }))} placeholder="كما في كشف الحساب" error={errors.beneficiary_name} />
            </div>
          </Grid2>
          <div>
            <FL>رقم الآيبان</FL>
            <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', border: `1px solid ${errors.iban ? t.status.error.main : t.border.default}`, direction: 'ltr' }}>
              <div style={{ padding: '0 11px', background: 'rgba(37,99,235,0.1)', borderLeft: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: t.primary.main, fontSize: '0.84rem' }}>SA</span>
              </div>
              <input
                value={form.iban}
                maxLength={22}
                onChange={e => setForm(f => ({ ...f, iban: e.target.value.replace(/\D/g,'').slice(0,22) }))}
                placeholder="0380000000608010167519"
                dir="ltr"
                style={{ flex: 1, padding: '0.5625rem 0.75rem', background: t.background.input, border: 'none', color: t.text.primary, fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem', outline: 'none' }}
              />
            </div>
            {errors.iban && <div style={{ fontSize: '0.7rem', color: t.status.error.main, marginTop: 4 }}>{errors.iban}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="tax" checked={form.price_includes_tax} onChange={e => setForm(f => ({ ...f, price_includes_tax: e.target.checked }))} />
            <label htmlFor="tax" style={{ fontSize: '0.83rem', color: t.text.secondary, cursor: 'pointer' }}>السعر شامل الضريبة</label>
          </div>
        </FormRow>
      )}
    </VCard>
  );
}

// ─────────────────────────────────────────────────────────────
// SERVICES TAB
// ─────────────────────────────────────────────────────────────
function ServicesTab() {
  const { vendor } = useVendor();
  const { showSuccess, showError } = useNotification();
  const { fields: allFields, loading: loadingFields } = useVendorFields();
  const { fields: selectedFields, loading: loadingSelected, refetch } = useSelectedFields(vendor?.id || '');
  const t = useVT();

  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch]         = useState('');
  const [saving, setSaving]         = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [rateForm, setRateForm] = useState({ from: '', to: '' });

  // All subcategories flat
  const allSubs = allFields.flatMap(f => f.subcategories || []);
  const selectedIds = new Set(selectedFields.map(sf => sf.field_id));
  const filteredSubs = allSubs.filter(s =>
    !selectedIds.has(s.id) &&
    (search === '' || s.name_ar.includes(search) || s.name_en?.toLowerCase().includes(search.toLowerCase()))
  );

  const addService = async (fieldId: string) => {
    setSaving(fieldId);
    try {
      const { error } = await supabase.from('vendor_selected_fields').insert({
        vendor_id: vendor!.id, field_id: fieldId, rate_from: null, rate_to: null, currency: 'SAR',
      });
      if (error) throw error;
      showSuccess('تمت إضافة الخدمة');
      await refetch();
    } catch { showError('حدث خطأ'); }
    finally { setSaving(null); }
  };

  const removeService = async (id: string) => {
    const { error } = await supabase.from('vendor_selected_fields').delete().eq('id', id);
    if (!error) { showSuccess('تم حذف الخدمة'); refetch(); }
    else showError('حدث خطأ');
  };

  const saveRate = async (sf: SelectedField) => {
    const from = rateForm.from ? Number(toEnglishNumbers(rateForm.from)) : null;
    const to   = rateForm.to   ? Number(toEnglishNumbers(rateForm.to))   : null;
    const { error } = await supabase.from('vendor_selected_fields').update({ rate_from: from, rate_to: to }).eq('id', sf.id);
    if (!error) { showSuccess('تم تحديث السعر'); refetch(); setEditingRate(null); }
    else showError('حدث خطأ');
  };

  if (loadingFields || loadingSelected) return <SkeletonCard rows={4} />;

  return (
    <VCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <SectionTitle>الخدمات والتسعير</SectionTitle>
        <button
          onClick={() => setShowPicker(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={15} /> إضافة خدمة
        </button>
      </div>

      {selectedFields.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: t.text.muted, fontSize: '0.85rem' }}>
          لم تُضف أي خدمة بعد — اضغط "إضافة خدمة"
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {selectedFields.map(sf => (
            <div key={sf.id} style={{ borderRadius: 10, border: `1px solid ${t.border.default}`, overflow: 'hidden', background: t.background.card }}>
              <div style={{ padding: '0.625rem 0.75rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={16} style={{ color: t.primary.main, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: t.text.primary }}>{sf.vendor_fields?.name_ar}</div>
                  {sf.rate_from && (
                    <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, marginTop: 2 }}>
                      {sf.rate_from}{sf.rate_to ? ` — ${sf.rate_to}` : ''} ريال
                    </div>
                  )}
                </div>
                <button onClick={() => { setEditingRate(sf.id); setRateForm({ from: String(sf.rate_from || ''), to: String(sf.rate_to || '') }); }}
                  style={{ fontSize: '0.72rem', padding: '4px 9px', borderRadius: 6, border: `1px solid ${t.border.default}`, background: 'transparent', color: t.text.muted, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}>
                  تسعير
                </button>
                <button onClick={() => removeService(sf.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.status.error.main, display: 'flex', padding: '4px' }}>
                  <Trash2 size={15} />
                </button>
              </div>
              {editingRate === sf.id && (
                <div style={{ padding: '0.5rem 0.75rem', borderTop: `1px solid ${t.border.default}`, display: 'flex', gap: 8, alignItems: 'center', background: t.background.filter }}>
                  <span style={{ fontSize: '0.72rem', color: t.text.muted, flexShrink: 0 }}>من</span>
                  <TInput value={rateForm.from} onChange={v => setRateForm(f => ({ ...f, from: v }))} dir="ltr" placeholder="0" />
                  <span style={{ fontSize: '0.72rem', color: t.text.muted, flexShrink: 0 }}>إلى</span>
                  <TInput value={rateForm.to} onChange={v => setRateForm(f => ({ ...f, to: v }))} dir="ltr" placeholder="0" />
                  <span style={{ fontSize: '0.72rem', color: t.text.muted, flexShrink: 0 }}>ريال</span>
                  <button onClick={() => saveRate(sf)} style={{ padding: '5px 10px', borderRadius: 7, background: t.primary.main, border: 'none', color: 'white', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', flexShrink: 0 }}>حفظ</button>
                  <button onClick={() => setEditingRate(null)} style={{ padding: '5px 10px', borderRadius: 7, background: 'transparent', border: `1px solid ${t.border.default}`, color: t.text.muted, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', flexShrink: 0 }}>إلغاء</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Service picker modal */}
      {showPicker && (
        <>
          <div onClick={() => setShowPicker(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: Math.min(500, window.innerWidth - 32), maxHeight: '80vh',
            background: t.background.card, borderRadius: 16, border: `1px solid ${t.border.default}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', zIndex: 101, display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '1rem', borderBottom: `1px solid ${t.border.default}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Search size={16} style={{ color: t.text.muted, flexShrink: 0 }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ابحث عن خدمة..."
                autoFocus
                dir="rtl"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Tajawal, sans-serif', fontSize: '0.9rem', color: t.text.primary }}
              />
            </div>
            <div style={{ overflowY: 'auto', padding: '0.75rem' }}>
              {allFields.map(cat => {
                const subs = (cat.subcategories || []).filter(s =>
                  !selectedIds.has(s.id) &&
                  (search === '' || s.name_ar.includes(search) || s.name_en?.toLowerCase().includes(search.toLowerCase()))
                );
                if (subs.length === 0) return null;
                return (
                  <div key={cat.id} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: t.text.muted, padding: '4px 6px', marginBottom: 4 }}>{cat.name_ar}</div>
                    {subs.map(s => (
                      <button key={s.id} onClick={() => addService(s.id)}
                        disabled={saving === s.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: '0.83rem', color: t.text.primary, textAlign: 'right', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = t.background.hover)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Plus size={14} style={{ color: t.primary.main, flexShrink: 0 }} />
                        {s.name_ar}
                      </button>
                    ))}
                  </div>
                );
              })}
              {filteredSubs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: t.text.muted, fontSize: '0.83rem' }}>
                  {search ? 'لا توجد نتائج' : 'أضفت جميع الخدمات المتاحة'}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </VCard>
  );
}
