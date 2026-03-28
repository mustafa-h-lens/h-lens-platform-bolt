import { useState, useEffect } from 'react';
import { FolderOpen, FileText, CheckCircle, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useClientPortal } from '../../contexts/ClientPortalContext';
import { formatCurrency, formatNumber, formatDateArabic } from '../../lib/formatters';

export const ClientDashboardHome = ({ onViewProject }: { onViewProject: (id: string) => void }) => {
  const { client } = useClientPortal();
  const [stats, setStats] = useState({ activeProjects: 0, totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0, currency: 'SAR' });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client?.id) return;
    loadData();
  }, [client?.id]);

  const loadData = async () => {
    try {
      const [projectsRes, invoicesRes] = await Promise.all([
        supabase.from('projects').select('id, name, status, total_price, currency, updated_at').eq('client_id', client!.id).order('updated_at', { ascending: false }),
        supabase.from('invoices').select('total_amount, paid_amount, currency').eq('client_id', client!.id),
      ]);
      const projects = projectsRes.data || [];
      const invoices = invoicesRes.data || [];
      const activeStatuses = ['request', 'quoted', 'invoiced', 'po_issued', 'in_progress', 'partial_paid'];
      const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
      setStats({
        activeProjects: projects.filter(p => activeStatuses.includes(p.status)).length,
        totalInvoiced, totalPaid,
        totalOutstanding: totalInvoiced - totalPaid,
        currency: invoices[0]?.currency || projects[0]?.currency || 'SAR',
      });
      setRecentProjects(projects.slice(0, 5));
    } catch (error) {
      console.error('Error loading client dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      request: { label: 'طلب', cls: 'badge badge-gray' },
      quoted: { label: 'مسعّر', cls: 'badge badge-blue' },
      invoiced: { label: 'مفوتر', cls: 'badge badge-purple' },
      po_issued: { label: 'أمر شراء', cls: 'badge badge-green' },
      in_progress: { label: 'قيد التنفيذ', cls: 'badge badge-blue' },
      completed: { label: 'مكتمل', cls: 'badge badge-green' },
      paid: { label: 'مدفوع', cls: 'badge badge-green' },
      cancelled: { label: 'ملغي', cls: 'badge badge-red' },
    };
    return map[status] || { label: status, cls: 'badge badge-gray' };
  };

  if (loading) {
    return <div className="dash-empty" style={{ height: 384 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div>
      {/* Welcome */}
      <div className="dash-welcome">
        <div className="dash-welcome-content">
          <div>
            <div className="dash-welcome-title">مرحباً، {client?.name} 👋🏻</div>
            <div className="dash-welcome-sub">إليك نظرة سريعة على مشاريعك وفواتيرك</div>
          </div>
          <div className="dash-welcome-icon"><Sparkles size={28} /></div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginTop: 20 }}>
        <div className="stat-card sc-blue">
          <div className="stat-icon-box"><FolderOpen size={18} /></div>
          <div className="stat-sub">المشاريع النشطة</div>
          <div className="stat-val">{formatNumber(stats.activeProjects)}</div>
        </div>
        <div className="stat-card sc-purple">
          <div className="stat-icon-box"><FileText size={18} /></div>
          <div className="stat-sub">إجمالي الفواتير</div>
          <div className="stat-val" dir="ltr">{formatCurrency(stats.totalInvoiced, stats.currency)}</div>
        </div>
        <div className="stat-card sc-green">
          <div className="stat-icon-box"><CheckCircle size={18} /></div>
          <div className="stat-sub">المدفوع</div>
          <div className="stat-val" dir="ltr">{formatCurrency(stats.totalPaid, stats.currency)}</div>
        </div>
        <div className="stat-card sc-amber">
          <div className="stat-icon-box"><AlertCircle size={18} /></div>
          <div className="stat-sub">المتبقي</div>
          <div className="stat-val" dir="ltr">{formatCurrency(stats.totalOutstanding, stats.currency)}</div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="dash-section" style={{ marginTop: 24 }}>
        <div className="dash-section-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOpen size={18} style={{ color: 'var(--accent-lighter)' }} />
            <strong>آخر المشاريع</strong>
          </span>
        </div>

        {recentProjects.length === 0 ? (
          <div className="dash-empty" style={{ height: 200 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد مشاريع بعد</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>المشروع</th>
                  <th>الحالة</th>
                  <th>القيمة</th>
                  <th>آخر تحديث</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map(project => {
                  const badge = getStatusBadge(project.status);
                  return (
                    <tr key={project.id} onClick={() => onViewProject(project.id)} style={{ cursor: 'pointer' }}>
                      <td><span className="td-primary">{project.name}</span></td>
                      <td><span className={badge.cls}>{badge.label}</span></td>
                      <td style={{ fontWeight: 600 }} dir="ltr">{formatCurrency(project.total_price, project.currency)}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{formatDateArabic(project.updated_at)}</td>
                      <td><ArrowLeft size={14} style={{ color: 'var(--text-muted)' }} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
