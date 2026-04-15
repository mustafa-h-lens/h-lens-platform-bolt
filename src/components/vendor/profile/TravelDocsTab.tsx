import { useState } from 'react';
import {
  Hash, Plane, FileText, Upload, Pencil, X, Check,
  Loader2, Trash2, AlertTriangle, Eye,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { PageCard, FieldLabel, TextInput } from '../shared';

const VISA_TYPES = [
  { k: 'visa_usa', label: 'تأشيرة أمريكا', flag: '🇺🇸' },
  { k: 'visa_uk', label: 'تأشيرة بريطانيا', flag: '🇬🇧' },
  { k: 'visa_schengen', label: 'تأشيرة شنغن', flag: '🇪🇺' },
  { k: 'visa_japan', label: 'تأشيرة اليابان', flag: '🇯🇵' },
];

interface TravelDocsTabProps {
  vendor: any;
  travelDocs: any[];
  uploadingTravel: boolean;
  travelRef: React.RefObject<HTMLInputElement>;
  uploadDocument: (file: File, type: string, isTravel: boolean) => Promise<void>;
  deleteDocument: (id: string, isTravel: boolean) => Promise<void>;
  passportNumber: string;
  setPassportNumber: (v: string) => void;
}

export function TravelDocsTab({ vendor, travelDocs, uploadingTravel, travelRef, uploadDocument, deleteDocument, passportNumber, setPassportNumber }: TravelDocsTabProps) {
  const [travelType, setTravelType] = useState('passport');
  const [selectedVisa, setSelectedVisa] = useState('visa_usa');
  const [editingPassport, setEditingPassport] = useState(false);
  const [savingPassport, setSavingPassport] = useState(false);
  const { showSuccess, showError } = useNotification();

  const currentType = travelType === 'passport' ? 'passport' : selectedVisa;
  const passportDocs = travelDocs.filter((d: any) => d.document_type === 'passport');
  const visaDocs = travelDocs.filter((d: any) => d.document_type !== 'passport');
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

      <input ref={travelRef as any} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadDocument(f, currentType, true); e.target.value = ''; }} />
      <button onClick={() => (travelRef as any).current?.click()} disabled={uploadingTravel} className="vp-btn-primary" style={{ padding: '8px 16px', fontSize: '.78rem', marginBottom: 16 }}>
        {uploadingTravel ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploadingTravel ? 'جارٍ الرفع...' : `رفع ${travelType === 'passport' ? 'جواز السفر' : typeLabels[selectedVisa] || 'تأشيرة'}`}
      </button>

      {/* ── Passport Section ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--textSec)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plane size={14} style={{ color: '#06b6d4' }} /> جوازات السفر
        </div>

        {/* Passport number — only show after passport is uploaded */}
        {passportDocs.length > 0 && (
          <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--statBg)', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <FieldLabel icon={Hash}>رقم جواز السفر</FieldLabel>
              {!editingPassport ? (
                <button onClick={() => setEditingPassport(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tagC)', fontSize: '.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Cairo, sans-serif' }}><Pencil size={11} /> تعديل</button>
              ) : (
                <button onClick={() => setEditingPassport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Cairo, sans-serif' }}><X size={11} /> إلغاء</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <TextInput value={passportNumber} onChange={(e: any) => setPassportNumber(e.target.value)} placeholder="أدخل رقم جواز السفر" dir="ltr" disabled={!editingPassport} />
              {editingPassport && (
                <button onClick={savePassport} disabled={savingPassport} className="vp-btn-primary" style={{ padding: '8px 14px', fontSize: '.76rem', flexShrink: 0 }}>
                  {savingPassport ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} حفظ
                </button>
              )}
            </div>
            {!passportNumber && !editingPassport && (
              <div style={{ fontSize: '.7rem', color: '#f59e0b', marginTop: 6 }}>لم يتم إدخال رقم الجواز بعد — اضغط تعديل لإضافته</div>
            )}
          </div>
        )}

        {passportDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.2rem', color: 'var(--textMut)', fontSize: '.78rem', border: '1px dashed var(--border)', borderRadius: 10 }}>لا توجد جوازات سفر مرفوعة</div>
        ) : (
          <DocList docs={passportDocs} typeLabels={typeLabels} deleteDocument={deleteDocument} />
        )}
      </div>

      {/* ── Visas Section ── */}
      <div>
        <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--textSec)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={14} style={{ color: '#06b6d4' }} /> التأشيرات
        </div>

        {visaDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.2rem', color: 'var(--textMut)', fontSize: '.78rem', border: '1px dashed var(--border)', borderRadius: 10 }}>لا توجد تأشيرات مرفوعة</div>
        ) : (
          <DocList docs={visaDocs} typeLabels={typeLabels} deleteDocument={deleteDocument} />
        )}
      </div>
    </PageCard>
  );
}

function DocList({ docs, typeLabels, deleteDocument }: { docs: any[]; typeLabels: Record<string, string>; deleteDocument: (id: string, isTravel: boolean) => Promise<void> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {docs.map((doc: any) => (
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
  );
}
