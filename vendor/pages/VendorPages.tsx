// ─────────────────────────────────────────────────────────────
// PROJECTS PAGE
// ─────────────────────────────────────────────────────────────
import { useState, useRef } from 'react';
import { FolderOpen, FileText, Camera, FileArchive, ChevronDown, ChevronUp, Trash2, Upload, Eye, Download, Plus, Search as SearchIcon } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useVendor } from '../../../contexts/VendorContext';
import { useNotification } from '../../../contexts/NotificationContext';
import {
  useVT, VCard, StatusBadge, EmptyState, SkeletonCard, VModal, FL, TInput, TSelect,
} from '../shared/UI';
import {
  useVendorInvoices, useVendorEquipment, useVendorDocuments, useEquipmentCatalog, useEquipmentCategories,
} from '../../../hooks/useVendorData';
import { formatCurrency } from '../../../lib/formatters';

// ─────────────────────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────────────────────
export function VendorProjects() {
  const { vendor } = useVendor();
  const { invoices, loading } = useVendorInvoices(vendor?.id || '');
  const t = useVT();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Derive projects from invoices
  const projectMap = new Map<string, { id: string; name: string; clientName: string; invoiceCount: number; total: number; paid: number; status: string }>();
  invoices.forEach(inv => {
    if (!inv.project_id) return;
    const existing = projectMap.get(inv.project_id);
    if (existing) {
      existing.invoiceCount++;
      existing.total += inv.amount_total;
      existing.paid  += inv.amount_paid;
    } else {
      projectMap.set(inv.project_id, {
        id: inv.project_id,
        name: inv.project?.name || '—',
        clientName: inv.client?.name || '—',
        invoiceCount: 1,
        total: inv.amount_total,
        paid:  inv.amount_paid,
        status: inv.status,
      });
    }
  });
  const projects = Array.from(projectMap.values());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { l: 'المشاريع',  v: projects.length,    c: t.primary.main },
          { l: 'مكتملة',   v: projects.filter(p => p.status === 'paid').length, c: '#10b981' },
          { l: 'جارية',    v: projects.filter(p => p.status !== 'paid').length, c: '#f59e0b' },
        ].map((s, i) => (
          <VCard key={i} style={{ padding: '0.75rem', borderRight: `3px solid ${s.c}` }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: '0.71rem', color: t.text.muted, marginTop: 2 }}>{s.l}</div>
          </VCard>
        ))}
      </div>

      {loading ? [...Array(3)].map((_,i) => <SkeletonCard key={i} rows={2} />) :
       projects.length === 0 ? (
        <VCard><EmptyState icon={<FolderOpen size={40} />} title="لم يتم إسناد مشاريع إليك بعد" subtitle="ستظهر هنا عند تعيينك على مشروع من الإدارة" /></VCard>
       ) : projects.map(p => (
        <VCard key={p.id} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
          <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: t.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              <div style={{ fontSize: '0.7rem', color: t.text.muted, marginTop: 2, display: 'flex', gap: 8 }}>
                <span>👤 {p.clientName}</span>
                <span>🧾 {p.invoiceCount} فاتورة</span>
              </div>
            </div>
            <StatusBadge status={p.status} />
            {expanded === p.id ? <ChevronUp size={15} style={{ color: t.text.muted }} /> : <ChevronDown size={15} style={{ color: t.text.muted }} />}
          </div>
          {expanded === p.id && (
            <div style={{ padding: '0.75rem 1rem', borderTop: `1px solid ${t.border.default}`, background: t.background.filter, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><div style={{ fontSize: '0.68rem', color: t.text.muted }}>الإجمالي</div><div style={{ fontWeight: 700, color: t.text.primary, fontSize: '0.82rem', direction: 'ltr' }}>{formatCurrency(p.total)}</div></div>
              <div><div style={{ fontSize: '0.68rem', color: t.text.muted }}>المسدد</div><div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.82rem', direction: 'ltr' }}>{formatCurrency(p.paid)}</div></div>
              <div><div style={{ fontSize: '0.68rem', color: t.text.muted }}>المتبقي</div><div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.82rem', direction: 'ltr' }}>{formatCurrency(p.total - p.paid)}</div></div>
            </div>
          )}
        </VCard>
       ))
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// INVOICES
// ─────────────────────────────────────────────────────────────
export function VendorInvoices() {
  const { vendor } = useVendor();
  const { invoices, loading } = useVendorInvoices(vendor?.id || '');
  const t = useVT();
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.amount_total, 0);
  const totalPending = invoices.filter(i => i.status !== 'paid').reduce((a, i) => a + (i.amount_total - i.amount_paid), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { l: '💰 إجمالي المحصّل', v: totalPaid,    c: '#10b981' },
          { l: '⏳ قيد الانتظار',   v: totalPending, c: '#f59e0b' },
        ].map((s, i) => (
          <VCard key={i} style={{ borderRight: `3px solid ${s.c}` }}>
            <div style={{ fontSize: '0.7rem', color: t.text.muted, marginBottom: 4 }}>{s.l}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: s.c, direction: 'ltr' }}>{formatCurrency(s.v)}</div>
          </VCard>
        ))}
      </div>

      {loading ? [...Array(3)].map((_,i) => <SkeletonCard key={i} rows={2} />) :
       invoices.length === 0 ? (
        <VCard><EmptyState icon={<FileText size={40} />} title="لا توجد فواتير بعد" subtitle="الفواتير تُنشأ تلقائياً عند إسناد مشروع إليك" /></VCard>
       ) : invoices.map(inv => (
        <VCard key={inv.id} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}>
          <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.83rem', fontWeight: 700, color: t.text.primary }}>{inv.project?.name || '—'}</div>
              <div style={{ fontSize: '0.7rem', color: t.text.muted, marginTop: 2 }}>
                👤 {inv.client?.name || '—'} · {new Date(inv.created_at).toLocaleDateString('ar-SA')}
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, direction: 'ltr', color: t.text.primary }}>{formatCurrency(inv.amount_total)}</div>
            </div>
            <StatusBadge status={inv.status} />
            {expanded === inv.id ? <ChevronUp size={15} style={{ color: t.text.muted }} /> : <ChevronDown size={15} style={{ color: t.text.muted }} />}
          </div>
          {expanded === inv.id && (
            <div style={{ padding: '0.75rem 1rem', borderTop: `1px solid ${t.border.default}`, background: t.background.filter, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><div style={{ fontSize: '0.68rem', color: t.text.muted }}>الإجمالي</div><div style={{ fontWeight: 700, direction: 'ltr', fontSize: '0.82rem' }}>{formatCurrency(inv.amount_total)}</div></div>
              <div><div style={{ fontSize: '0.68rem', color: t.text.muted }}>المدفوع</div><div style={{ fontWeight: 700, color: '#10b981', direction: 'ltr', fontSize: '0.82rem' }}>{formatCurrency(inv.amount_paid)}</div></div>
              <div><div style={{ fontSize: '0.68rem', color: t.text.muted }}>المتبقي</div><div style={{ fontWeight: 700, color: '#f59e0b', direction: 'ltr', fontSize: '0.82rem' }}>{formatCurrency(inv.amount_remaining)}</div></div>
            </div>
          )}
        </VCard>
       ))
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EQUIPMENT
// ─────────────────────────────────────────────────────────────
export function VendorEquipmentPage() {
  const { vendor } = useVendor();
  const { showSuccess, showError } = useNotification();
  const { equipment, loading, refetch } = useVendorEquipment(vendor?.id || '');
  const { catalog, loading: loadingCatalog } = useEquipmentCatalog();
  const { categories } = useEquipmentCategories();
  const t = useVT();

  const [showModal, setShowModal]       = useState(false);
  const [catFilter, setCatFilter]       = useState('');
  const [search, setSearch]             = useState('');
  const [serialForm, setSerialForm]     = useState<Record<string, string>>({});
  const [adding, setAdding]             = useState<string | null>(null);

  const existingCatalogIds = new Set(equipment.map(e => e.catalog_item_id));
  const filteredCatalog = catalog.filter(c =>
    !existingCatalogIds.has(c.id) &&
    (catFilter === '' || c.category_id === catFilter) &&
    (search === '' || c.name.includes(search) || c.name_en?.toLowerCase().includes(search.toLowerCase()))
  );

  const addEquipment = async (item: typeof catalog[0]) => {
    setAdding(item.id);
    try {
      const { error } = await supabase.from('vendor_equipment').insert({
        vendor_id: vendor!.id,
        catalog_item_id: item.id,
        name: item.name,
        type: item.equipment_categories?.name || '',
        serial_number: serialForm[item.id] || null,
        quantity: 1,
      });
      if (error) throw error;
      showSuccess('تمت إضافة المعدة');
      await refetch();
      setShowModal(false);
    } catch { showError('حدث خطأ'); }
    finally { setAdding(null); }
  };

  const deleteEquipment = async (id: string) => {
    const { error } = await supabase.from('vendor_equipment').delete().eq('id', id);
    if (!error) { showSuccess('تم الحذف'); refetch(); }
    else showError('حدث خطأ');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: t.text.secondary }}>معداتي ({equipment.length})</span>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={15} /> إضافة معدة
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
          {[...Array(4)].map((_,i) => <SkeletonCard key={i} rows={2} />)}
        </div>
      ) : equipment.length === 0 ? (
        <VCard><EmptyState icon={<Camera size={40} />} title="لا توجد معدات بعد" subtitle="أضف معداتك من الكتالوج" /></VCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
          {equipment.map(eq => (
            <VCard key={eq.id} style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
              <button onClick={() => deleteEquipment(eq.id)} style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#ef4444', display: 'flex', padding: 4 }}>
                <Trash2 size={13} />
              </button>
              <div style={{ width: '100%', height: 90, borderRadius: 8, overflow: 'hidden', background: t.background.filter, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {eq.equipment_catalog?.image_url
                  ? <img src={eq.equipment_catalog.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Camera size={28} style={{ opacity: 0.25, color: t.text.muted }} />
                }
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: t.text.primary, textAlign: 'center' }}>{eq.name}</div>
              {eq.serial_number && <div style={{ fontSize: '0.65rem', color: t.text.muted, textAlign: 'center', direction: 'ltr' }}>S/N: {eq.serial_number}</div>}
              {eq.equipment_catalog?.equipment_categories && (
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 5, background: 'rgba(37,99,235,0.08)', color: t.primary.main }}>{eq.equipment_catalog.equipment_categories.name}</span>
                </div>
              )}
            </VCard>
          ))}
        </div>
      )}

      {/* Catalog picker modal */}
      <VModal open={showModal} onClose={() => setShowModal(false)} title="اختر من كتالوج المعدات" width={580}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <SearchIcon size={15} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: t.text.muted }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." dir="rtl"
              style={{ width: '100%', padding: '8px 32px 8px 10px', borderRadius: 8, border: `1px solid ${t.border.default}`, background: t.background.input, color: t.text.primary, fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} dir="rtl"
            style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${t.border.default}`, background: t.background.input, color: t.text.primary, fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem', outline: 'none' }}>
            <option value="">كل الفئات</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {loadingCatalog ? <SkeletonCard rows={3} /> : filteredCatalog.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: t.text.muted, fontSize: '0.83rem' }}>لا توجد نتائج</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
            {filteredCatalog.map(item => (
              <div key={item.id} style={{ borderRadius: 10, border: `1px solid ${t.border.default}`, overflow: 'hidden', background: t.background.card }}>
                <div style={{ width: '100%', height: 80, background: t.background.filter, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {item.image_url ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={24} style={{ opacity: 0.2, color: t.text.muted }} />}
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: t.text.primary, marginBottom: 4 }}>{item.name}</div>
                  <input
                    value={serialForm[item.id] || ''}
                    onChange={e => setSerialForm(f => ({ ...f, [item.id]: e.target.value }))}
                    placeholder="Serial (اختياري)"
                    dir="ltr"
                    style={{ width: '100%', padding: '4px 6px', borderRadius: 5, border: `1px solid ${t.border.default}`, background: t.background.input, color: t.text.primary, fontFamily: 'Tajawal, sans-serif', fontSize: '0.68rem', outline: 'none', marginBottom: 6, boxSizing: 'border-box' }}
                  />
                  <button onClick={() => addEquipment(item)} disabled={adding === item.id}
                    style={{ width: '100%', padding: '5px', borderRadius: 6, background: t.primary.main, border: 'none', color: 'white', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontWeight: 600 }}>
                    {adding === item.id ? '...' : 'إضافة'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </VModal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────
const DOC_TYPES = [
  { k: 'national_id',    l: 'الهوية الوطنية',    ic: '🪪' },
  { k: 'passport',       l: 'جواز السفر',         ic: '📕' },
  { k: 'visa',           l: 'تأشيرة',             ic: '✈️' },
  { k: 'other',          l: 'مستند عام',          ic: '📎' },
];

export function VendorDocumentsPage() {
  const { vendor } = useVendor();
  const { showSuccess, showError } = useNotification();
  const { docs, loading, refetch } = useVendorDocuments(vendor?.id || '');
  const t = useVT();

  const [docType, setDocType]     = useState('national_id');
  const [uploading, setUploading] = useState(false);
  const [replacing, setReplacing] = useState<string | null>(null);
  const fileRef  = useRef<HTMLInputElement>(null);
  const replRef  = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, docId?: string) => {
    if (docId) setReplacing(docId);
    else setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `vendor-docs/${vendor!.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('vendor-documents').upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('vendor-documents').getPublicUrl(path);

      if (docId) {
        const { error } = await supabase.from('vendor_documents').update({ file_url: publicUrl, file_name: file.name }).eq('id', docId);
        if (error) throw error;
        showSuccess('تم استبدال الملف');
      } else {
        const { error } = await supabase.from('vendor_documents').insert({
          vendor_id: vendor!.id,
          document_type: docType,
          file_url: publicUrl,
          file_name: file.name,
        });
        if (error) throw error;
        showSuccess('تم رفع المستند');
      }
      await refetch();
    } catch { showError('حدث خطأ أثناء الرفع'); }
    finally { setUploading(false); setReplacing(null); }
  };

  const deleteDoc = async (id: string) => {
    const { error } = await supabase.from('vendor_documents').delete().eq('id', id);
    if (!error) { showSuccess('تم الحذف'); refetch(); }
    else showError('حدث خطأ');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Upload card */}
      <VCard>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: t.text.secondary, marginBottom: 10 }}>رفع مستند جديد</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {DOC_TYPES.map(dt => (
            <button key={dt.k} onClick={() => setDocType(dt.k)}
              style={{ padding: '5px 11px', borderRadius: 7, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: '0.78rem', fontWeight: docType === dt.k ? 700 : 400, background: docType === dt.k ? 'rgba(37,99,235,0.1)' : t.background.filter, border: `1px solid ${docType === dt.k ? 'rgba(59,130,246,0.35)' : t.border.default}`, color: docType === dt.k ? t.primary.main : t.text.muted }}>
              {dt.ic} {dt.l}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, background: uploading ? t.background.filter : 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: uploading ? t.text.muted : 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer' }}>
          <Upload size={15} /> {uploading ? 'جارٍ الرفع...' : 'اختر ملفاً'}
        </button>
      </VCard>

      {/* Docs list */}
      <VCard style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.625rem 1rem', borderBottom: `1px solid ${t.border.default}`, fontSize: '0.73rem', fontWeight: 700, color: t.text.muted }}>
          المستندات ({docs.length})
        </div>
        {loading ? <div style={{ padding: '1rem' }}><SkeletonCard rows={2} /></div> :
         docs.length === 0 ? <EmptyState icon={<FileArchive size={36} />} title="لا توجد مستندات بعد" /> :
         docs.map(doc => {
           const dt = DOC_TYPES.find(d => d.k === doc.document_type);
           return (
             <div key={doc.id} style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${t.border.default}`, display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.14s' }}
               onMouseEnter={e => (e.currentTarget.style.background = t.background.hover)}
               onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
               <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(37,99,235,0.07)', border: `1px solid rgba(59,130,246,0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>{dt?.ic || '📄'}</div>
               <div style={{ flex: 1, minWidth: 0 }}>
                 <div style={{ fontSize: '0.8rem', fontWeight: 600, color: t.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</div>
                 <div style={{ fontSize: '0.67rem', color: t.text.muted, marginTop: 1 }}>{dt?.l} · {new Date(doc.created_at).toLocaleDateString('ar-SA')}</div>
               </div>
               {/* Actions */}
               <a href={doc.file_url} target="_blank" rel="noopener noreferrer" title="معاينة"
                 style={{ color: t.primary.main, display: 'flex', padding: 5, borderRadius: 6, background: 'rgba(37,99,235,0.06)' }}>
                 <Eye size={15} />
               </a>
               <a href={doc.file_url} download title="تحميل"
                 style={{ color: '#10b981', display: 'flex', padding: 5, borderRadius: 6, background: 'rgba(16,185,129,0.06)' }}>
                 <Download size={15} />
               </a>
               <input ref={replRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                 onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, doc.id); e.target.value = ''; }} />
               <button onClick={() => replRef.current?.click()} title="استبدال" disabled={replacing === doc.id}
                 style={{ color: '#f59e0b', display: 'flex', padding: 5, borderRadius: 6, background: 'rgba(245,158,11,0.06)', border: 'none', cursor: 'pointer' }}>
                 <Upload size={15} />
               </button>
               <button onClick={() => deleteDoc(doc.id)} title="حذف"
                 style={{ color: t.status.error.main, display: 'flex', padding: 5, borderRadius: 6, background: 'rgba(239,68,68,0.06)', border: 'none', cursor: 'pointer' }}>
                 <Trash2 size={15} />
               </button>
             </div>
           );
         })
        }
      </VCard>
    </div>
  );
}

