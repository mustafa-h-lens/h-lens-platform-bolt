import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Plus, Search, User, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../../lib/formatters';
import { toEnglishNumbers } from '../../../lib/numberUtils';

interface Project {
  id: string;
  name: string;
  description: string | null;
  project_mode: 'STANDARD' | 'FRAMEWORK';
  status: string;
  client: {
    name: string;
    client_image: string | null;
  };
  project_manager: {
    full_name: string;
  } | null;
  start_date: string | null;
  end_date: string | null;
  total_price: number;
  total_cost: number | null;
  currency: string;
}

interface ProjectsListProps {
  onSelectProject: (projectId: string) => void;
  onCreateProject?: () => void;
  onLoadProjects?: (loadFn: () => void) => void;
}

export const ProjectsList = ({ onSelectProject, onCreateProject, onLoadProjects }: ProjectsListProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProjects();
    if (onLoadProjects) {
      onLoadProjects(loadProjects);
    }
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          project_mode,
          status,
          start_date,
          end_date,
          total_price,
          total_cost,
          currency,
          client:clients(name, client_image),
          project_manager:users!project_manager_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data as any || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(search.toLowerCase()) ||
    project.client.name.toLowerCase().includes(search.toLowerCase())
  );

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
    const percentage = price > 0 ? (profit / price) * 100 : 0;
    let status: 'good' | 'warning' | 'danger' = 'good';
    if (percentage < 0) status = 'danger';
    else if (percentage < 20) status = 'warning';
    return { profit, percentage, status };
  };

  const getProfitColor = (status: 'good' | 'warning' | 'danger') => {
    switch (status) {
      case 'good': return 'var(--color-success)';
      case 'warning': return 'var(--color-warning)';
      case 'danger': return 'var(--color-danger)';
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن مشروع أو عميل..."
            className="w-full pr-9 pl-4 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {onCreateProject && (
          <button
            onClick={onCreateProject}
            className="flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg transition-all font-medium whitespace-nowrap"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus size={18} />
            إضافة مشروع جديد
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>جاري التحميل...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>لا توجد مشاريع</div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-table-header)', borderBottom: '1px solid var(--color-table-border)' }}>
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>المشروع</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>العميل</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>مدير المشروع</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الحالة</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الميزانية</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>التكاليف</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الربح</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project, index) => {
                const statusBadge = getStatusBadge(project.status);
                const profitData = calculateProfit(project.total_price, project.total_cost);
                return (
                  <tr
                    key={project.id}
                    onClick={() => onSelectProject(project.id)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: index < filteredProjects.length - 1 ? '1px solid var(--color-table-border)' : 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-table-row-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{project.name}</div>
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                          style={{ backgroundColor: 'var(--color-background-hover)' }}
                        >
                          {project.client.client_image ? (
                            <img src={project.client.client_image} alt={project.client.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={14} style={{ color: 'var(--color-text-muted)' }} />
                          )}
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{project.client.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {project.project_manager?.full_name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium inline-block"
                        style={{ backgroundColor: statusBadge.bgColor, color: statusBadge.color }}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                        {formatCurrency(project.total_price, project.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                        {project.total_cost ? formatCurrency(project.total_cost, project.currency) : '-'}
                      </span>
                    </td>
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
                          {profitData.status === 'good' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
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
    </div>
  );
};
