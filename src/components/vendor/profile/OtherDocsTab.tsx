import { useState } from 'react';
import {
  FileText, Lock, Award, Paperclip, Upload,
  Loader2, Trash2, Image, Eye,
} from 'lucide-react';
import { useNotification } from '../../../contexts/NotificationContext';
import { PageCard, FieldLabel, TextInput } from '../shared';

const DOC_TYPES_LIST = [
  { k: 'contract', l: 'عقد', Icon: FileText, color: '#3b82f6' },
  { k: 'nda', l: 'NDA', Icon: Lock, color: '#8b5cf6' },
  { k: 'certificate', l: 'شهادة', Icon: Award, color: '#f59e0b' },
  { k: 'other', l: 'أخرى', Icon: Paperclip, color: '#64748b' },
];

interface OtherDocsTabProps {
  otherDocs: any[];
  uploadingDoc: boolean;
  docType: string;
  setDocType: (v: string) => void;
  docRef: React.RefObject<HTMLInputElement>;
  uploadDocument: (file: File, type: string, isTravel: boolean) => Promise<void>;
  deleteDocument: (id: string, isTravel: boolean) => Promise<void>;
}

export function OtherDocsTab({ otherDocs, uploadingDoc, docType, setDocType, docRef, uploadDocument, deleteDocument }: OtherDocsTabProps) {
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

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {DOC_TYPES_LIST.map(dt => (
          <button key={dt.k} onClick={() => { setDocType(dt.k); if (dt.k !== 'other') setCustomName(''); }} className={`vp-chip${docType === dt.k ? ' active' : ''}`}>
            <dt.Icon size={13} /> {dt.l}
          </button>
        ))}
      </div>

      {docType === 'other' && (
        <div style={{ marginBottom: 12, animation: 'fadeUp .2s ease' }}>
          <FieldLabel>اسم المستند <span style={{ color: '#ef4444' }}>*</span></FieldLabel>
          <TextInput value={customName} onChange={(e: any) => setCustomName(e.target.value)} placeholder="مثال: شهادة تدريب، رخصة قيادة..." />
        </div>
      )}

      <input ref={docRef as any} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) uploadDocument(f, docType === 'other' ? `other:${customName.trim()}` : docType, false);
          e.target.value = '';
        }} />
      <button onClick={() => {
        if (docType === 'other' && !customName.trim()) { showError('أدخل اسم المستند أولاً'); return; }
        (docRef as any).current?.click();
      }} disabled={uploadingDoc} className="vp-btn-primary" style={{ padding: '8px 16px', fontSize: '.78rem', marginBottom: 16 }}>
        {uploadingDoc ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploadingDoc ? 'جارٍ الرفع...' : 'اختر ملفاً لرفعه'}
      </button>

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
