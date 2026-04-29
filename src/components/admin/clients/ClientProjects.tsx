import { useState, useEffect } from 'react';
import { Eye, Plus, DollarSign, TrendingUp, RotateCcw, FolderOpen } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useHideAmounts } from '../../../contexts/HideAmountsContext';
import { MultiSelectFilter } from '../../shared/MultiSelectFilter';
import { formatNumber, formatCurrency, formatDateArabic } from '../../../lib/formatters';
import type { Project } from '../../../types/database';

interface ClientProjectsProps {
  clientId: string;
  onViewProject: (projectId: string) => void;
  onAddProject?: () => void;
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  request:      { label: 'طلب',           className: 'badge badge-gray' },
  quoted:       { label: 'عرض سعر',      className: 'badge badge-blue' },
  invoiced:     { label: 'فاتورة',        className: 'badge badge-blue' },
  po_issued:    { label: 'أمر شراء',      className: 'badge badge-blue' },
  partial_paid: { label: 'مدفوع جزئي',   className: 'badge badge-amber' },
  paid:         { label: 'مدفوع',         className: 'badge badge-green' },
  pending:      { label: 'معلق',          className: 'badge badge-gray' },
  in_progress:  { label: 'قيد التنفيذ',   className: 'badge badge-amber' },
  completed:    { label: 'مكتمل',         className: 'badge badge-green' },
  closed:       { label: 'مغلق',          className: 'badge badge-gray' },
  cancelled:    { label: 'ملغي',          className: 'badge badge-red' },
};

export const ClientProjects = ({ clientId, onViewProject, onAddProject }: ClientProjectsProps) => {
  const { masked } = useHideAmounts();
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalCosts, setTotalCosts] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('projects')
        .select('*, purchase_orders:po_id(id, po_number, title)')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false });
      setProjects(data || []);

      // Fetch total expenses for all projects
      if (data && data.length > 0) {
        const projectIds = data.map(p => p.id);
        const { data: expenses } = await supabase
          .from('vendor_invoices')
          .select('amount_total')
          .in('project_id', projectIds);
        const costs = (expenses || []).reduce((sum, e) => sum + (e.amount_total || 0), 0);
        setTotalCosts(costs);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtering
  const filtered = projects.filter(p => {
    if (statusFilter.length > 0 && !statusFilter.includes(p.status)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.project_code && p.project_code.toLowerCase().includes(q));
    }
    return true;
  });

  // Sort by project date (start_date or created_at), newest first
  filtered.sort((a, b) => {
    const da = new Date(a.start_date || a.created_at).getTime();
    const db = new Date(b.start_date || b.created_at).getTime();
    return db - da;
  });

  const totalRevenue = projects.reduce((sum, p) => sum + (p.total_price || 0), 0);
  const profit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100) : 0;
  const completedCount = projects.filter(p => p.status === 'completed').length;
  const inProgressCount = projects.filter(p => p.status === 'in_progress').length;
  const pendingCount = projects.filter(p => p.status === 'pending' || p.status === 'request' || p.status === 'quoted').length;
  const currency = projects[0]?.currency || 'SAR';

  const getStatusBadge = (status: string) => {
    const info = STATUS_BADGES[status] || STATUS_BADGES.request;
    return <span className={info.className}>{info.label}</span>;
  };

  if (loading) {
    return <div className="dash-empty" style={{ height: 200 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-title-row">
        <div>
          <div className="page-title" style={{ fontSize: 18 }}>المشاريع ({formatNumber(projects.length)})</div>
          <div className="page-subtitle">عرض وإدارة جميع المشاريع</div>
        </div>
        {onAddProject && (
          <button className="btn btn-primary btn-sm" onClick={onAddProject} style={{ gap: 6 }}>
            <Plus size={14} /> إضافة مشروع
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card sc-green">
          <div className="stat-icon-box"><DollarSign size={18} /></div>
          <div className="stat-sub">إجمالي المبيعات</div>
          <div className="stat-val" dir="ltr">{masked(formatCurrency(totalRevenue, currency))}</div>
        </div>
        <div className="stat-card sc-amber">
          <div className="stat-icon-box"><DollarSign size={18} /></div>
          <div className="stat-sub">إجمالي التكاليف</div>
          <div className="stat-val" dir="ltr">{masked(formatCurrency(totalCosts, currency))}</div>
        </div>
        <div className="stat-card sc-purple">
          <div className="stat-icon-box"><TrendingUp size={18} /></div>
          <div className="stat-sub">هامش الربح</div>
          <div className="stat-val">
            {masked(`${profitMargin.toFixed(1)}%`)}
          </div>
          <div className="stat-hint" dir="ltr">
            {masked(formatCurrency(profit, currency))}
          </div>
        </div>
        <div className="stat-card sc-blue">
          <div className="stat-icon-box"><FolderOpen size={18} /></div>
          <div className="stat-sub">إجمالي المشاريع</div>
          <div className="stat-val">{formatNumber(projects.length)}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          className="input"
          placeholder="ابحث عن مشروع..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <MultiSelectFilter
          label="الحالة"
          options={[
            { value: 'pending', label: 'معلق' },
            { value: 'in_progress', label: 'قيد التنفيذ' },
            { value: 'completed', label: 'مكتمل' },
            { value: 'cancelled', label: 'ملغي' },
          ]}
          selected={statusFilter}
          onToggle={(v) => setStatusFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
        />
        {(searchQuery || statusFilter.length > 0) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearchQuery(''); setStatusFilter([]); }}>
            <RotateCcw size={13} /> إعادة تعيين
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="dash-empty" style={{ height: 200 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {searchQuery || statusFilter.length > 0 ? 'لا توجد نتائج للبحث' : 'لا توجد مشاريع'}
          </span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>اسم المشروع</th>
                <th>الحالة</th>
                <th>إجمالي المبلغ</th>
                <th>تاريخ المشروع</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project.id} onClick={() => onViewProject(project.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="td-primary">{project.name}</span>
                      {(project as any).purchase_orders && (
                        <span className="badge badge-blue" style={{ fontSize: 10, padding: '1px 6px', whiteSpace: 'nowrap' }}>
                          {(project as any).purchase_orders.title || (project as any).purchase_orders.po_number}
                        </span>
                      )}
                    </div>
                    {project.description && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{project.description}</div>
                    )}
                  </td>
                  <td>{getStatusBadge(project.status)}</td>
                  <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 13 }} dir="ltr">
                    {masked(formatCurrency(project.total_price, project.currency))}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} dir="ltr">
                    {formatDateArabic(project.start_date || project.created_at)}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => { e.stopPropagation(); onViewProject(project.id); }}
                      style={{ gap: 4, fontSize: 12 }}
                    >
                      <Eye size={14} /> عرض
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
