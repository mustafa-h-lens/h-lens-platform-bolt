import { useState, useEffect } from 'react';
import {
  FolderOpen, Receipt, Camera, FileStack, User, Wrench,
  Upload, ChevronLeft, CheckCircle, Circle, AlertCircle,
  Clock, Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useVendor } from '../../contexts/VendorContext';
import { useProfileCompletion } from './hooks/useProfileCompletion';

interface DashboardStats {
  totalProjects: number;
  totalInvoices: number;
  equipmentCount: number;
  documentsCount: number;
}

interface ActivityItem {
  id: string;
  type: 'project' | 'invoice' | 'document';
  title: string;
  description: string;
  created_at: string;
}

export function VendorDashboard() {
  const { vendor, navigateTo } = useVendor();
  const completion = useProfileCompletion();

  const [stats, setStats] = useState<DashboardStats>({ totalProjects: 0, totalInvoices: 0, equipmentCount: 0, documentsCount: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (vendor?.id) fetchDashboard(); }, [vendor?.id]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [invRes, eqRes, docRes] = await Promise.all([
        supabase.from('vendor_invoices').select('id, amount_total, status, created_at, project_id, projects(id, name, status)').eq('vendor_id', vendor!.id).order('created_at', { ascending: false }),
        supabase.from('vendor_equipment').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor!.id),
        supabase.from('vendor_documents').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor!.id),
      ]);
      const invoices = invRes.data || [];
      // Derive unique projects from invoices (vendors are linked to projects via invoices)
      const projectMap = new Map<string, any>();
      invoices.forEach((inv: any) => {
        if (inv.projects && inv.project_id && !projectMap.has(inv.project_id)) {
          projectMap.set(inv.project_id, inv.projects);
        }
      });
      const uniqueProjects = Array.from(projectMap.values());
      setStats({ totalProjects: uniqueProjects.length, totalInvoices: invoices.length, equipmentCount: eqRes.count ?? 0, documentsCount: docRes.count ?? 0 });

      const items: ActivityItem[] = [];
      // Project activity from invoices (first invoice per project = assignment)
      const seenProjects = new Set<string>();
      invoices.forEach((inv: any) => {
        if (inv.projects && inv.project_id && !seenProjects.has(inv.project_id)) {
          seenProjects.add(inv.project_id);
          items.push({ id: `proj-${inv.project_id}`, type: 'project', title: `تم إسنادك لمشروع: ${inv.projects.name}`, description: 'مشروع جديد', created_at: inv.created_at });
        }
      });
      invoices.slice(0, 5).forEach((i: any) => { items.push({ id: `inv-${i.id}`, type: 'invoice', title: i.status === 'paid' ? 'فاتورة مدفوعة' : 'فاتورة جديدة', description: i.projects?.name || 'فاتورة', created_at: i.created_at }); });
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setActivity(items.slice(0, 20));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const STATS = [
    { icon: FolderOpen, label: 'المشاريع', value: stats.totalProjects, color: '#3b82f6', sub: stats.totalProjects === 0 ? 'بانتظار مشروع جديد' : 'مشروع', page: 'projects' as const },
    { icon: Receipt, label: 'الفواتير', value: stats.totalInvoices, color: '#10b981', sub: stats.totalInvoices === 0 ? 'لا توجد فواتير' : 'فاتورة', page: 'invoices' as const },
    { icon: Camera, label: 'المعدات', value: stats.equipmentCount, color: '#a78bfa', sub: stats.equipmentCount === 0 ? 'أضف معداتك' : 'معدة مسجلة', page: 'equipment' as const },
    { icon: FileStack, label: 'المستندات', value: stats.documentsCount, color: '#06b6d4', sub: stats.documentsCount === 0 ? 'ارفع مستنداتك' : 'مستند مرفوع', page: 'documents' as const },
  ];

  const quickActions = [
    { label: 'تعديل الملف الشخصي', icon: User, page: 'profile' as const },
    { label: 'إضافة معدة', icon: Wrench, page: 'equipment' as const },
    { label: 'رفع مستند', icon: Upload, page: 'documents' as const },
  ];

  const activityIcons: Record<string, typeof FolderOpen> = { project: FolderOpen, invoice: Receipt, document: FileStack };
  const activityColors: Record<string, string> = { project: '#3b82f6', invoice: '#f59e0b', document: '#06b6d4' };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} ساعة`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `منذ ${days} يوم`;
    return new Date(date).toLocaleDateString('en-US');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Welcome */}
      <div className="vp-card sc" style={{
        borderRadius: 18, padding: '20px 26px',
        background: 'linear-gradient(130deg, #0a2a66 0%, #1b4fa9 55%, #2563eb 100%)',
        border: '1px solid rgba(99,155,255,0.2)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', filter: 'blur(36px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-5%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', filter: 'blur(44px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', flexShrink: 0,
          }}>✨</div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: 2 }}>مرحباً، {vendor?.full_name || 'مورد'}</div>
            <div style={{ fontSize: '.82rem', color: 'rgba(255,255,255,0.72)' }}>إليك نظرة سريعة على مشاريعك ونشاطك</div>
          </div>
        </div>
      </div>

      {/* Profile completion */}
      {!completion.loading && completion.percentage < 100 && (
        <div className="vp-card sc" style={{
          borderRadius: 16, padding: '16px 18px',
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', bottom: -10, right: -10, width: 50, height: 50, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', filter: 'blur(18px)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertCircle size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--textSec)' }}>أكمل ملفك الشخصي ({completion.percentage}%)</div>
              <div style={{ fontSize: '.73rem', color: 'var(--textMut)' }}>
                {completion.items.filter(i => !i.done).slice(0, 3).map(i => i.label).join(' · ')}
              </div>
            </div>
          </div>
          <button onClick={() => navigateTo('profile')} className="vp-btn-primary" style={{ padding: '8px 16px', fontSize: '.78rem', position: 'relative', zIndex: 1 }}>
            أكمل الآن
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="vp-grid-4">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="vp-card sc" style={{ padding: '16px 18px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }} onClick={() => navigateTo(s.page)}>
              <div style={{ position: 'absolute', bottom: -14, left: -14, width: 60, height: 60, borderRadius: '50%', background: `${s.color}15`, filter: 'blur(18px)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Icon size={19} style={{ color: s.color }} />
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 4 }}>{loading ? '...' : s.value}</div>
                <div style={{ fontSize: '.76rem', fontWeight: 700, color: 'var(--textSec)' }}>{s.label}</div>
                <div style={{ fontSize: '.68rem', color: 'var(--textMut)', marginTop: 2 }}>{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {quickActions.map((a, i) => {
          const Icon = a.icon;
          return (
            <button key={i} onClick={() => navigateTo(a.page)} className="vp-btn-ghost">
              <Icon size={15} /> {a.label}
            </button>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="vp-card sc" style={{ borderRadius: 18, overflow: 'hidden', padding: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(59,130,246,0.06)', filter: 'blur(22px)', pointerEvents: 'none' }} />
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={14} style={{ color: '#3b82f6' }} />
          </div>
          <span style={{ fontSize: '.9rem', fontWeight: 800, color: 'var(--textPri)' }}>آخر النشاطات</span>
        </div>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--textMut)', fontSize: '.82rem' }}>جارٍ التحميل...</div>
        ) : activity.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--textMut)', fontSize: '.82rem' }}>لا توجد نشاطات حتى الآن</div>
        ) : (
          activity.map(item => {
            const Icon = activityIcons[item.type] || Zap;
            const c = activityColors[item.type] || '#64748b';
            return (
              <div key={item.id} style={{
                padding: '12px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                transition: 'background .15s', position: 'relative', zIndex: 1,
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--rowHover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: `${c}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} style={{ color: c }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--textSec)' }}>{item.title}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--textMut)', marginTop: 1 }}>{item.description}</div>
                </div>
                <span style={{ fontSize: '.67rem', color: 'var(--textMut)', flexShrink: 0 }}>{timeAgo(item.created_at)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
