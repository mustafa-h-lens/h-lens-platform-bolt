import { useState, useEffect, useRef } from 'react';
import { Camera, Plus, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useVendor } from '../../../contexts/VendorContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { getTheme } from '../../../theme/tokens';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import {
  useFetch, fetchVendorProfile, fetchCities, fetchBanks,
  fetchVendorFields, fetchSelectedServices, uploadFile,
} from '../hooks/useVendorData';
import {
  PageTitle, VCard, TabBar, ViewEditBar, FieldView, FieldInput,
  FieldSelect, PrimaryBtn, Skeleton,
} from '../shared/VendorUI';

export const VendorProfilePage = () => {
  const [tab, setTab] = useState('personal');

  return (
    <div>
      <PageTitle title="الملف الشخصي" />
      <TabBar
        tabs={[
          { id: 'personal',  label: '👤 البيانات الشخصية' },
          { id: 'financial', label: '💳 البيانات المالية'  },
          { id: 'services',  label: '🛠 الخدمات والتسعير'  },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'personal'  && <PersonalTab />}
      {tab === 'financial' && <FinancialTab />}
      {tab === 'services'  && <ServicesTab />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// TAB: PERSONAL
// ─────────────────────────────────────────────────────────────
const PersonalTab = () => {
  const { vendor, refreshVendor } = useVendor();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const { showSuccess, showError } = useNotification();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch fresh profile + cities
  const { data: profile, loading: loadingProfile, refetch } = useFetch(
    () => fetchVendorProfile(vendor!.id), [vendor?.id]
  );
  const { data: cities = [] } = useFetch(fetchCities, []);

  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', id_number: '',
    nationality: '', primary_city: '',
    available_other_cities: false, other_cities: [] as string[],
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name:              profile.full_name || '',
        phone:                  profile.phone || '',
        email:                  profile.email || '',
        id_number:              profile.id_number || '',
        nationality:            profile.nationality || '',
        primary_city:           profile.primary_city || '',
        available_other_cities: profile.available_other_cities || false,
        other_cities:           profile.other_cities || [],
      });
    }
  }, [profile]);

  const handleUploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const url = await uploadFile('vendor-images', `profiles/${vendor!.id}.${ext}`, file);
      await supabase.from('vendors').update({ profile_image: url }).eq('id', vendor!.id);
      showSuccess('تم تحديث الصورة الشخصية');
      await refetch();
      await refreshVendor();
    } catch {
      showError('فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const toggleOtherCity = (cityName: string) => {
    setForm(f => ({
      ...f,
      other_cities: f.other_cities.includes(cityName)
        ? f.other_cities.filter(c => c !== cityName)
        : [...f.other_cities, cityName],
    }));
  };

  const save = async () => {
    if (!form.full_name.trim()) { showError('الاسم مطلوب'); return; }
    if (!/^05\d{8}$/.test(form.phone.replace(/\s/g, ''))) {
      showError('رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام'); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', vendor!.id);
      if (error) throw error;
      showSuccess('تم حفظ البيانات الشخصية');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setIsEditing(false);
      await refetch();
      await refreshVendor();
    } catch {
      showError('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) return (
    <VCard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array(6).fill(0).map((_, i) => <Skeleton key={i} h={40} radius={9} />)}
      </div>
    </VCard>
  );

  return (
    <VCard>
      <ViewEditBar
        title="البيانات الشخصية"
        isEditing={isEditing}
        saving={saving}
        saved={saved}
        onEdit={() => setIsEditing(true)}
        onCancel={() => { setIsEditing(false); if (profile) setForm({ full_name: profile.full_name, phone: profile.phone, email: profile.email || '', id_number: profile.id_number || '', nationality: profile.nationality || '', primary_city: profile.primary_city || '', available_other_cities: profile.available_other_cities || false, other_cities: profile.other_cities || [] }); }}
        onSave={save}
      />

      {/* Profile photo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ position: 'relative' }}>
          {profile?.profile_image ? (
            <img src={profile.profile_image} alt="" style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', border: `2px solid ${theme.border.default}` }} />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: 16,
              background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.3rem', fontWeight: 800, color: 'white',
            }}>
              {profile?.full_name?.split(' ').slice(0, 2).map((w: string) => w[0]).join('') || '؟'}
            </div>
          )}
          {isEditing && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                position: 'absolute', bottom: -6, left: -6,
                width: 26, height: 26, borderRadius: '50%',
                background: '#2563eb', border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Camera size={13} color="white" />
            </button>
          )}
        </div>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: theme.text.primary }}>{profile?.full_name}</div>
          <div style={{ fontSize: '0.75rem', color: theme.text.muted, marginTop: 2 }}>
            {profile?.vendor_type || 'مورد'} · {profile?.status === 'active' ? '✅ نشط' : profile?.status}
          </div>
        </div>
        <input
          ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadPhoto(f); e.target.value = ''; }}
        />
      </div>

      {/* Fields grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {isEditing ? (
          <>
            <FieldInput label="الاسم الكامل *" value={form.full_name} onChange={(e: any) => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="الاسم كما في الهوية" />
            <FieldInput label="رقم الجوال *" value={form.phone} onChange={(e: any) => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="05XXXXXXXX" dir="ltr" />
            <FieldInput label="البريد الإلكتروني" value={form.email} onChange={(e: any) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@email.com" dir="ltr" />
            <FieldInput label="رقم الهوية" value={form.id_number} onChange={(e: any) => setForm(f => ({ ...f, id_number: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="1XXXXXXXXX" dir="ltr" />
            <FieldInput label="الجنسية" value={form.nationality} onChange={(e: any) => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="الجنسية" />
            <FieldSelect label="مدينة العمل الأساسية" value={form.primary_city} onChange={(e: any) => setForm(f => ({ ...f, primary_city: e.target.value }))}>
              <option value="">اختر المدينة</option>
              {(cities as any[]).map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </FieldSelect>
          </>
        ) : (
          <>
            <FieldView label="الاسم الكامل"         value={profile?.full_name}    />
            <FieldView label="رقم الجوال"            value={profile?.phone}        dir="ltr" />
            <FieldView label="البريد الإلكتروني"    value={profile?.email}        dir="ltr" />
            <FieldView label="رقم الهوية"            value={profile?.id_number}    dir="ltr" />
            <FieldView label="الجنسية"               value={profile?.nationality}  />
            <FieldView label="مدينة العمل الأساسية" value={profile?.primary_city} />
          </>
        )}
      </div>

      {/* نوع الحساب — عرض فقط */}
      <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 9, background: theme.background.filter, border: `1px solid ${theme.border.default}` }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: theme.text.muted }}>نوع الحساب: </span>
        <span style={{ fontSize: '0.85rem', color: theme.text.secondary, fontWeight: 600 }}>
          {profile?.vendor_type || 'مورد'} — <span style={{ color: theme.text.muted, fontSize: '0.72rem' }}>يُحدد عند التسجيل فقط</span>
        </span>
      </div>

      {/* Other cities */}
      {isEditing && (
        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={form.available_other_cities}
              onChange={e => setForm(f => ({ ...f, available_other_cities: e.target.checked }))}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: '0.85rem', color: theme.text.secondary, fontWeight: 600 }}>متاح للعمل في مدن أخرى</span>
          </label>
          {form.available_other_cities && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(cities as any[]).filter((c: any) => c.name !== form.primary_city).map((c: any) => {
                const sel = form.other_cities.includes(c.name);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleOtherCity(c.name)}
                    style={{
                      padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'Tajawal, sans-serif', fontSize: '0.78rem',
                      fontWeight: sel ? 700 : 400,
                      background: sel ? 'rgba(37,99,235,0.1)' : theme.background.filter,
                      border: `1px solid ${sel ? 'rgba(59,130,246,0.3)' : theme.border.default}`,
                      color: sel ? theme.primary.main : theme.text.muted,
                      transition: 'all 0.15s',
                    }}
                  >
                    {sel ? '✓ ' : ''}{c.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!isEditing && profile?.available_other_cities && profile?.other_cities?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: theme.text.muted, marginBottom: 8 }}>مدن العمل الأخرى</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {profile.other_cities.map((c: string, i: number) => (
              <span key={i} style={{ padding: '4px 10px', borderRadius: 7, background: 'rgba(37,99,235,0.08)', color: theme.primary.main, fontSize: '0.78rem', fontWeight: 600 }}>{c}</span>
            ))}
          </div>
        </div>
      )}
    </VCard>
  );
};

// ─────────────────────────────────────────────────────────────
// TAB: FINANCIAL
// ─────────────────────────────────────────────────────────────
const FinancialTab = () => {
  const { vendor } = useVendor();
  const { showSuccess, showError } = useNotification();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  const { data: profile, loading, refetch } = useFetch(() => fetchVendorProfile(vendor!.id), [vendor?.id]);
  const { data: banks = [] } = useFetch(fetchBanks, []);

  const [form, setForm] = useState({ bank_id: '', iban: '', account_name: '' });

  useEffect(() => {
    if (profile) setForm({ bank_id: profile.bank_id || '', iban: profile.iban?.replace(/^SA/, '') || '', account_name: profile.account_name || '' });
  }, [profile]);

  const ibanFull = form.iban ? `SA${form.iban}` : '';
  const ibanValid = /^SA\d{22}$/.test(ibanFull);

  const save = async () => {
    if (form.iban && !ibanValid) { showError('رقم الآيبان يجب أن يكون SA + 22 رقماً'); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ bank_id: form.bank_id || null, iban: ibanFull || null, account_name: form.account_name || null, updated_at: new Date().toISOString() })
        .eq('id', vendor!.id);
      if (error) throw error;
      showSuccess('تم حفظ البيانات المالية');
      setSaved(true); setTimeout(() => setSaved(false), 2500);
      setIsEditing(false);
      await refetch();
    } catch { showError('حدث خطأ أثناء الحفظ'); }
    finally { setSaving(false); }
  };

  const bankName = (banks as any[]).find((b: any) => b.id === profile?.bank_id)?.name_ar || '—';

  if (loading) return <VCard><Skeleton h={200} radius={9} /></VCard>;

  return (
    <VCard>
      <ViewEditBar
        title="البيانات المالية"
        isEditing={isEditing} saving={saving} saved={saved}
        onEdit={() => setIsEditing(true)}
        onCancel={() => { setIsEditing(false); if (profile) setForm({ bank_id: profile.bank_id || '', iban: profile.iban?.replace(/^SA/, '') || '', account_name: profile.account_name || '' }); }}
        onSave={save}
      />

      {/* طريقة الدفع — عرض فقط للمورد */}
      <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 9, background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: theme.text.muted }}>طريقة الدفع: </span>
        <span style={{ fontSize: '0.88rem', color: theme.text.secondary, fontWeight: 600 }}>🏦 تحويل بنكي</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {isEditing ? (
          <>
            <FieldSelect label="اسم البنك" value={form.bank_id} onChange={(e: any) => setForm(f => ({ ...f, bank_id: e.target.value }))}>
              <option value="">اختر البنك</option>
              {(banks as any[]).map((b: any) => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
            </FieldSelect>
            <FieldInput label="اسم صاحب الحساب" value={form.account_name} onChange={(e: any) => setForm(f => ({ ...f, account_name: e.target.value }))} placeholder="كما في كشف الحساب" />
            {/* IBAN */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: theme.text.muted, marginBottom: 5 }}>رقم الآيبان</label>
              <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', border: `1px solid ${!form.iban || ibanValid ? theme.border.default : '#ef4444'}`, direction: 'ltr' }}>
                <div style={{ padding: '0 12px', background: 'rgba(37,99,235,0.1)', borderLeft: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: theme.primary.main }}>SA</span>
                </div>
                <input
                  value={form.iban}
                  maxLength={22}
                  onChange={e => setForm(f => ({ ...f, iban: e.target.value.replace(/\D/g, '').slice(0, 22) }))}
                  placeholder="0380000000608010167519"
                  dir="ltr"
                  style={{
                    flex: 1, padding: '9px 12px', background: theme.background.input,
                    border: 'none', color: theme.text.primary, fontFamily: 'Tajawal, sans-serif',
                    fontSize: '0.82rem', outline: 'none', letterSpacing: '0.04em',
                  }}
                />
              </div>
              {form.iban && !ibanValid && (
                <div style={{ fontSize: '0.71rem', color: '#ef4444', marginTop: 4 }}>يجب أن يحتوي على 22 رقماً بعد SA</div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FieldView label="البنك"          value={bankName}            />
            <FieldView label="اسم الحساب"    value={profile?.account_name} />
            <FieldView label="رقم الآيبان"   value={profile?.iban || '—'} dir="ltr" />
          </div>
        )}
      </div>
    </VCard>
  );
};

// ─────────────────────────────────────────────────────────────
// TAB: SERVICES
// ─────────────────────────────────────────────────────────────
const ServicesTab = () => {
  const { vendor } = useVendor();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const { showSuccess, showError } = useNotification();

  const { data: allFields = [], loading: loadingFields } = useFetch(fetchVendorFields, []);
  const { data: selected = [], loading: loadingSel, refetch } = useFetch(() => fetchSelectedServices(vendor!.id), [vendor?.id]);

  const [showSelector, setShowSelector] = useState(false);
  const [search, setSearch]             = useState('');
  const [saving, setSaving]             = useState<string | null>(null);
  const [localRates, setLocalRates]     = useState<Record<string, { from: string; to: string }>>({});

  const loading = loadingFields || loadingSel;

  // init local rates from fetched
  useEffect(() => {
    const m: Record<string, { from: string; to: string }> = {};
    (selected as any[]).forEach((sf: any) => {
      m[sf.field_id] = { from: sf.rate_from?.toString() || '', to: sf.rate_to?.toString() || '' };
    });
    setLocalRates(m);
  }, [selected]);

  const isSelected = (fieldId: string) => (selected as any[]).some((sf: any) => sf.field_id === fieldId);

  const addService = async (fieldId: string) => {
    try {
      const { error } = await supabase.from('vendor_selected_fields').insert({
        vendor_id: vendor!.id, field_id: fieldId, currency: 'SAR',
      });
      if (error) throw error;
      showSuccess('تمت إضافة الخدمة');
      await refetch();
      setShowSelector(false);
      setSearch('');
    } catch { showError('حدث خطأ'); }
  };

  const removeService = async (fieldId: string) => {
    try {
      const { error } = await supabase.from('vendor_selected_fields').delete()
        .eq('vendor_id', vendor!.id).eq('field_id', fieldId);
      if (error) throw error;
      showSuccess('تمت الإزالة');
      await refetch();
    } catch { showError('حدث خطأ'); }
  };

  const saveRate = async (fieldId: string) => {
    setSaving(fieldId);
    try {
      const rates = localRates[fieldId] || { from: '', to: '' };
      const { error } = await supabase.from('vendor_selected_fields').update({
        rate_from: rates.from ? Number(toEnglishNumbers(rates.from)) : null,
        rate_to:   rates.to   ? Number(toEnglishNumbers(rates.to))   : null,
        updated_at: new Date().toISOString(),
      }).eq('vendor_id', vendor!.id).eq('field_id', fieldId);
      if (error) throw error;
      showSuccess('تم حفظ السعر');
      await refetch();
    } catch { showError('حدث خطأ'); }
    finally { setSaving(null); }
  };

  // Flatten all subs for search
  const allSubs: any[] = (allFields as any[]).flatMap((cat: any) =>
    (cat.subcategories || []).map((s: any) => ({ ...s, categoryName: cat.name_ar }))
  );
  const filteredSubs = allSubs.filter((s: any) =>
    s.name_ar.includes(search) && !isSelected(s.id)
  );

  if (loading) return <VCard><div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{Array(4).fill(0).map((_, i) => <Skeleton key={i} h={60} radius={10} />)}</div></VCard>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: theme.text.primary }}>
          خدماتي ({(selected as any[]).length})
        </div>
        <PrimaryBtn onClick={() => setShowSelector(v => !v)}>
          <Plus size={15} /> إضافة خدمة
        </PrimaryBtn>
      </div>

      {/* Selector */}
      {showSelector && (
        <VCard style={{ background: 'rgba(37,99,235,0.03)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: theme.primary.main, marginBottom: 12 }}>اختر خدمة من القائمة</div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن خدمة..."
              style={{
                width: '100%', padding: '9px 36px 9px 12px',
                borderRadius: 9, border: `1px solid ${theme.border.default}`,
                background: theme.background.input, color: theme.text.primary,
                fontFamily: 'Tajawal, sans-serif', fontSize: '0.85rem', outline: 'none',
              }}
            />
            <Search size={16} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: theme.text.muted }} />
          </div>
          {filteredSubs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: theme.text.muted, fontSize: '0.82rem' }}>
              {search ? 'لا نتائج' : 'كل الخدمات المتاحة مضافة بالفعل'}
            </div>
          ) : (
            <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredSubs.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => addService(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 12px', borderRadius: 9,
                    background: theme.background.filter,
                    border: `1px solid ${theme.border.default}`,
                    cursor: 'pointer', textAlign: 'right',
                    fontFamily: 'Tajawal, sans-serif', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(37,99,235,0.08)'; (e.currentTarget as any).style.borderColor = 'rgba(59,130,246,0.2)'; }}
                  onMouseLeave={e => { (e.currentTarget as any).style.background = theme.background.filter; (e.currentTarget as any).style.borderColor = theme.border.default; }}
                >
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: theme.text.primary }}>{s.name_ar}</div>
                    <div style={{ fontSize: '0.7rem', color: theme.text.muted }}>{s.categoryName}</div>
                  </div>
                  <Plus size={16} color={theme.primary.main} />
                </button>
              ))}
            </div>
          )}
        </VCard>
      )}

      {/* Selected services */}
      {(selected as any[]).length === 0 ? (
        <VCard>
          <div style={{ textAlign: 'center', padding: '32px', color: theme.text.muted }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🛠</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: theme.text.secondary }}>لم تضف أي خدمات بعد</div>
            <div style={{ fontSize: '0.78rem', marginTop: 4 }}>اضغط "إضافة خدمة" للبدء</div>
          </div>
        </VCard>
      ) : (
        (selected as any[]).map((sf: any) => {
          const rates = localRates[sf.field_id] || { from: '', to: '' };
          const isSaving = saving === sf.field_id;
          return (
            <VCard key={sf.id} style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: theme.text.primary, marginBottom: 2 }}>
                    {sf.vendor_fields?.name_ar || '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.68rem', color: theme.text.muted, marginBottom: 3 }}>السعر من (﷼)</div>
                      <input
                        type="number"
                        value={rates.from}
                        onChange={e => setLocalRates(r => ({ ...r, [sf.field_id]: { ...r[sf.field_id], from: e.target.value } }))}
                        placeholder="0"
                        dir="ltr"
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: `1px solid ${theme.border.default}`, background: theme.background.input, color: theme.text.primary, fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem', outline: 'none' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.68rem', color: theme.text.muted, marginBottom: 3 }}>السعر إلى (﷼)</div>
                      <input
                        type="number"
                        value={rates.to}
                        onChange={e => setLocalRates(r => ({ ...r, [sf.field_id]: { ...r[sf.field_id], to: e.target.value } }))}
                        placeholder="0"
                        dir="ltr"
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: `1px solid ${theme.border.default}`, background: theme.background.input, color: theme.text.primary, fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem', outline: 'none' }}
                      />
                    </div>
                    <button
                      onClick={() => saveRate(sf.field_id)}
                      disabled={isSaving}
                      style={{ padding: '6px 14px', borderRadius: 7, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: theme.primary.main, fontFamily: 'Tajawal, sans-serif', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-end', whiteSpace: 'nowrap' }}
                    >
                      {isSaving ? '...' : 'حفظ'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => removeService(sf.field_id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.status.error.main, padding: '4px', display: 'flex', flexShrink: 0 }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </VCard>
          );
        })
      )}
    </div>
  );
};
