import { useState, useEffect } from 'react';
import { ArrowRight, Link2, Video, Palette, BookOpen, FolderOpen, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency, formatDateArabic } from '../../lib/formatters';

export const ClientProjectView = ({ projectId, onBack }: { projectId: string; onBack: () => void }) => {
  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'invoices'>('overview');

  useEffect(() => { loadProject(); }, [projectId]);

  const loadProject = async () => {
    try {
      const [projRes, milestonesRes, invoicesRes] = await Promise.all([
        supabase.from('projects').select('id, name, description, status, start_date, end_date, total_price, currency').eq('id', projectId).single(),
        supabase.from('project_milestones').select('*').eq('project_id', projectId).order('sort_order'),
        supabase.from('invoices').select('id, invoice_number, total_amount, paid_amount, status, currency, issue_date, due_date').eq('project_id', projectId).order('created_at', { ascending: false }),
      ]);
      if (projRes.data) setProject(projRes.data);
      setMilestones(milestonesRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally { setLoading(false); }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      request: { label: 'طلب', cls: 'badge badge-gray' }, quoted: { label: 'مسعّر', cls: 'badge badge-blue' },
      invoiced: { label: 'مفوتر', cls: 'badge badge-purple' }, po_issued: { label: 'أمر شراء', cls: 'badge badge-green' },
      in_progress: { label: 'قيد التنفيذ', cls: 'badge badge-blue' }, completed: { label: 'مكتمل', cls: 'badge badge-green' },
      paid: { label: 'مدفوع', cls: 'badge badge-green' }, cancelled: { label: 'ملغي', cls: 'badge badge-red' },
    };
    return map[status] || { label: status, cls: 'badge badge-gray' };
  };

  const getInvoiceBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      paid: { label: 'مدفوع', cls: 'badge badge-green' }, partial: { label: 'جزئي', cls: 'badge badge-amber' },
      unpaid: { label: 'غير مدفوع', cls: 'badge badge-red' }, sent: { label: 'مرسل', cls: 'badge badge-blue' },
      draft: { label: 'مسودة', cls: 'badge badge-gray' }, cancelled: { label: 'ملغي', cls: 'badge badge-red' },
    };
    return map[status] || { label: status, cls: 'badge badge-gray' };
  };

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={16} />;
      case 'design': return <Palette size={16} />;
      case 'documentation': return <BookOpen size={16} />;
      default: return <Link2 size={16} />;
    }
  };

  if (loading) return <div className="dash-empty" style={{ height: 384 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  if (!project) return <div className="dash-empty" style={{ height: 384 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>المشروع غير موجود</span></div>;

  const badge = getStatusBadge(project.status);
  const totalInvoiced = invoices.reduce((s: number, i: any) => s + i.total_amount, 0);
  const totalPaid = invoices.reduce((s: number, i: any) => s + i.paid_amount, 0);

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, marginBottom: 20 }}>
        <ArrowRight size={18} /> العودة إلى المشاريع
      </button>

      {/* Header */}
      <div className="page-title-row" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="page-title">{project.name}</div>
          <span className={badge.cls}>{badge.label}</span>
        </div>
      </div>
      {project.description && (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{project.description}</p>
      )}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, marginBottom: 20 }}>
        {project.start_date && <div><span style={{ color: 'var(--text-muted)' }}>تاريخ البدء: </span><span style={{ fontWeight: 600 }}>{formatDateArabic(project.start_date)}</span></div>}
        {project.end_date && <div><span style={{ color: 'var(--text-muted)' }}>تاريخ الانتهاء: </span><span style={{ fontWeight: 600 }}>{formatDateArabic(project.end_date)}</span></div>}
        <div><span style={{ color: 'var(--text-muted)' }}>القيمة: </span><span dir="ltr" style={{ fontWeight: 700 }}>{formatCurrency(project.total_price, project.currency)}</span></div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border-soft)', marginBottom: 20 }}>
        {([
          { id: 'overview' as const, label: 'نظرة عامة' },
          { id: 'milestones' as const, label: `المراحل (${milestones.length})` },
          { id: 'invoices' as const, label: `الفواتير (${invoices.length})` },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', fontSize: 13, fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="stats-grid">
          <div className="stat-card sc-purple">
            <div className="stat-icon-box"><FileText size={18} /></div>
            <div className="stat-sub">إجمالي الفواتير</div>
            <div className="stat-val" dir="ltr">{formatCurrency(totalInvoiced, project.currency)}</div>
          </div>
          <div className="stat-card sc-green">
            <div className="stat-icon-box"><CheckCircle size={18} /></div>
            <div className="stat-sub">المدفوع</div>
            <div className="stat-val" dir="ltr">{formatCurrency(totalPaid, project.currency)}</div>
          </div>
          <div className="stat-card sc-blue">
            <div className="stat-icon-box"><FolderOpen size={18} /></div>
            <div className="stat-sub">المراحل</div>
            <div className="stat-val">{milestones.length}</div>
          </div>
        </div>
      )}

      {/* Milestones */}
      {activeTab === 'milestones' && (
        milestones.length === 0 ? (
          <div className="dash-empty" style={{ height: 200 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد مراحل بعد</span></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {milestones.map((m: any) => (
              <a key={m.id} href={m.link_url} target="_blank" rel="noopener noreferrer" className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, textDecoration: 'none', cursor: 'pointer' }}>
                <div className="stat-icon-box" style={{ width: 40, height: 40, flexShrink: 0 }}>
                  {getMilestoneIcon(m.link_type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="td-primary">{m.title}</div>
                  {m.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{m.description}</div>}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDateArabic(m.created_at)}</span>
              </a>
            ))}
          </div>
        )
      )}

      {/* Invoices */}
      {activeTab === 'invoices' && (
        invoices.length === 0 ? (
          <div className="dash-empty" style={{ height: 200 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد فواتير بعد</span></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>المبلغ</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th>الحالة</th>
                  <th>الاستحقاق</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => {
                  const invBadge = getInvoiceBadge(inv.status);
                  const remaining = inv.total_amount - inv.paid_amount;
                  return (
                    <tr key={inv.id}>
                      <td className="td-primary">#{inv.invoice_number}</td>
                      <td style={{ fontWeight: 600 }} dir="ltr">{formatCurrency(inv.total_amount, inv.currency)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success-text)' }} dir="ltr">{formatCurrency(inv.paid_amount, inv.currency)}</td>
                      <td style={{ fontWeight: 600, color: remaining > 0 ? 'var(--warning-text)' : 'var(--success-text)' }} dir="ltr">{formatCurrency(remaining, inv.currency)}</td>
                      <td><span className={invBadge.cls}>{invBadge.label}</span></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{formatDateArabic(inv.due_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};
