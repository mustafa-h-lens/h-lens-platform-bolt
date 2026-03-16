import { useState, useEffect } from 'react';
import { Banknote, Clock, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useVendor } from '../../contexts/VendorContext';
import { StatusBadge, EmptyState, LoadingSpinner } from './shared';
import type { Invoice } from './shared/types';

export function VendorInvoices() {
  const { vendor } = useVendor();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (vendor?.id) fetchInvoices(); }, [vendor?.id]);

  const fetchInvoices = async () => {
    if (!vendor?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_invoices')
        .select('*, projects(name)')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });
      if (!error && data) setInvoices(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.amount_total, 0);
  const totalPending = invoices.filter(i => i.status !== 'paid').reduce((a, i) => a + i.amount_total, 0);
  const totalAmount = totalPaid + totalPending;
  const paidPercent = totalAmount === 0 ? 0 : Math.round((totalPaid / totalAmount) * 100);

  const SUMMARY = [
    { l: 'إجمالي المحصّل', v: totalPaid, c: '#10b981', icon: Banknote },
    { l: 'قيد الانتظار', v: totalPending, c: '#f59e0b', icon: Clock },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {SUMMARY.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="vp-card sc" style={{ padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', bottom: -14, left: -14, width: 60, height: 60, borderRadius: '50%', background: `${s.c}15`, filter: 'blur(18px)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Icon size={18} style={{ color: s.c }} />
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.c, direction: 'ltr', lineHeight: 1, marginBottom: 4 }}>
                  {s.v.toLocaleString('en-US')} SAR
                </div>
                <div style={{ fontSize: '.76rem', fontWeight: 700, color: 'var(--textSec)' }}>{s.l}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div className="vp-card" style={{ borderRadius: 18, overflow: 'hidden', padding: 0 }}>
        <div style={{
          padding: '10px 20px', background: 'var(--tblHead)', borderBottom: '1px solid var(--border)',
          fontSize: '.63rem', fontWeight: 700, color: 'var(--textMut)',
          textTransform: 'uppercase', letterSpacing: '.07em',
          display: 'grid', gridTemplateColumns: '1fr auto',
        }}>
          <span>المشروع</span>
          <span>الحالة</span>
        </div>
        {loading ? <LoadingSpinner /> : invoices.length === 0 ? (
          <EmptyState icon={FileText} message="لا توجد فواتير بعد" />
        ) : (
          invoices.map(inv => (
            <div key={inv.id} style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'grid', gridTemplateColumns: '1fr auto',
              alignItems: 'center', gap: 10, transition: 'background .15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--rowHover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--textPri)' }}>{inv.projects?.name || '—'}</div>
                <div style={{ fontSize: '.75rem', fontWeight: 800, color: 'var(--textSec)', direction: 'ltr', marginTop: 1 }}>
                  {inv.amount_total?.toLocaleString('en-US')} SAR
                </div>
                <div style={{ fontSize: '.68rem', color: 'var(--textMut)', marginTop: 1 }}>
                  {new Date(inv.created_at).toLocaleDateString('en-US')}
                </div>
              </div>
              <StatusBadge status={inv.status} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
