import { useState, useEffect } from 'react';
import { Plus, Search, User, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { formatCurrency, formatDateArabic } from '../../../lib/formatters';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import { AdvancedFilterBar, FilterConfig } from '../../ui/AdvancedFilterBar';

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

  const filterConfigs: FilterConfig[] = [
    {
      type: 'select',
      label: 'الحالة',
      value: filters.status,
      options: [
        { label: 'الكل', value: '' },
        { label: 'طلب', value: 'request' },
        { label: 'قيد التنفيذ', value: 'in_progress' },
        { label: 'بانتظار الدفع', value: 'pending_payment' },
        { label: 'مدفوع', value: 'paid' },
        { label: 'مكتمل', value: 'completed' },
        { label: 'قيد الانتظار', value: 'pending' },
        { label: 'مغلق', value: 'closed' },
        { label: 'ملغي', value: 'cancelled' },
      ],
      onChange: (value) => setFilters({ ...filters, status: value }),
    },
    {
      type: 'select',
      label: 'العميل',
      value: filters.client,
      options: [
        { label: 'الكل', value: '' },
        ...clients.map((client) => ({ label: client.name, value: client.id })),
      ],
      onChange: (value) => setFilters({ ...filters, client: value }),
    },
    {
      type: 'select',
      label: 'مدير المشروع',
      value: filters.manager,
      options: [
        { label: 'الكل', value: '' },
        ...managers.map((manager) => ({ label: manager.full_name, value: manager.full_name })),
      ],
      onChange: (value) => setFilters({ ...filters, manager: value }),
    },
    {
      type: 'dateRange',
      label: 'تاريخ البداية',
      fromValue: filters.startDateFrom,
      toValue: filters.startDateTo,
      onFromChange: (value) => setFilters({ ...filters, startDateFrom: value }),
      onToChange: (value) => setFilters({ ...filters, startDateTo: value }),
    },
    {
      type: 'numericRange',
      label: 'نطاق القيمة',
      minValue: filters.minValue,
      maxValue: filters.maxValue,
      onMinChange: (value) => setFilters({ ...filters, minValue: value }),
      onMaxChange: (value) => setFilters({ ...filters, maxValue: value }),
      placeholder: { min: 'الحد الأدنى', max: 'الحد الأقصى' },
    },
  ];

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

      <div className="relative">
        <Search
          className="absolute right-4 top-1/2 transform -translate-y-1/2"
          size={20}
          style={{ color: 'var(--color-text-muted)' }}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="ابحث بالاسم أو العميل..."
          className="w-full pr-12 pl-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
      </div>

      <AdvancedFilterBar filters={filterConfigs} onReset={resetFilters} />

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
                  اسم المشروع
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  العميل
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  الحالة
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  قيمة المشروع
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  التكاليف
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  الربح
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  تاريخ البداية
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project, index) => {
                const statusBadge = getStatusBadge(project.status);
                const profitData = calculateProfit(project.total_price, project.total_cost);
                const costWarning = getCostWarning(project.total_price, project.total_cost);

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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {project.name}
                        </div>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: project.project_mode === 'STANDARD' ? '#10b981' : '#3b82f6',
                            color: '#ffffff',
                          }}
                        >
                          {project.project_mode === 'STANDARD' ? 'مشروع' : 'عقد'}
                        </span>
                      </div>
                      {project.description && (
                        <div className="text-sm mt-1 line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>
                          {project.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                          style={{ backgroundColor: 'var(--color-background-hover)' }}
                        >
                          {project.client.client_image ? (
                            <img
                              src={project.client.client_image}
                              alt={project.client.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={20} style={{ color: 'var(--color-text-muted)' }} />
                          )}
                        </div>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {project.client.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-3 py-1.5 rounded-full text-xs font-medium inline-block"
                        style={{
                          backgroundColor: statusBadge.bgColor,
                          color: statusBadge.color,
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                        {formatCurrency(project.total_price, project.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                          {project.total_cost ? formatCurrency(project.total_cost, project.currency) : '-'}
                        </span>
                        {costWarning && (
                          <AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} />
                        )}
                      </div>
                      {project.total_cost && (
                        <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          {toEnglishNumbers(((project.total_cost / project.total_price) * 100).toFixed(1))}%
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {profitData.status === 'good' ? (
                          <TrendingUp size={16} style={{ color: getProfitColor(profitData.status) }} />
                        ) : (
                          <TrendingDown size={16} style={{ color: getProfitColor(profitData.status) }} />
                        )}
                        <div>
                          <div className="font-semibold" style={{ color: getProfitColor(profitData.status) }} dir="ltr">
                            {formatCurrency(profitData.profit, project.currency)}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {toEnglishNumbers(profitData.percentage.toFixed(1))}%
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                      {project.start_date ? formatDateArabic(project.start_date) : '-'}
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
