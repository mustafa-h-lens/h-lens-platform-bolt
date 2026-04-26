import { MapPin, Briefcase, Calendar, Lock } from 'lucide-react';
import { DEMO_PROJECTS } from './fixtures';
import { PreviewBanner, PreviewRibbon, LockedActionHint } from './PreviewRibbon';

const statusStyle = (s: string) => {
  if (s === 'قيد التنفيذ') return { bg: 'rgba(37,99,235,0.12)',  border: 'rgba(37,99,235,0.35)',  color: '#1d4ed8' };
  if (s === 'مجدول')       return { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)', color: '#6d28d9' };
  return { bg: 'rgba(22,163,74,0.12)', border: 'rgba(22,163,74,0.35)', color: '#15803d' }; // مكتمل
};

const fmt = (n: number) => new Intl.NumberFormat('ar-SA').format(n);

export const PreviewProjects = () => (
  <div style={{ padding: 16, color: 'var(--color-text-primary)' }}>
    <PreviewBanner message="هذه مشاريع تجريبية لتعريفك بشكل صفحة المشاريع. ستحلّ مشاريعك الحقيقية مكانها فور إسناد أول مشروع لك." />

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>مشاريعي</h2>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>نماذج تعريفية</div>
      </div>
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
        <Lock size={14} /> إرسال مقترح
      </button>
    </div>

    <div className="vp-preview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(280px,100%),1fr))', gap: 12 }}>
      {DEMO_PROJECTS.map((p) => {
        const s = statusStyle(p.status);
        return (
          <div
            key={p.id}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 14 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '.05em' }}>{p.code}</span>
              <span style={{
                padding: '3px 10px', borderRadius: 999,
                background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                fontSize: 11, fontWeight: 700,
              }}>{p.status}</span>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.5, margin: '0 0 10px' }}>{p.name}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Briefcase size={13} style={{ opacity: .7 }} /> {p.client}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} style={{ opacity: .7 }} /> {p.city} · {p.role}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} style={{ opacity: .7 }} /> {p.startDate} → {p.endDate}
              </div>
              <div style={{ marginTop: 4, color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 13 }}>
                الميزانية: {fmt(p.budget)} ر.س
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
              <LockedActionHint />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
