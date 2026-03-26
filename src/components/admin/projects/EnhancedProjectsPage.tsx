import { useState, useEffect } from 'react';
import { Plus, Search, User, TrendingUp, TrendingDown, Filter, X, ChevronDown } from 'lucide-react';
import { MultiSelectFilter } from '../../shared/MultiSelectFilter';
import { supabase } from '../../../lib/supabaseClient';
import { formatCurrency, formatDateArabic } from '../../../lib/formatters';
import { toEnglishNumbers } from '../../../lib/numberUtils';

interface Project {
  id: string;
  name: string;
  description: string | null;
  project_mode: 'STANDARD' | 'FRAMEWORK';
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
    startDateFrom: '',
    startDateTo: '',
    minValue: '',
    maxValue: '',
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

    const matchesStartDate = (() => {
      if (!project.start_date) return !filters.startDateFrom && !filters.startDateTo;
      const startDate = new Date(project.start_date);
      const fromDate = filters.startDateFrom ? new Date(filters.startDateFrom) : null;
      const toDate = filters.startDateTo ? new Date(filters.startDateTo) : null;
      if (fromDate && startDate < fromDate) return false;
      if (toDate && startDate > toDate) return false;
      return true;
    })();

    const matchesValue = (() => {
      const minValue = filters.minValue ? parseFloat(filters.minValue) : 0;
      const maxValue = filters.maxValue ? parseFloat(filters.maxValue) : Infinity;
      return project.total_price >= minValue && project.total_price <= maxValue;
    })();

    return matchesSearch && matchesStatus && matchesClient && matchesManager && matchesStartDate && matchesValue;
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
      request: { label: 'طلب', color: 'var(--color-text-primary)', bgColor: 'var(--color-background-hover)' },
      in_progress: { label: 'قيد التنفيذ', color: '#ffffff', bgColor: 'var(--color-info)' },
      pending_payment: { label: 'بانتظار الدفع', color: '#ffffff', bgColor: 'var(--color-warning)' },
      paid: { label: 'مدفوع', color: '#ffffff', bgColor: 'var(--color-success)' },
      closed: { label: 'مغلق', color: 'var(--color-text-muted)', bgColor: 'var(--color-background-hover)' },
      completed: { label: 'مكتمل', color: '#ffffff', bgColor: 'var(--color-success)' },
      pending: { label: 'قيد الانتظار', color: '#ffffff', bgColor: 'var(--color-warning)' },
      cancelled: { label: 'ملغي', color: '#ffffff', bgColor: 'var(--color-danger)' },
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

  const getCostWarning = (price: number, cost: number | null) => {
    if (!cost) return null;
    const percentage = (cost / price) * 100;
    if (percentage >= 80) return 'high';
    return null;
  };

  const getProfitColor = (status: 'good' | 'warning' | 'danger') => {
    switch (status) {
      case 'good':
        return 'var(--color-success)';
      case 'warning':
        return 'var(--color-warning)';
      case 'danger':
        return 'var(--color-danger)';
    }
  };

  const hasActiveFilters = filters.status.length > 0 || filters.client.length > 0 || filters.manager.length > 0;

  const resetFilters = () => {
    setFilters({
      status: [],
      client: [],
      manager: [],
      startDateFrom: '',
      startDateTo: '',
      minValue: '',
      maxValue: '',
    });
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
          <p style={{ color: 'var(--color-text-secondary)' }}>جاري تحميل المشاريع...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          المشاريع
        </h1>
        {onCreateProject && (
          <button
            onClick={onCreateProject}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
            }}
          >
            <Plus size={20} />
            مشروع جديد
          </button>
        )}
      </div>

      {/* Insight Cards */}
      {(() => {
        const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.total_price || 0), 0);
        const totalCost = filteredProjects.reduce((sum, p) => sum + (p.total_cost || 0), 0);
        const totalProfit = totalBudget - totalCost;
        const profitMargin = totalBudget > 0 ? (totalProfit / totalBudget) * 100 : 0;
        const profitStatus: 'good' | 'warning' | 'danger' = profitMargin < 0 ? 'danger' : profitMargin < 20 ? 'warning' : 'good';

        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              className="p-4 rounded-lg border"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>إجمالي المشاريع</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {toEnglishNumbers(filteredProjects.length.toString())}
              </div>
            </div>
            <div
              className="p-4 rounded-lg border"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>إجمالي الميزانيات</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                {formatCurrency(totalBudget, 'SAR')}
              </div>
            </div>
            <div
              className="p-4 rounded-lg border"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>إجمالي التكاليف</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                {formatCurrency(totalCost, 'SAR')}
              </div>
            </div>
            <div
              className="p-4 rounded-lg border"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>إجمالي الأرباح</div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                  {formatCurrency(totalProfit, 'SAR')}
                </div>
                <span
                  className="flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    color: getProfitColor(profitStatus),
                    backgroundColor: profitStatus === 'good' ? 'rgba(16,185,129,0.1)' : profitStatus === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                  }}
                  dir="ltr"
                >
                  {profitStatus === 'good' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {toEnglishNumbers(profitMargin.toFixed(0))}%
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Filters + Search */}
      <div
        className="flex items-center gap-3 flex-wrap p-4 rounded-lg border"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <Filter size={18} style={{ color: 'var(--color-text-muted)' }} />

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
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ color: 'var(--color-danger)' }}
          >
            <X size={14} />
            مسح الفلاتر
          </button>
        )}

        <div className="relative mr-auto">
          <Search
            className="absolute right-3 top-1/2 -translate-y-1/2"
            size={16}
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث..."
            className="pr-9 pl-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 w-48"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <p className="text-lg">لا توجد مشاريع تطابق البحث أو الفلاتر</p>
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <table className="w-full">
            <thead
              style={{
                backgroundColor: 'var(--color-table-header)',
                borderBottom: '1px solid var(--color-table-border)',
              }}
            >
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  المشروع
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  العميل
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  مدير المشروع
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  الحالة
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  الميزانية
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  التكاليف
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  الربح
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project, index) => {
                const statusBadge = getStatusBadge(project.status);
                const profitData = calculateProfit(project.total_price, project.total_cost);
                const costPercentage = project.total_cost && project.total_price > 0
                  ? (project.total_cost / project.total_price) * 100
                  : 0;

                return (
                  <tr
                    key={project.id}
                    onClick={() => onSelectProject(project.id)}
                    className="cursor-pointer transition-colors"
                    style={{
                      borderBottom: index < filteredProjects.length - 1 ? '1px solid var(--color-table-border)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-table-row-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Project Name + Mode Badge */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {project.name}
                        </div>
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium border"
                          style={{
                            borderColor: project.project_mode === 'STANDARD' ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)',
                            color: project.project_mode === 'STANDARD' ? '#059669' : '#2563eb',
                            backgroundColor: project.project_mode === 'STANDARD' ? 'rgba(16,185,129,0.08)' : 'rgba(59,130,246,0.08)',
                          }}
                        >
                          {project.project_mode === 'STANDARD' ? 'مشروع' : 'عقد'}
                        </span>
                      </div>
                    </td>
                    {/* Client */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                          style={{ backgroundColor: 'var(--color-background-hover)' }}
                        >
                          {project.client.client_image ? (
                            <img
                              src={project.client.client_image}
                              alt={project.client.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={14} style={{ color: 'var(--color-text-muted)' }} />
                          )}
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {project.client.name}
                        </span>
                      </div>
                    </td>
                    {/* Project Manager */}
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {project.project_manager?.full_name || '-'}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium inline-block"
                        style={{
                          backgroundColor: statusBadge.bgColor,
                          color: statusBadge.color,
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    {/* Budget */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                        {formatCurrency(project.total_price, project.currency)}
                      </span>
                    </td>
                    {/* Cost */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                        {project.total_cost ? formatCurrency(project.total_cost, project.currency) : '-'}
                      </span>
                    </td>
                    {/* Profit */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                          {formatCurrency(profitData.profit, project.currency)}
                        </span>
                        <span
                          className="flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{
                            color: getProfitColor(profitData.status as 'good' | 'warning' | 'danger'),
                            backgroundColor: profitData.status === 'good' ? 'rgba(16,185,129,0.1)' : profitData.status === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                          }}
                          dir="ltr"
                        >
                          {profitData.status === 'good' ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
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
      {(() => {
        const totalPages = Math.ceil(totalCount / pageSize);
        return totalPages > 1 ? (
          <div
            className="flex items-center justify-between p-4 rounded-lg border"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', direction: 'rtl' }}
          >
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface)' }}
            >
              التالي
            </button>
            <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span>صفحة {toEnglishNumbers((page + 1).toString())} من {toEnglishNumbers(totalPages.toString())}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>|</span>
              <span>إجمالي: {toEnglishNumbers(totalCount.toString())}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                عرض
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '2px 6px', color: 'var(--color-text-primary)', fontSize: 13 }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                لكل صفحة
              </span>
            </div>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface)' }}
            >
              السابق
            </button>
          </div>
        ) : totalCount > 0 ? (
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            إجمالي: {toEnglishNumbers(totalCount.toString())} مشروع
          </div>
        ) : null;
      })()}
    </div>
  );
};
