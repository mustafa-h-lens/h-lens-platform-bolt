import { Banknote, Clock, FileText, Calendar, CheckCircle, Lock } from 'lucide-react';
import { DEMO_INVOICES } from './fixtures';
import { PreviewBanner, PreviewRibbon, LockedActionHint } from './PreviewRibbon';

const statusStyle = (status: string) => {
  switch (status) {
    case 'مدفوعة': return { bg: 'rgba(22,163,74,0.12)', border: 'rgba(22,163,74,0.35)', color: '#16a34a', icon: CheckCircle };
    case 'معلقة':  return { bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.4)',  color: '#b45309', icon: Clock };
    default:       return { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)', color: '#475569', icon: FileText };
  }
};

const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);

export const PreviewInvoices = ({ isApproved = false }: { isApproved?: boolean }) => {
  return (
    <div style={{ padding: 16, color: 'var(--color-text-primary)' }}>
      <PreviewBanner message="هذه فواتير تجريبية لتعريفك بشكل صفحة الفواتير والمدفوعات. ستحلّ فواتيرك الحقيقية مكانها فور إصدار أول فاتورة لك." />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>الفواتير والمدفوعات</h2>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>نماذج تعريفية</div>
        </div>
        {!isApproved && (
          <button
            type="button"
            disabled
            title="متاح بعد الموافقة على حسابك"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 16px', borderRadius: 10,
              background: 'var(--color-background-hover, rgba(148,163,184,0.1))',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)', cursor: 'not-allowed', fontSize: 13, fontWeight: 600,
            }}
          >
            <Lock size={14} />
            طلب فاتورة جديدة
          </button>
        )}
      </div>

      <div className="vp-preview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(260px,100%),1fr))', gap: 12 }}>
        {DEMO_INVOICES.map((inv) => {
          const s = statusStyle(inv.status);
          const Icon = s.icon;
          return (
            <div
              key={inv.id}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 14 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>{inv.number}</span>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 999,
                    background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                    fontSize: 11, fontWeight: 700,
                  }}
                >
                  <Icon size={12} />
                  {inv.status}
                </span>
              </div>

              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 10, lineHeight: 1.55 }}>
                {inv.projectName}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Banknote size={13} style={{ opacity: .7 }} />
                  المبلغ قبل الضريبة: <strong style={{ color: 'var(--color-text-primary)' }}>{fmt(inv.amount)} ر.س</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={13} style={{ opacity: .7 }} />
                  الإجمالي: <strong style={{ color: 'var(--color-text-primary)' }}>{fmt(inv.total)} ر.س</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={13} style={{ opacity: .7 }} />
                  الاستحقاق: {inv.dueAt}
                </div>
              </div>

              {!isApproved && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                  <LockedActionHint />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
