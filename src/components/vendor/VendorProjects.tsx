import { useState, useEffect } from 'react';
import { Folder, User, Calendar, Zap, CheckCircle, ChevronDown, ChevronUp, Banknote, Clock, Receipt } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { cached } from '../../lib/cache';
import { useVendor } from '../../contexts/VendorContext';
import { StatusBadge, EmptyState, LoadingSpinner, Pagination } from './shared';

interface ProjectData {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  client_name: string;
  client_image: string | null;
  total_amount: number;
  total_paid: number;
  total_remaining: number;
  invoice_count: number;
  categories: string[];
}

export function VendorProjects() {
  const { vendor } = useVendor();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => { if (vendor?.id) fetchProjects(); }, [vendor?.id]);

  const fetchProjects = async () => {
    if (!vendor?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_invoices')
        .select('id, amount_total, amount_paid, amount_remaining, status, category, created_at, project_id, projects(id, name, status, start_date, end_date, clients(name, client_image))')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });

      const categoryIds = [...new Set((data || []).map((i: any) => i.category).filter(Boolean))];
      let categoryMap: Record<string, string> = {};
      if (categoryIds.length > 0) {
        const { data: fields } = await supabase.from('vendor_fields').select('id, name_ar').in('id', categoryIds);
        (fields || []).forEach(f => { categoryMap[f.id] = f.name_ar; });
      }

      if (!error && data) {
        const projectMap = new Map<string, ProjectData>();
        data.forEach((inv: any) => {
          if (!inv.projects || !inv.project_id) return;
          if (!projectMap.has(inv.project_id)) {
            projectMap.set(inv.project_id, {
              id: inv.projects.id, name: inv.projects.name, status: inv.projects.status,
              start_date: inv.projects.start_date, end_date: inv.projects.end_date,
              client_name: inv.projects.clients?.name || '', client_image: inv.projects.clients?.client_image || null,
              total_amount: inv.amount_total || 0, total_paid: inv.amount_paid || 0, total_remaining: inv.amount_remaining || 0,
              invoice_count: 1,
              categories: inv.category && categoryMap[inv.category] ? [categoryMap[inv.category]] : [],
            });
          } else {
            const p = projectMap.get(inv.project_id)!;
            p.total_amount += inv.amount_total || 0;
            p.total_paid += inv.amount_paid || 0;
            p.total_remaining += inv.amount_remaining || 0;
            p.invoice_count += 1;
            if (inv.category && categoryMap[inv.category] && !p.categories.includes(categoryMap[inv.category])) p.categories.push(categoryMap[inv.category]);
          }
        });
        setProjects(Array.from(projectMap.values()));
      }
    } catch { setProjects([]); }
    finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? projects : projects.filter(p => {
    if (filter === 'active') return ['in_progress', 'active', 'pending', 'request', 'quoted', 'invoiced', 'po_issued'].includes(p.status);
    return p.status === filter;
  });

  const totalEarnings = projects.reduce((a, p) => a + p.total_amount, 0);
  const totalPaid = projects.reduce((a, p) => a + p.total_paid, 0);
  const activeCount = projects.filter(p => ['in_progress', 'active', 'pending', 'request', 'quoted', 'invoiced', 'po_issued'].includes(p.status)).length;

  const STAT_CARDS = [
    { l: 'مشاريع جارية', v: activeCount, c: '#3b82f6', icon: Zap, isCurrency: true },
    { l: 'إجمالي الأرباح', v: `${totalEarnings.toLocaleString('en-US')}`, c: '#8b5cf6', icon: Banknote, isCurrency: true },
    { l: 'تم التحصيل', v: `${totalPaid.toLocaleString('en-US')}`, c: '#10b981', icon: CheckCircle, isCurrency: true },
  ];

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Stats */}
      <div className="vp-grid-3">
        {STAT_CARDS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="vp-card sc" style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', bottom: -14, left: -14, width: 60, height: 60, borderRadius: '50%', background: `${s.c}15`, filter: 'blur(18px)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: s.c, direction: 'ltr', lineHeight: 1 }}>
                    {s.v} {(s as any).isCurrency && <span style={{ fontSize: '.6rem', fontWeight: 600 }}>SAR</span>}
                  </div>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${s.c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} style={{ color: s.c }} />
                  </div>
                </div>
                <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--textSec)' }}>{s.l}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[{ k: 'all', l: 'الكل' }, { k: 'active', l: 'جارية' }, { k: 'completed', l: 'مكتملة' }].map(f => (
          <button key={f.k} onClick={() => { setFilter(f.k); setPage(1); }} className={`vp-chip${filter === f.k ? ' active' : ''}`}>
            {f.l} {f.k === 'all' && <span style={{ fontSize: '.68rem', opacity: 0.6 }}>({projects.length})</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={Folder} message="لا توجد مشاريع بعد" />
      ) : (
        <div className="vp-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 16 }}>
          {/* Table header */}
          <div className="vp-tbl-grid vp-tbl-grid-head">
            <span>العميل / المشروع</span>
            <span>الدور</span>
            <span>المبلغ</span>
            <span>المدفوع</span>
            <span>التاريخ</span>
            <span>الحالة</span>
            <span></span>
          </div>

          {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(p => {
            const isExpanded = expanded === p.id;
            const paidPercent = p.total_amount > 0 ? Math.round((p.total_paid / p.total_amount) * 100) : 0;
            const initials = p.client_name.split(' ').slice(0, 2).map(w => w[0]).join('');

            return (
              <div key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : p.id)}
                  className="vp-tbl-grid"
                  style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'right', fontFamily: 'Cairo, sans-serif',
                    color: 'var(--textPri)', transition: 'background .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--rowHover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Client + Project */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    {p.client_image ? (
                      <img src={p.client_image} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 800, color: 'white' }}>{initials}</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '.68rem', color: 'var(--textMut)' }}>{p.client_name}</div>
                      <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--textPri)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    </div>
                  </div>

                  {/* Role/categories */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {p.categories.length > 0 ? p.categories.map((c, i) => (
                      <span key={i} style={{ fontSize: '.68rem', padding: '2px 8px', borderRadius: 5, background: 'var(--tagBg)', color: 'var(--tagC)', fontWeight: 600 }}>{c}</span>
                    )) : <span style={{ fontSize: '.72rem', color: 'var(--textMut)' }}>—</span>}
                  </div>

                  {/* Amount */}
                  <div style={{ fontSize: '.82rem', fontWeight: 800, color: 'var(--textPri)', direction: 'ltr' }}>
                    {p.total_amount.toLocaleString('en-US')} <span style={{ fontSize: '.6rem', color: 'var(--textMut)' }}>SAR</span>
                  </div>

                  {/* Paid */}
                  <div>
                    <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#10b981', direction: 'ltr' }}>
                      {p.total_paid.toLocaleString('en-US')} <span style={{ fontSize: '.6rem' }}>SAR</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', marginTop: 4, width: '80%' }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${paidPercent}%`, background: paidPercent === 100 ? '#10b981' : '#3b82f6' }} />
                    </div>
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: '.75rem', color: 'var(--textSec)' }}>
                    {formatDate(p.start_date)}
                  </div>

                  {/* Status */}
                  <StatusBadge status={p.status} />

                  {/* Expand */}
                  {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--textMut)' }} /> : <ChevronDown size={14} style={{ color: 'var(--textMut)' }} />}
                </button>

                {isExpanded && (
                  <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', background: 'var(--rowHover)' }}>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '.75rem', color: 'var(--textMut)' }}>
                      <span><strong style={{ color: 'var(--textSec)' }}>المتبقي:</strong> <span style={{ color: p.total_remaining > 0 ? '#f59e0b' : '#10b981', fontWeight: 700, direction: 'ltr' }}>{p.total_remaining.toLocaleString('en-US')} SAR</span></span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Receipt size={12} /> {p.invoice_count} فاتورة</span>
                      {p.end_date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> نهاية: {formatDate(p.end_date)}</span>}
                      <span>السداد: <strong style={{ color: paidPercent === 100 ? '#10b981' : '#3b82f6' }}>{paidPercent}%</strong></span>
                      {paidPercent === 100 && <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} /> مسدد بالكامل</span>}
                    </div>
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
