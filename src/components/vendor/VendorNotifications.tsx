import { useState, useEffect } from 'react';
import { Bell, FolderOpen, Receipt, FileStack, Zap, Clock, Lightbulb } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useVendor } from '../../contexts/VendorContext';
import { PageCard, EmptyState, LoadingSpinner, Pagination } from './shared';

interface Notification {
  id: string;
  type: 'project' | 'invoice' | 'document' | 'system' | 'suggestion';
  title: string;
  description: string;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  project:  { icon: FolderOpen, color: '#3b82f6', label: 'مشروع'  },
  invoice:  { icon: Receipt,    color: '#f59e0b', label: 'فاتورة' },
  document: { icon: FileStack,  color: '#06b6d4', label: 'مستند'  },
  system:     { icon: Zap,        color: '#8b5cf6', label: 'نظام'     },
  suggestion: { icon: Lightbulb,  color: '#f59e0b', label: 'اقتراح'   },
};

export function VendorNotifications() {
  const { vendor } = useVendor();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => { if (vendor?.id) fetchNotifications(); }, [vendor?.id]);

  const fetchNotifications = async () => {
    if (!vendor?.id) return;
    setLoading(true);
    try {
      const items: Notification[] = [];

      // Derive notifications from recent data (Strategy A - no extra table needed)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = ninetyDaysAgo; // extended to 90 days

      const [invRes, docRes, sugRes] = await Promise.all([
        supabase
          .from('vendor_invoices')
          .select('id, amount_total, status, created_at, project_id, projects(name)')
          .eq('vendor_id', vendor.id)
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('vendor_documents')
          .select('id, file_name, document_type, created_at')
          .eq('vendor_id', vendor.id)
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('vendor_suggestions')
          .select('id, title, status, admin_response, responded_at, updated_at')
          .eq('vendor_id', vendor.id)
          .not('admin_response', 'is', null)
          .order('responded_at', { ascending: false })
          .limit(10),
      ]);

      // Project assignments (derived from first invoice per project)
      const seenProjects = new Set<string>();
      (invRes.data || []).forEach((inv: any) => {
        if (inv.projects && inv.project_id && !seenProjects.has(inv.project_id)) {
          seenProjects.add(inv.project_id);
          items.push({
            id: `proj-${inv.project_id}`,
            type: 'project',
            title: 'تم إسنادك لمشروع',
            description: inv.projects.name || 'مشروع',
            created_at: inv.created_at,
          });
        }
      });

      // Invoices
      (invRes.data || []).forEach((i: any) => {
        const isPaid = i.status === 'paid';
        items.push({
          id: `inv-${i.id}`,
          type: 'invoice',
          title: isPaid ? 'تم سداد فاتورة' : 'فاتورة جديدة',
          description: `${i.amount_total?.toLocaleString('en-US')} SAR — ${i.projects?.name || ''}`,
          created_at: i.created_at,
        });
      });

      // Documents
      (docRes.data || []).forEach((d: any) => {
        items.push({
          id: `doc-${d.id}`,
          type: 'document',
          title: 'مستند جديد',
          description: d.file_name || d.document_type,
          created_at: d.created_at,
        });
      });

      // Suggestion responses
      const STATUS_LABELS: Record<string, string> = {
        under_review: 'قيد المراجعة',
        accepted: 'تم قبول اقتراحك',
        rejected: 'تم رفض الاقتراح',
        implemented: 'تم تنفيذ اقتراحك',
      };
      (sugRes.data || []).forEach((s: any) => {
        items.push({
          id: `sug-${s.id}`,
          type: 'suggestion',
          title: STATUS_LABELS[s.status] || 'رد على اقتراحك',
          description: `${s.title}${s.admin_response ? ' — ' + s.admin_response.slice(0, 60) : ''}`,
          created_at: s.responded_at || s.updated_at,
        });
      });

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(items);
    } catch (err) {
      console.error('Notifications fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} ساعة`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `منذ ${days} يوم`;
    return new Date(date).toLocaleDateString('en-US');
  };

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);

  const filters = [
    { k: 'all',      l: 'الكل' },
    { k: 'project',  l: 'المشاريع' },
    { k: 'invoice',  l: 'الفواتير' },
    { k: 'document',   l: 'المستندات' },
    { k: 'suggestion', l: 'الاقتراحات' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Count badge */}
      {notifications.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '.78rem', color: 'var(--textMut)' }}>{notifications.length} إشعار</span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f.k} onClick={() => { setFilter(f.k); setPage(1); }}
            style={{
              padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'Tajawal, sans-serif', fontSize: '0.78rem',
              fontWeight: filter === f.k ? 700 : 400, transition: 'all 0.15s',
              background: filter === f.k ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filter === f.k ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.07)'}`,
              color: filter === f.k ? '#3b82f6' : 'rgba(255,255,255,0.35)',
            }}>
            {f.l}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={Bell} message="لا توجد إشعارات" />
      ) : (
        <PageCard style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((n, idx) => {
            const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
            const Icon = config.icon;
            return (
              <div
                key={n.id}
                style={{
                  padding: '0.875rem 1rem',
                  borderBottom: idx < filtered.length - 1 ? `1px solid ${'rgba(255,255,255,0.07)'}` : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  transition: 'background 0.14s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${config.color}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={17} style={{ color: config.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{n.title}</span>
                    <span style={{
                      fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4,
                      background: `${config.color}12`, color: config.color, fontWeight: 600,
                    }}>{config.label}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{n.description}</div>
                  <div style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.35)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={10} /> {timeAgo(n.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
          <Pagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </PageCard>
      )}
    </div>
  );
}
