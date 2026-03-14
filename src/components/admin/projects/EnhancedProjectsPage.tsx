import { useState, useEffect } from 'react';
import { Plus, Search, User, TrendingUp, TrendingDown, Filter, X, ChevronDown } from 'lucide-react';
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
  const [filters, setFilters] = useState({
    status: '',
    client: '',
    manager: '',
    startDateFrom: '',
    startDateTo: '',
    minValue: '',
    maxValue: '',
  });
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
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
          `)
          .order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('users').select('id, full_name').order('full_name'),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (managersRes.error) throw managersRes.error;

      setProjects(projectsRes.data as any || []);
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

    const matchesStatus = !filters.status || project.status === filters.status;
    const matchesClient = !filters.client || project.client.id === filters.client;
    const matchesManager =
      !filters.manager ||
      project.project_manager?.full_name === filters.manager;

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

  const hasActiveFilters = filters.status || filters.client || filters.manager;

  const resetFilters = () => {
    setFilters({
      status: '',
      client: '',
      manager: '',
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

        <div className="relative">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="appearance-none pr-3 pl-8 py-2 rounded-lg border text-sm cursor-pointer focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="">الحالة</option>
            <option value="request">طلب</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="pending_payment">بانتظار الدفع</option>
            <option value="paid">مدفوع</option>
            <option value="completed">مكتمل</option>
            <option value="pending">قيد الانتظار</option>
            <option value="closed">مغلق</option>
            <option value="cancelled">ملغي</option>
          </select>
          <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
        </div>

        <div className="relative">
          <select
            value={filters.client}
            onChange={(e) => setFilters({ ...filters, client: e.target.value })}
            className="appearance-none pr-3 pl-8 py-2 rounded-lg border text-sm cursor-pointer focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="">العميل</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
        </div>

        <div className="relative">
          <select
            value={filters.manager}
            onChange={(e) => setFilters({ ...filters, manager: e.target.value })}
            className="appearance-none pr-3 pl-8 py-2 rounded-lg border text-sm cursor-pointer focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="">مدير المشروع</option>
            {managers.map((m) => (
              <option key={m.id} value={m.full_name}>{m.full_name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
        </div>

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

      {filteredProjects.length > 0 && (
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          عرض {toEnglishNumbers(filteredProjects.length.toString())} من {toEnglishNumbers(projects.length.toString())} مشروع
        </div>
      )}
    </div>
  );
};
