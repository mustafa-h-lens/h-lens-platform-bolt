import { ShoppingCart, Lock, CheckCircle, Clock, Package } from 'lucide-react';
import { DEMO_PURCHASE_ORDERS } from './fixtures';
import { PreviewBanner, PreviewRibbon, LockedActionHint } from './PreviewRibbon';

const statusStyle = (s: string) => {
  if (s === 'مُعتمد')        return { bg: 'rgba(22,163,74,0.12)', border: 'rgba(22,163,74,0.35)', color: '#15803d', Icon: CheckCircle };
  if (s === 'مستلم')         return { bg: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.35)', color: '#1d4ed8', Icon: Package };
  return { bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.4)',  color: '#b45309', Icon: Clock }; // قيد التحضير
};

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);

export const PreviewPurchaseOrders = () => (
  <div style={{ padding: 16, color: 'var(--color-text-primary)' }}>
    <PreviewBanner message="أوامر الشراء التجريبية التالية تعكس شكل الأوامر الحقيقية في المنصة بعد اعتماد حسابك." />

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>أوامر الشراء</h2>
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
        <Lock size={14} /> إنشاء أمر شراء
      </button>
    </div>

    <div className="vp-preview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(260px,100%),1fr))', gap: 12 }}>
      {DEMO_PURCHASE_ORDERS.map((po) => {
        const s = statusStyle(po.status);
        const Icon = s.Icon;
        return (
          <div
            key={po.id}
            style={{
              position: 'relative', borderRadius: 14,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              padding: 16, overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(15,23,42,0.04)',
            }}
          >
            <PreviewRibbon />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 14 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 700 }}>
                <ShoppingCart size={14} /> {po.number}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 999,
                background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                fontSize: 11, fontWeight: 700,
              }}>
                <Icon size={12} /> {po.status}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.5, marginBottom: 10 }}>
              {po.projectName}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              <div>عدد البنود: <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{po.items}</span></div>
              <div>الإجمالي: <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{fmt(po.total)} ر.س</span></div>
              <div>تاريخ الإصدار: {po.issuedAt}</div>
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
