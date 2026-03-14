import { useState, useEffect, useRef } from 'react';
import { FileText, Lock, Award, Paperclip, Upload, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useVendor } from '../../contexts/VendorContext';
import { useNotification } from '../../contexts/NotificationContext';
import { PageCard, EmptyState, LoadingSpinner } from './shared';
import type { VendorDoc } from './shared/types';
import { ConfirmationModal } from '../shared/ConfirmationModal';

const DOC_TYPES = [
  { k: 'contract',    l: 'عقد',    Icon: FileText  },
  { k: 'nda',         l: 'NDA',    Icon: Lock      },
  { k: 'certificate', l: 'شهادة',  Icon: Award     },
  { k: 'other',       l: 'أخرى',   Icon: Paperclip },
];

export function VendorDocuments() {
  const { vendor } = useVendor();
  const { showSuccess, showError } = useNotification();

  const [docs, setDocs] = useState<VendorDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<string>('contract');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; docId: string | null }>({
    isOpen: false,
    docId: null,
  });

  useEffect(() => { if (vendor?.id) fetchDocs(); }, [vendor?.id]);

  const fetchDocs = async () => {
    if (!vendor?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('vendor_documents').select('*')
      .eq('vendor_id', vendor.id).order('created_at', { ascending: false });
    if (data) setDocs(data);
    setLoading(false);
  };

  const uploadDoc = async (file: File) => {
    if (!vendor?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `vendor-docs/${vendor.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('vendor-documents').upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('vendor-documents').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('vendor_documents').insert({
        vendor_id: vendor.id, document_type: docType,
        file_url: publicUrl, file_name: file.name, uploaded_by: vendor.id,
      });
      if (dbErr) throw dbErr;
      showSuccess('تم رفع المستند بنجاح');
      await fetchDocs();
    } catch { showError('حدث خطأ أثناء رفع المستند'); }
    finally { setUploading(false); }
  };

  const deleteDoc = (id: string) => {
    setDeleteConfirm({ isOpen: true, docId: id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.docId) return;

    const { error } = await supabase.from('vendor_documents').delete().eq('id', deleteConfirm.docId);
    if (!error) {
      showSuccess('تم الحذف');
      setDocs(prev => prev.filter(d => d.id !== deleteConfirm.docId));
    } else {
      showError('حدث خطأ أثناء الحذف');
    }

    setDeleteConfirm({ isOpen: false, docId: null });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Upload section */}
      <PageCard>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--textSec)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Upload size={15} /> رفع مستند جديد
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {DOC_TYPES.map(dt => {
            const Icon = dt.Icon;
            return (
              <button key={dt.k} onClick={() => setDocType(dt.k)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'Tajawal, sans-serif', fontSize: '0.78rem',
                  fontWeight: docType === dt.k ? 700 : 400, transition: 'all 0.15s',
                  background: docType === dt.k ? 'rgba(37,99,235,0.1)' : 'var(--rowHover)',
                  border: `1px solid ${docType === dt.k ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
                  color: docType === dt.k ? '#3b82f6' : 'var(--textMut)',
                }}>
                <Icon size={13} /> {dt.l}
              </button>
            );
          })}
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ''; }} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '0.625rem 1.25rem', borderRadius: 9,
            background: uploading ? 'var(--rowHover)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
            border: 'none', color: uploading ? 'var(--textMut)' : 'white',
            fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem', fontWeight: 700,
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'جارٍ الرفع...' : 'اختر ملفاً لرفعه'}
        </button>
      </PageCard>

      {/* Docs list */}
      <PageCard style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.625rem 0.875rem', borderBottom: `1px solid var(--border)`, fontSize: '0.74rem', fontWeight: 700, color: 'var(--textMut)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={13} /> المستندات المرفوعة ({docs.length})
        </div>
        {loading ? <LoadingSpinner /> : docs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--textMut)', fontSize: '0.82rem' }}>لا توجد مستندات بعد</div>
        ) : (
          docs.map(doc => {
            const dt = DOC_TYPES.find(d => d.k === doc.document_type);
            const Icon = dt?.Icon || FileText;
            return (
              <div key={doc.id} style={{
                padding: '0.75rem 0.875rem', borderBottom: `1px solid var(--border)`,
                display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.14s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--rowHover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(59,130,246,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={15} style={{ color: '#3b82f6' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--textPri)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</div>
                  <div style={{ fontSize: '0.67rem', color: 'var(--textMut)', marginTop: 1 }}>
                    {dt?.l} · {new Date(doc.created_at).toLocaleDateString('en-US')}
                  </div>
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', display: 'flex', padding: '4px 6px' }} title="تحميل">
                  <FileText size={16} />
                </a>
                <button onClick={() => deleteDoc(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px 6px', borderRadius: 5, display: 'flex' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </PageCard>

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, docId: null })}
      />
    </div>
  );
}
