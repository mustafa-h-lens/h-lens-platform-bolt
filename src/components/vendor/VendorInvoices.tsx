import { useState, useEffect } from 'react';
import { Banknote, Clock, FileText, ChevronDown, ChevronUp, CheckCircle, User, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { cached } from '../../lib/cache';
import { useVendor } from '../../contexts/VendorContext';
import { StatusBadge, EmptyState, LoadingSpinner, Pagination } from './shared';

interface InvoiceData {
  id: string;
  amount_total: number;
  amount_paid: number;
  amount_remaining: number;
  status: string;
  category_name: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  project_name: string;
  client_name: string;
  client_image: string | null;
}

export function VendorInvoices() {
  const { vendor } = useVendor();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => { if (vendor?.id) fetchInvoices(); }, [vendor?.id]);

  const fetchInvoices = async () => {
    if (!vendor?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_invoices')
        .select('*, projects(name, clients(name, client_image))')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const categoryIds = [...new Set((data || []).map((i: any) => i.category).filter(Boolean))];
      let categoryMap: Record<string, string> = {};
      if (categoryIds.length > 0) {
        const { data: fields } = await supabase.from('vendor_fields').select('id, name_ar').in('id', categoryIds);
        (fields || []).forEach(f => { categoryMap[f.id] = f.name_ar; });
      }

      setInvoices((data || []).map((inv: any) => ({
        id: inv.id,
        amount_total: inv.amount_total || 0,
        amount_paid: inv.amount_paid || 0,
        amount_remaining: inv.amount_remaining || 0,
        status: inv.status,
        category_name: inv.category ? categoryMap[inv.category] || null : null,
        due_date: inv.due_date,
        notes: inv.notes,
        created_at: inv.created_at,
        project_name: inv.projects?.name || '—',
        client_name: inv.projects?.clients?.name || '',
        client_image: inv.projects?.clients?.client_image || null,
      })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalAmount = invoices.reduce((a, i) => a + i.amount_total, 0);
  const totalPaid = invoices.reduce((a, i) => a + i.amount_paid, 0);
  const totalRemaining = invoices.reduce((a, i) => a + i.amount_remaining, 0);
  const paidPercent = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

  const filtered = filter === 'all' ? invoices : invoices.filter(i => {
    if (filter === 'unpaid') return i.status !== 'paid';
    return i.status === filter;
  });

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const SUMMARY = [
    { l: 'إجمالي المستحقات', v: totalAmount, c: '#3b82f6', icon: FileText },
    { l: 'تم السداد', v: totalPaid, c: '#10b981', icon: Banknote },
    { l: 'متبقي', v: totalRemaining, c: '#f59e0b', icon: Clock },
  ];

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Summary */}
      <div className="vp-grid-3">
        {SUMMARY.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="vp-card sc" style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', bottom: -14, left: -14, width: 60, height: 60, borderRadius: '50%', background: `${s.c}15`, filter: 'blur(18px)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${s.c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Icon size={16} style={{ color: s.c }} />
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: s.c, direction: 'ltr', lineHeight: 1, marginBottom: 3 }}>
                  {s.v.toLocaleString('en-US')} <span style={{ fontSize: '.6rem', fontWeight: 600 }}>SAR</span>
                </div>
                <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--textSec)' }}>{s.l}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress */}
      {totalAmount > 0 && (
        <div className="vp-card" style={{ padding: '12px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--textSec)' }}>نسبة السداد</span>
            <span style={{ fontSize: '.75rem', fontWeight: 800, color: paidPercent === 100 ? '#10b981' : '#3b82f6' }}>{paidPercent}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--border)' }}>
            <div style={{ height: '100%', borderRadius: 3, width: `${paidPercent}%`, background: paidPercent === 100 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #06b6d4)', transition: 'width 0.5s' }} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[{ k: 'all', l: 'الكل' }, { k: 'pending', l: 'معلقة' }, { k: 'partial', l: 'جزئية' }, { k: 'paid', l: 'مدفوعة' }].map(f => (
          <button key={f.k} onClick={() => { setFilter(f.k); setPage(1); }} className={`vp-chip${filter === f.k ? ' active' : ''}`}>
            {f.l} {f.k === 'all' && <span style={{ fontSize: '.68rem', opacity: 0.6 }}>({invoices.length})</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={FileText} message="لا توجد فواتير" />
      ) : (
        <div className="vp-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 16 }}>
          <div className="vp-tbl-grid vp-tbl-grid-head">
            <span>العميل / المشروع</span>
            <span>الدور</span>
            <span>المبلغ</span>
            <span>المدفوع</span>
            <span>التاريخ</span>
            <span>الحالة</span>
            <span></span>
          </div>

          {paged.map(inv => {
            const isExpanded = expandedId === inv.id;
            const percent = inv.amount_total > 0 ? Math.round((inv.amount_paid / inv.amount_total) * 100) : 0;
            const initials = inv.client_name.split(' ').slice(0, 2).map(w => w[0]).join('');

            return (
              <div key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                  className="vp-tbl-grid"
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right', fontFamily: 'Cairo, sans-serif', color: 'var(--textPri)', transition: 'background .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--rowHover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    {inv.client_image ? (
                      <img src={inv.client_image} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg, #0a2a66, #1b4fa9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 800, color: 'white' }}>{initials}</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '.68rem', color: 'var(--textMut)' }}>{inv.client_name}</div>
                      <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--textPri)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.project_name}</div>
                    </div>
                  </div>
                  <div>{inv.category_name ? <span style={{ fontSize: '.68rem', padding: '2px 8px', borderRadius: 5, background: 'var(--tagBg)', color: 'var(--tagC)', fontWeight: 600 }}>{inv.category_name}</span> : <span style={{ fontSize: '.72rem', color: 'var(--textMut)' }}>—</span>}</div>
                  <div style={{ fontSize: '.82rem', fontWeight: 800, color: 'var(--textPri)', direction: 'ltr' }}>{inv.amount_total.toLocaleString('en-US')} <span style={{ fontSize: '.6rem', color: 'var(--textMut)' }}>SAR</span></div>
                  <div>
                    <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#10b981', direction: 'ltr' }}>{inv.amount_paid.toLocaleString('en-US')} <span style={{ fontSize: '.6rem' }}>SAR</span></div>
                    <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', marginTop: 4, width: '80%' }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${percent}%`, background: percent === 100 ? '#10b981' : '#3b82f6' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--textSec)' }}>{fmtDate(inv.created_at)}</div>
                  <StatusBadge status={inv.status} />
                  {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--textMut)' }} /> : <ChevronDown size={14} style={{ color: 'var(--textMut)' }} />}
                </button>

                {isExpanded && (
                  <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', background: 'var(--rowHover)' }}>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '.75rem', color: 'var(--textMut)' }}>
                      <span><strong style={{ color: 'var(--textSec)' }}>المتبقي:</strong> <span style={{ color: inv.amount_remaining > 0 ? '#f59e0b' : '#10b981', fontWeight: 700, direction: 'ltr' }}>{inv.amount_remaining.toLocaleString('en-US')} SAR</span></span>
                      <span>السداد: <strong style={{ color: percent === 100 ? '#10b981' : '#3b82f6' }}>{percent}%</strong></span>
                      {inv.due_date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> استحقاق: {fmtDate(inv.due_date)}</span>}
                      {percent === 100 && <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} /> مسدد بالكامل</span>}
                    </div>
                    {inv.notes && (
                      <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--border)', fontSize: '.75rem', color: 'var(--textSec)', lineHeight: 1.6 }}>{inv.notes}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <Pagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
