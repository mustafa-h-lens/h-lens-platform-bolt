import { useState, useEffect } from 'react';
import { Plus, User, TrendingUp, TrendingDown, RotateCcw, ChevronLeft, ChevronRight, Briefcase, Wallet, Receipt, BarChart3 } from 'lucide-react';
import { MultiSelectFilter } from '../../shared/MultiSelectFilter';
import { supabase } from '../../../lib/supabaseClient';
import { formatCurrency, formatDateArabic } from '../../../lib/formatters';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import { formatNumber } from '../../../lib/formatters';

interface Project {
  id: string;
  name: string;
  description: string | null;
  project_mode: 'STANDARD' | 'FRAMEWORK' | 'CONTRACT';
  status: string;
  start_date: string | null;
  total_price: number;
  total_cost: number | null;
  currency: string;
  client: {
    id: string;
    name: string;
    client_image: string | null;
  };
  project_manager: {
    full_name: string;
  } | null;
}

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

interface EnhancedProjectsPageProps {
  onSelectProject: (projectId: string) => void;
  onCreateProject?: () => void;
}

export const EnhancedProjectsPage = ({ onSelectProject, onCreateProject }: EnhancedProjectsPageProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    status: [] as string[],
    client: [] as string[],
    manager: [] as string[],
  });
  const toggleFilter = (key: 'status' | 'client' | 'manager', value: string) => {
    setFilters(prev => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };
  useEffect(() => {
    loadData();
  }, [page, pageSize]);

  // Reset page on filter/search change
  useEffect(() => {
    setPage(0);
  }, [searchTerm, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const [projectsRes, clientsRes, managersRes] = await Promise.all([
        supabase
          .from('projects')
          .select(`
            id,
            name,
            description,
            project_mode,
            status,
            start_date,
            total_price,
            total_cost,
            currency,
            client:clients(id, name, client_image),
            project_manager:users!project_manager_id(full_name)
          `, { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to),
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('users').select('id, full_name').order('full_name'),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (managersRes.error) throw managersRes.error;

      setProjects(projectsRes.data as any || []);
      setTotalCount(projectsRes.count || 0);
      setClients(clientsRes.data || []);
      setManagers(managersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filters.status.length === 0 || filters.status.includes(project.status);
    const matchesClient = filters.client.length === 0 || filters.client.includes(project.client.id);
    const matchesManager =
      filters.manager.length === 0 ||
      (project.project_manager?.full_name && filters.manager.includes(project.project_manager.full_name));

    return matchesSearch && matchesStatus && matchesClient && matchesManager;
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; cls: string }> = {
      request: { label: 'طلب', cls: 'badge badge-gray' },
      in_progress: { label: 'قيد التنفيذ', cls: 'badge badge-blue' },
      pending_payment: { label: 'بانتظار الدفع', cls: 'badge badge-amber' },
      paid: { label: 'مدفوع', cls: 'badge badge-green' },
      closed: { label: 'مغلق', cls: 'badge badge-gray' },
      completed: { label: 'مكتمل', cls: 'badge badge-green' },
      pending: { label: 'قيد الانتظار', cls: 'badge badge-amber' },
      cancelled: { label: 'ملغي', cls: 'badge badge-red' },
    };
    return statusMap[status] || statusMap.request;
  };

  const calculateProfit = (price: number, cost: number | null) => {
    if (!cost) return { profit: price, percentage: 100, status: 'good' };
    const profit = price - cost;
    const percentage = (profit / price) * 100;

    let status: 'good' | 'warning' | 'danger' = 'good';
    if (percentage < 0) status = 'danger';
    else if (percentage < 20) status = 'warning';

    return { profit, percentage, status };
  };

  const hasActiveFilters = filters.status.length > 0 || filters.client.length > 0 || filters.manager.length > 0;

  const resetFilters = () => {
    setFilters({ status: [], client: [], manager: [] });
    setSearchTerm('');
  };

  // Compute stats
  const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.total_price || 0), 0);
  const totalCost = filteredProjects.reduce((sum, p) => sum + (p.total_cost || 0), 0);
  const totalProfit = totalBudget - totalCost;
  const profitMargin = totalBudget > 0 ? (totalProfit / totalBudget) * 100 : 0;
  const profitStatus: 'good' | 'warning' | 'danger' = profitMargin < 0 ? 'danger' : profitMargin < 20 ? 'warning' : 'good';
  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return <div className="dash-empty" style={{ height: 384 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري تحميل المشاريع...</span></div>;
  }

  return (
    <div>
      {/* Page Title */}
      <div className="page-title-row">
        <div>
          <div className="page-title">المشاريع</div>
          <div className="page-subtitle">إدارة المشاريع والعقود</div>
        </div>
        {onCreateProject && (
          <button className="btn btn-primary" onClick={onCreateProject}>
            <Plus size={16} /> مشروع جديد
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card sc-blue">
          <div className="stat-icon-box"><Briefcase size={18} /></div>
          <div className="stat-sub">إجمالي المشاريع</div>
          <div className="stat-val">{formatNumber(filteredProjects.length)}</div>
        </div>
        <div className="stat-card sc-green">
          <div className="stat-icon-box"><Wallet size={18} /></div>
          <div className="stat-sub">إجمالي الميزانيات</div>
          <div className="stat-val" dir="ltr">{formatCurrency(totalBudget, 'SAR')}</div>
        </div>
        <div className="stat-card sc-amber">
          <div className="stat-icon-box"><Receipt size={18} /></div>
          <div className="stat-sub">إجمالي التكاليف</div>
          <div className="stat-val" dir="ltr">{formatCurrency(totalCost, 'SAR')}</div>
        </div>
        <div className="stat-card sc-purple">
          <div className="stat-icon-box"><BarChart3 size={18} /></div>
          <div className="stat-sub">إجمالي الأرباح</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="stat-val" dir="ltr">{formatCurrency(totalProfit, 'SAR')}</div>
            <span
              className={`badge ${profitStatus === 'good' ? 'badge-green' : profitStatus === 'warning' ? 'badge-amber' : 'badge-red'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
              dir="ltr"
            >
              {profitStatus === 'good' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {toEnglishNumbers(profitMargin.toFixed(0))}%
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input className="input" placeholder="بحث بالاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ maxWidth: 220 }} />

        <MultiSelectFilter
          label="الحالة"
          options={[
            { value: 'request', label: 'طلب' },
            { value: 'in_progress', label: 'قيد التنفيذ' },
            { value: 'pending_payment', label: 'بانتظار الدفع' },
            { value: 'paid', label: 'مدفوع' },
            { value: 'completed', label: 'مكتمل' },
            { value: 'pending', label: 'قيد الانتظار' },
            { value: 'closed', label: 'مغلق' },
            { value: 'cancelled', label: 'ملغي' },
          ]}
          selected={filters.status}
          onToggle={(v) => toggleFilter('status', v)}
        />

        <MultiSelectFilter
          label="العميل"
          options={clients.map(c => ({ value: c.id, label: c.name }))}
          selected={filters.client}
          onToggle={(v) => toggleFilter('client', v)}
        />

        <MultiSelectFilter
          label="مدير المشروع"
          options={managers.map(m => ({ value: m.full_name, label: m.full_name }))}
          selected={filters.manager}
          onToggle={(v) => toggleFilter('manager', v)}
        />

        {hasActiveFilters && (
          <button className="btn btn-ghost btn-sm" onClick={resetFilters}>
            <RotateCcw size={13} /> إعادة تعيين
          </button>
        )}
      </div>

      {/* Table */}
      {filteredProjects.length === 0 ? (
        <div className="dash-empty" style={{ height: 200 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد مشاريع تطابق البحث أو الفلاتر</span></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المشروع</th>
                <th>العميل</th>
                <th>مدير المشروع</th>
                <th>الحالة</th>
                <th>الميزانية</th>
                <th>التكاليف</th>
                <th>الربح</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => {
                const statusBadge = getStatusBadge(project.status);
                const profitData = calculateProfit(project.total_price, project.total_cost);

                return (
                  <tr
                    key={project.id}
                    onClick={() => onSelectProject(project.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="td-primary">{project.name}</span>
                        <span className={`badge ${project.project_mode === 'STANDARD' ? 'badge-green' : project.project_mode === 'CONTRACT' ? 'badge-purple' : 'badge-blue'}`}>
                          {project.project_mode === 'STANDARD' ? 'مشروع' : project.project_mode === 'CONTRACT' ? 'عقد' : 'عقد إطاري'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="user-row">
                        <div className="client-logo" style={{ width: 28, height: 28 }}>
                          {project.client.client_image ? (
                            <img src={project.client.client_image} alt={project.client.name} />
                          ) : (
                            <User size={13} style={{ color: 'var(--text-muted)' }} />
                          )}
                        </div>
                        <span className="u-name">{project.client.name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {project.project_manager?.full_name || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={statusBadge.cls}>{statusBadge.label}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }} dir="ltr">
                        {formatCurrency(project.total_price, project.currency)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: 13 }} dir="ltr">
                        {project.total_cost ? formatCurrency(project.total_cost, project.currency) : '-'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }} dir="ltr">
                          {formatCurrency(profitData.profit, project.currency)}
                        </span>
                        <span
                          className={`badge ${profitData.status === 'good' ? 'badge-green' : profitData.status === 'warning' ? 'badge-amber' : 'badge-red'}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 10 }}
                          dir="ltr"
                        >
                          {profitData.status === 'good' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {toEnglishNumbers(profitData.percentage.toFixed(0))}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="pagination">
          <div className="pag-info">عرض <strong>{toEnglishNumbers((page * pageSize + 1).toString())}-{toEnglishNumbers(Math.min((page + 1) * pageSize, totalCount).toString())}</strong> من <strong>{toEnglishNumbers(totalCount.toString())}</strong> مشروع</div>
          <div className="pag-controls">
            <button className={`pag-btn ${page === 0 ? 'disabled' : ''}`} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronRight size={15} /></button>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => (
              <button key={i} className={`pag-btn ${page === i ? 'active' : ''}`} onClick={() => setPage(i)}>{toEnglishNumbers((i + 1).toString())}</button>
            ))}
            {totalPages > 3 && <button className="pag-btn" style={{ fontSize: 11, letterSpacing: 1 }}>...</button>}
            {totalPages > 3 && <button className={`pag-btn ${page === totalPages - 1 ? 'active' : ''}`} onClick={() => setPage(totalPages - 1)}>{toEnglishNumbers(totalPages.toString())}</button>}
            <button className={`pag-btn ${page >= totalPages - 1 ? 'disabled' : ''}`} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronLeft size={15} /></button>
          </div>
          <div className="pag-per-page">عرض <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select> لكل صفحة</div>
        </div>
      )}
    </div>
  );
};
