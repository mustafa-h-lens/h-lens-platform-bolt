import { Camera, Lock, CircleDot } from 'lucide-react';
import { DEMO_EQUIPMENT } from './fixtures';
import { PreviewBanner, PreviewRibbon, LockedActionHint } from './PreviewRibbon';

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);

export const PreviewEquipment = ({ isApproved = false }: { isApproved?: boolean }) => (
  <div style={{ padding: 16, color: 'var(--color-text-primary)' }}>
    <PreviewBanner message="هذه معدات تجريبية لتعريفك بشكل صفحة المعدات. ستحلّ معداتك الحقيقية مكانها فور إضافة أول معدة لك." />

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>المعدات</h2>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>نماذج تعريفية</div>
      </div>
      {!isApproved && (
        <button
          type="button"
          disabled
          title="متاح بعد الموافقة على حسابك"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10,
            background: 'var(--color-background-hover, rgba(148,163,184,0.1))',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)', cursor: 'not-allowed', fontSize: 13, fontWeight: 600,
          }}
        >
          <Lock size={14} /> إضافة معدة
        </button>
      )}
    </div>

    <div className="vp-preview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(240px,100%),1fr))', gap: 12 }}>
      {DEMO_EQUIPMENT.map((e) => (
        <div
          key={e.id}
          style={{
            position: 'relative',
            borderRadius: 14,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            padding: 16,
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(15,23,42,0.04)',
          }}
        >
          <PreviewRibbon />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(37,99,235,0.14)', border: '1px solid rgba(59,130,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Camera size={18} style={{ color: '#2563eb' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)' }}>{e.name}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{e.brand}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <div>التصنيف: <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{e.category}</span></div>
            <div>الرقم التسلسلي: <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{e.serial}</span></div>
            <div>السعر اليومي: <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{fmt(e.dailyRate)} ر.س</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <CircleDot size={10} style={{ color: e.available ? '#16a34a' : '#dc2626' }} />
              <span style={{ color: e.available ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                {e.available ? 'متاحة' : 'قيد الاستخدام'}
              </span>
            </div>
          </div>

          {!isApproved && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
              <LockedActionHint />
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);
