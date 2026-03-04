// ─────────────────────────────────────────────────────────────
// PROJECTS PAGE
// ─────────────────────────────────────────────────────────────
import { useState, useRef } from 'react';
import { FolderOpen, FileText, Camera, FileArchive, ChevronDown, ChevronUp, Download, Eye, Trash2, Upload, Plus, Search, X } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useVendor } from '../../../contexts/VendorContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { getTheme } from '../../../theme/tokens';
import { formatCurrency, formatDate } from '../../../lib/formatters';
import {
  useFetch, fetchVendorProjects, fetchVendorInvoices,
  fetchVendorEquipment, fetchEquipmentCatalog, fetchEquipmentCategories,
  fetchVendorDocuments, fetchTravelDocs, uploadFile,
} from '../hooks/useVendorData';
import {
  PageTitle, VCard, StatusBadge, EmptyState, Skeleton, PrimaryBtn,
  FieldInput, FieldSelect,
} from '../shared/VendorUI';

export const VendorProjectsPage = () => {
  const { vendor } = useVendor();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const { data: raw = [], loading } = useFetch(() => fetchVendorProjects(vendor!.id), [vendor?.id]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Deduplicate by project id
  const seen = new Set<string>();
  const projects = (raw as any[]).filter((inv: any) => {
    const pid = inv.project?.id;
    if (!pid || seen.has(pid)) return false;
    seen.add(pid);
    return true;
  });

  return (
    <div>
      <PageTitle title="مشاريعي" subtitle={`${projects.length} مشروع`} />
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} h={70} radius={12} />)}
        </div>
      ) : projects.length === 0 ? (
        <VCard><EmptyState icon={<FolderOpen size={44} />} title="لا توجد مشاريع بعد" subtitle="سيتم إضافتك لمشاريع من قبل الإدارة" /></VCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projects.map((inv: any) => {
            const p = inv.project;
            const exp = expanded === p?.id;
            return (
              <VCard key={p?.id} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setExpanded(exp ? null : p?.id)}>
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FolderOpen size={18} color="#3b82f6" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: theme.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.name || '—'}</div>
                    <div style={{ fontSize: '0.72rem', color: theme.text.muted, marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {inv.client?.name && <span>👤 {inv.client.name}</span>}
                      {p?.start_date && <span>📅 {formatDate(p.start_date)}</span>}
                      {inv.amount_total > 0 && <span>💰 {formatCurrency(inv.amount_total)}</span>}
                    </div>
                  </div>
                  <StatusBadge status={p?.status || 'pending'} />
                  {exp ? <ChevronUp size={16} color={theme.text.muted} /> : <ChevronDown size={16} color={theme.text.muted} />}
                </div>
                {exp && (
                  <div style={{ padding: '12px 16px', borderTop: `1px solid ${theme.border.default}`, background: theme.background.filter }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: theme.text.muted, marginBottom: 3 }}>إجمالي المبلغ</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: theme.text.primary }}>{formatCurrency(inv.amount_total)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: theme.text.muted, marginBottom: 3 }}>المدفوع</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10b981' }}>{formatCurrency(inv.amount_paid || 0)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: theme.text.muted, marginBottom: 3 }}>المتبقي</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f59e0b' }}>{formatCurrency((inv.amount_total || 0) - (inv.amount_paid || 0))}</div>
                      </div>
                    </div>
                  </div>
                )}
              </VCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// INVOICES PAGE
// ─────────────────────────────────────────────────────────────
export const VendorInvoicesPage = () => {
  const { vendor } = useVendor();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const { data: invoices = [], loading } = useFetch(() => fetchVendorInvoices(vendor!.id), [vendor?.id]);

  const total   = (invoices as any[]).reduce((s: number, i: any) => s + Number(i.amount_total  || 0), 0);
  const paid    = (invoices as any[]).reduce((s: number, i: any) => s + Number(i.amount_paid   || 0), 0);
  const pending = total - paid;

  return (
    <div>
      <PageTitle title="الفواتير والمدفوعات" />

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { l: 'الإجمالي',        v: total,   c: '#3b82f6' },
          { l: 'المسدّد',         v: paid,    c: '#10b981' },
          { l: 'غير المسدّد',    v: pending, c: '#f59e0b' },
        ].map((s, i) => (
          <VCard key={i} style={{ borderRight: `3px solid ${s.c}`, padding: '12px 14px' }}>
            <div style={{ fontSize: '0.7rem', color: theme.text.muted, marginBottom: 5 }}>{s.l}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.c, direction: 'ltr' }}>{formatCurrency(s.v)}</div>
          </VCard>
        ))}
      </div>

      {/* List */}
      <VCard style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border.default}`, display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, fontSize: '0.72rem', fontWeight: 700, color: theme.text.muted }}>
          <span>المشروع / العميل</span><span>المبلغ</span><span>الحالة</span>
        </div>
        {loading ? (
          <div style={{ padding: 16 }}>{Array(4).fill(0).map((_, i) => <Skeleton key={i} h={50} radius={8} style={{ marginBottom: 8 }} />)}</div>
        ) : (invoices as any[]).length === 0 ? (
          <EmptyState icon={<FileText size={40} />} title="لا توجد فواتير بعد" />
        ) : (
          (invoices as any[]).map((inv: any) => (
            <div key={inv.id} style={{
              padding: '12px 16px', borderBottom: `1px solid ${theme.border.divider}`,
              display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center',
              transition: 'background 0.14s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.background.hover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: theme.text.primary }}>{inv.project?.name || '—'}</div>
                <div style={{ fontSize: '0.71rem', color: theme.text.muted, marginTop: 1 }}>
                  {inv.client?.name && `${inv.client.name} · `}
                  {inv.due_date && `استحقاق: ${formatDate(inv.due_date)}`}
                </div>
              </div>
              <div style={{ textAlign: 'left', direction: 'ltr' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: theme.text.primary }}>{formatCurrency(inv.amount_total)}</div>
                <div style={{ fontSize: '0.71rem', color: '#10b981' }}>مدفوع: {formatCurrency(inv.amount_paid || 0)}</div>
              </div>
              <StatusBadge status={inv.status} />
            </div>
          ))
        )}
      </VCard>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// EQUIPMENT PAGE
// ─────────────────────────────────────────────────────────────
export const VendorEquipmentPage = () => {
  const { vendor } = useVendor();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const { showSuccess, showError } = useNotification();

  const { data: equipment = [], loading, refetch } = useFetch(() => fetchVendorEquipment(vendor!.id), [vendor?.id]);
  const { data: catalog   = [] }                   = useFetch(fetchEquipmentCatalog, []);
  const { data: categories = [] }                  = useFetch(fetchEquipmentCategories, []);

  const [showModal, setShowModal]   = useState(false);
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState('');
  const [serial, setSerial]         = useState('');
  const [selectedItem, setSelected] = useState<any>(null);
  const [saving, setSaving]         = useState(false);

  // Already-added catalog ids
  const addedIds = new Set((equipment as any[]).map((e: any) => e.catalog_item_id));

  const filteredCatalog = (catalog as any[]).filter((c: any) => {
    const matchSearch = !search || c.name.includes(search) || (c.name_en || '').toLowerCase().includes(search.toLowerCase());
    const matchCat    = !filterCat || c.equipment_categories?.id === filterCat;
    return matchSearch && matchCat && !addedIds.has(c.id);
  });

  const addEquipment = async () => {
    if (!selectedItem) { showError('اختر معدة من الكتالوج'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('vendor_equipment').insert({
        vendor_id: vendor!.id,
        catalog_item_id: selectedItem.id,
        name: selectedItem.name,
        type: selectedItem.equipment_categories?.name || '',
        serial_number: serial || null,
        quantity: 1,
      });
      if (error) throw error;
      showSuccess('تمت إضافة المعدة');
      setShowModal(false); setSelected(null); setSerial(''); setSearch(''); setFilterCat('');
      await refetch();
    } catch { showError('حدث خطأ'); }
    finally { setSaving(false); }
  };

  const deleteEquipment = async (id: string) => {
    const { error } = await supabase.from('vendor_equipment').delete().eq('id', id);
    if (!error) { showSuccess('تم الحذف'); await refetch(); }
    else showError('حدث خطأ');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <PageTitle title="المعدات" subtitle={`${(equipment as any[]).length} معدة`} />
        <PrimaryBtn onClick={() => setShowModal(true)}><Plus size={15} /> إضافة معدة</PrimaryBtn>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }} onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '90%', maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            borderRadius: 16, background: theme.background.card,
            border: `1px solid ${theme.border.default}`, overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border.default}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: theme.text.primary }}>اختر معدة من الكتالوج</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.muted }}><X size={18} /></button>
            </div>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border.default}`, display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ width: '100%', padding: '8px 32px 8px 12px', borderRadius: 8, border: `1px solid ${theme.border.default}`, background: theme.background.input, color: theme.text.primary, fontFamily: 'Tajawal, sans-serif', fontSize: '0.83rem', outline: 'none' }} />
                <Search size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: theme.text.muted }} />
              </div>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${theme.border.default}`, background: theme.background.input, color: theme.text.secondary, fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem', outline: 'none' }}>
                <option value="">كل الفئات</option>
                {(categories as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
              {filteredCatalog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: theme.text.muted, fontSize: '0.82rem' }}>لا توجد نتائج</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {filteredCatalog.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => setSelected(selectedItem?.id === c.id ? null : c)}
                      style={{
                        padding: '10px', borderRadius: 10, cursor: 'pointer', textAlign: 'right',
                        border: `2px solid ${selectedItem?.id === c.id ? theme.primary.main : theme.border.default}`,
                        background: selectedItem?.id === c.id ? 'rgba(37,99,235,0.06)' : theme.background.filter,
                        transition: 'all 0.15s',
                      }}
                    >
                      {c.image_url ? (
                        <img src={c.image_url} alt="" style={{ width: '100%', height: 70, objectFit: 'contain', borderRadius: 7, marginBottom: 6 }} />
                      ) : (
                        <div style={{ width: '100%', height: 70, borderRadius: 7, background: 'rgba(37,99,235,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>📷</div>
                      )}
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: theme.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize: '0.68rem', color: theme.text.muted, marginTop: 2 }}>{c.equipment_categories?.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedItem && (
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${theme.border.default}` }}>
                <FieldInput label="الرقم التسلسلي (اختياري)" value={serial} onChange={(e: any) => setSerial(e.target.value)} placeholder="SN-XXXXXXXX" dir="ltr" />
                <div style={{ marginTop: 10 }}>
                  <PrimaryBtn onClick={addEquipment} loading={saving} style={{ width: '100%', justifyContent: 'center' }}>
                    إضافة "{selectedItem.name}"
                  </PrimaryBtn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Equipment grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} h={180} radius={12} />)}
        </div>
      ) : (equipment as any[]).length === 0 ? (
        <VCard><EmptyState icon={<Camera size={44} />} title="لا توجد معدات بعد" subtitle='اضغط "إضافة معدة" لاختيار من الكتالوج' /></VCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
          {(equipment as any[]).map((eq: any) => (
            <VCard key={eq.id} style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
              {eq.equipment_catalog?.image_url ? (
                <img src={eq.equipment_catalog.image_url} alt="" style={{ width: '100%', height: 110, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: 110, background: 'rgba(37,99,235,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>📷</div>
              )}
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: theme.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {eq.equipment_catalog?.name || eq.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: theme.text.muted, marginTop: 2 }}>
                  {eq.equipment_catalog?.equipment_categories?.name}
                </div>
                {eq.serial_number && (
                  <div style={{ fontSize: '0.68rem', color: theme.text.muted, direction: 'ltr', marginTop: 3, fontFamily: 'monospace' }}>
                    SN: {eq.serial_number}
                  </div>
                )}
              </div>
              <button
                onClick={() => deleteEquipment(eq.id)}
                style={{ position: 'absolute', top: 7, left: 7, width: 26, height: 26, borderRadius: '50%', background: 'rgba(239,68,68,0.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Trash2 size={13} color="white" />
              </button>
            </VCard>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// DOCUMENTS PAGE
// ─────────────────────────────────────────────────────────────
const DOC_TYPES = [
  { id: 'id_national',  label: 'الهوية الوطنية',  icon: '🪪' },
  { id: 'passport',     label: 'جواز السفر',       icon: '📘' },
  { id: 'visa',         label: 'تأشيرة',            icon: '🛂' },
  { id: 'contract',     label: 'عقد',              icon: '📄' },
  { id: 'certificate',  label: 'شهادة',             icon: '🏅' },
  { id: 'other',        label: 'أخرى',              icon: '📎' },
];

const VISA_TYPES = ['زيارة', 'عمل', 'إقامة', 'سياحة', 'عبور', 'دراسة', 'دبلوماسية', 'أخرى'];

const COUNTRIES = [
  'المملكة العربية السعودية', 'الإمارات', 'الكويت', 'قطر', 'البحرين', 'عمان',
  'مصر', 'الأردن', 'لبنان', 'سوريا', 'العراق', 'اليمن', 'ليبيا', 'تونس',
  'الجزائر', 'المغرب', 'السودان', 'فلسطين',
  'الولايات المتحدة', 'المملكة المتحدة', 'كندا', 'أستراليا', 'فرنسا',
  'ألمانيا', 'إيطاليا', 'إسبانيا', 'الهند', 'الصين', 'اليابان', 'كوريا',
  'باكستان', 'بنغلاديش', 'الفلبين', 'إندونيسيا',
];

export const VendorDocumentsPage = () => {
  const { vendor } = useVendor();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const { showSuccess, showError } = useNotification();

  const { data: documents = [], loading, refetch } = useFetch(() => fetchVendorDocuments(vendor!.id), [vendor?.id]);

  const [activeType, setActiveType]   = useState('');
  const [uploading, setUploading]     = useState(false);
  const [showVisaForm, setVisaForm]   = useState(false);
  const [visaData, setVisaData]       = useState({ visa_type: '', country: '', expiry: '' });
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  const upload = async (file: File, docType: string, meta?: any) => {
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `vendor-documents/${vendor!.id}/${docType}-${Date.now()}.${ext}`;
      const url  = await uploadFile('vendor-documents', path, file);
      const { error } = await supabase.from('vendor_documents').insert({
        vendor_id:     vendor!.id,
        document_type: docType,
        file_url:      url,
        file_name:     file.name,
        uploaded_by:   vendor!.id,
        ...(meta ? { metadata: meta } : {}),
      });
      if (error) throw error;
      showSuccess('تم رفع الملف');
      await refetch();
    } catch { showError('فشل رفع الملف'); }
    finally { setUploading(false); }
  };

  const replace = async (docId: string, file: File, docType: string) => {
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `vendor-documents/${vendor!.id}/${docType}-${Date.now()}.${ext}`;
      const url  = await uploadFile('vendor-documents', path, file);
      const { error } = await supabase.from('vendor_documents').update({ file_url: url, file_name: file.name }).eq('id', docId);
      if (error) throw error;
      showSuccess('تم استبدال الملف');
      await refetch();
    } catch { showError('فشل الاستبدال'); }
    finally { setUploading(false); setReplacingId(null); }
  };

  const deleteDoc = async (doc: any) => {
    const { error } = await supabase.from('vendor_documents').delete().eq('id', doc.id);
    if (!error) { showSuccess('تم الحذف'); await refetch(); }
    else showError('حدث خطأ');
  };

  const docsByType = (type: string) => (documents as any[]).filter((d: any) => d.document_type === type);

  return (
    <div>
      <PageTitle title="المستندات" subtitle="إدارة ملفات ووثائقك الرسمية" />

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {DOC_TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveType(activeType === t.id ? '' : t.id)}
            style={{
              padding: '6px 14px', borderRadius: 9, cursor: 'pointer',
              fontFamily: 'Tajawal, sans-serif', fontSize: '0.8rem',
              fontWeight: activeType === t.id ? 700 : 400,
              background: activeType === t.id ? 'rgba(37,99,235,0.1)' : theme.background.filter,
              border: `1px solid ${activeType === t.id ? 'rgba(59,130,246,0.3)' : theme.border.default}`,
              color: activeType === t.id ? theme.primary.main : theme.text.muted,
              transition: 'all 0.15s',
            }}
          >
            {t.icon} {t.label}
            {docsByType(t.id).length > 0 && (
              <span style={{ marginRight: 4, background: activeType === t.id ? theme.primary.main : theme.text.muted, color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: '0.62rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {docsByType(t.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Upload section */}
      <VCard style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: theme.text.secondary, marginBottom: 10 }}>رفع مستند جديد</div>
        {!activeType ? (
          <div style={{ fontSize: '0.82rem', color: theme.text.muted }}>اختر نوع المستند أعلاه لرفع ملف</div>
        ) : activeType === 'visa' ? (
          <>
            {!showVisaForm ? (
              <PrimaryBtn onClick={() => setVisaForm(true)}><Plus size={15} /> إضافة تأشيرة</PrimaryBtn>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <FieldSelect label="نوع التأشيرة *" value={visaData.visa_type} onChange={(e: any) => setVisaData(v => ({ ...v, visa_type: e.target.value }))}>
                    <option value="">اختر النوع</option>
                    {VISA_TYPES.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                  </FieldSelect>
                  <FieldSelect label="الدولة *" value={visaData.country} onChange={(e: any) => setVisaData(v => ({ ...v, country: e.target.value }))}>
                    <option value="">اختر الدولة</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </FieldSelect>
                  <FieldInput label="تاريخ الانتهاء" value={visaData.expiry} onChange={(e: any) => setVisaData(v => ({ ...v, expiry: e.target.value }))} type="date" dir="ltr" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PrimaryBtn
                    onClick={() => {
                      if (!visaData.visa_type || !visaData.country) { showError('نوع التأشيرة والدولة مطلوبان'); return; }
                      fileRef.current?.click();
                    }}
                    disabled={uploading}
                  >
                    <Upload size={15} /> رفع إثبات التأشيرة
                  </PrimaryBtn>
                  <button onClick={() => { setVisaForm(false); setVisaData({ visa_type: '', country: '', expiry: '' }); }}
                    style={{ padding: '8px 14px', borderRadius: 9, background: theme.background.filter, border: `1px solid ${theme.border.default}`, color: theme.text.secondary, fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem', cursor: 'pointer' }}>
                    إلغاء
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) { upload(f, 'visa', visaData); setVisaForm(false); setVisaData({ visa_type: '', country: '', expiry: '' }); } e.target.value = ''; }} />
              </div>
            )}
          </>
        ) : (
          <>
            <PrimaryBtn onClick={() => fileRef.current?.click()} disabled={uploading} loading={uploading}>
              <Upload size={15} /> {uploading ? 'جارٍ الرفع...' : `رفع ${DOC_TYPES.find(t => t.id === activeType)?.label}`}
            </PrimaryBtn>
            <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, activeType); e.target.value = ''; }} />
          </>
        )}
      </VCard>

      {/* Files list */}
      {loading ? (
        <VCard><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{Array(3).fill(0).map((_, i) => <Skeleton key={i} h={56} radius={10} />)}</div></VCard>
      ) : (documents as any[]).length === 0 ? (
        <VCard><EmptyState icon={<FileArchive size={44} />} title="لا توجد مستندات بعد" subtitle="ارفع وثائقك الرسمية من القسم أعلاه" /></VCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(activeType ? docsByType(activeType) : (documents as any[])).map((doc: any) => {
            const dt = DOC_TYPES.find(t => t.id === doc.document_type);
            const meta = doc.metadata;
            return (
              <VCard key={doc.id} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                  {dt?.icon || '📄'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: theme.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</div>
                  <div style={{ fontSize: '0.69rem', color: theme.text.muted, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span>{dt?.label}</span>
                    {meta?.visa_type && <span>· {meta.visa_type}</span>}
                    {meta?.country   && <span>· {meta.country}</span>}
                    {meta?.expiry    && <span>· ينتهي: {meta.expiry}</span>}
                    <span>· {new Date(doc.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button title="عرض" onClick={() => window.open(doc.file_url, '_blank')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.primary.main, padding: '5px', display: 'flex', borderRadius: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <Eye size={16} />
                  </button>
                  <a href={doc.file_url} download={doc.file_name} title="تحميل"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: '5px', display: 'flex', borderRadius: 6, textDecoration: 'none' }}>
                    <Download size={16} />
                  </a>
                  <button title="استبدال"
                    onClick={() => { setReplacingId(doc.id); replaceRef.current?.click(); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b', padding: '5px', display: 'flex', borderRadius: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <Upload size={16} />
                  </button>
                  <button title="حذف" onClick={() => deleteDoc(doc)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.status.error.main, padding: '5px', display: 'flex', borderRadius: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.background = theme.status.error.light)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </VCard>
            );
          })}
        </div>
      )}

      {/* Replace input (hidden) */}
      <input ref={replaceRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f && replacingId) {
            const doc = (documents as any[]).find((d: any) => d.id === replacingId);
            if (doc) replace(doc.id, f, doc.document_type);
          }
          e.target.value = '';
        }} />
    </div>
  );
};
