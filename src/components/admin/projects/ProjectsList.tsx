import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Plus, Search, Crown, TrendingUp, TrendingDown, Zap, FlaskConical, Globe, Smartphone, Camera, Megaphone, PenTool, Film, Palette, Monitor, Rocket, Target, Briefcase, Layers } from 'lucide-react';
import { formatCurrency } from '../../../lib/formatters';
import { toEnglishNumbers } from '../../../lib/numberUtils';

const PROJECT_ICONS = [Zap, Globe, FlaskConical, Smartphone, Camera, Megaphone, PenTool, Film, Palette, Monitor, Rocket, Target, Briefcase, Layers];
const PROJECT_COLORS = [
  { bg: 'var(--accent-glow)', color: 'var(--accent-lighter)', border: 'var(--accent-glow-md)' },
  { bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'var(--success-border)' },
  { bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning-border)' },
  { bg: 'var(--purple-bg)', color: 'var(--purple-text)', border: 'var(--purple-border)' },
  { bg: 'var(--info-bg)', color: 'var(--info-text)', border: 'var(--info-border)' },
  { bg: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'var(--danger-border)' },
];

const getProjectStyle = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  const iconIdx = Math.abs(hash) % PROJECT_ICONS.length;
  const colorIdx = Math.abs(hash >> 4) % PROJECT_COLORS.length;
  return { Icon: PROJECT_ICONS[iconIdx], ...PROJECT_COLORS[colorIdx] };
};

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
  limit?: number;
}

export const ProjectsList = ({ onSelectProject, onCreateProject, onLoadProjects, limit }: ProjectsListProps) => {
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
        .order('created_at', { ascending: false })
        .limit(limit || 100);

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

  const getStatusBadge = (status: string): { label: string; className: string } => {
    const statusMap: Record<string, { label: string; className: string }> = {
      request: { label: 'طلب', className: 'badge badge-gray' },
      in_progress: { label: 'قيد التنفيذ', className: 'badge badge-green' },
      pending_payment: { label: 'بانتظار الدفع', className: 'badge badge-amber' },
      paid: { label: 'مدفوع', className: 'badge badge-green' },
      closed: { label: 'مغلق', className: 'badge badge-gray' },
      completed: { label: 'مكتمل', className: 'badge badge-green' },
      pending: { label: 'قيد الانتظار', className: 'badge badge-amber' },
      cancelled: { label: 'ملغي', className: 'badge badge-red' },
    };
    return statusMap[status] || statusMap.request;
  };

  const getModeBadge = (mode: string): { label: string; className: string } => {
    return mode === 'STANDARD'
      ? { label: 'مشروع', className: 'badge badge-amber' }
      : { label: 'مشغل', className: 'badge badge-blue' };
  };

  const calculateProfit = (price: number, cost: number | null) => {
    if (!cost) return { profit: price, percentage: 100, isPositive: true };
    const profit = price - cost;
    const percentage = price > 0 ? (profit / price) * 100 : 0;
    return { profit, percentage, isPositive: profit >= 0 };
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن مشروع أو عميل..."
            className="input"
            style={{ paddingRight: 36 }}
          />
        </div>
        {onCreateProject && (
          <button className="btn btn-primary btn-sm" onClick={onCreateProject}>
            <Plus size={14} /> إضافة مشروع جديد
          </button>
        )}
      </div>

      {loading ? (
        <div className="dash-empty"><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>
      ) : filteredProjects.length === 0 ? (
        <div className="dash-empty"><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد مشاريع</span></div>
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
                const modeBadge = getModeBadge(project.project_mode);
                const profitData = calculateProfit(project.total_price, project.total_cost);
                const pStyle = getProjectStyle(project.id);
                const ProjectIcon = pStyle.Icon;
                return (
                  <tr
                    key={project.id}
                    onClick={() => onSelectProject(project.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="user-row">
                        <div className="client-logo" style={{
                          background: pStyle.bg, color: pStyle.color,
                          border: `1px solid ${pStyle.border}`,
                          width: 28, height: 28,
                        }}>
                          <ProjectIcon size={14} />
                        </div>
                        <div>
                          <div className="u-name" style={{ fontSize: 12 }}>{project.name}</div>
                          <div className="u-role">
                            <span className={modeBadge.className} style={{ fontSize: 10, padding: '1px 6px' }}>
                              {modeBadge.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="user-row">
                        {project.client.client_image ? (
                          <div className="client-logo" style={{ width: 28, height: 28 }}>
                            <img src={project.client.client_image} alt={project.client.name} />
                          </div>
                        ) : (
                          <div className="avatar av-sm" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                            <Crown size={12} />
                          </div>
                        )}
                        <span style={{ fontSize: 12 }}>{project.client.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {project.project_manager?.full_name || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td>
                      <span className={statusBadge.className} style={{ fontSize: 10, padding: '2px 8px' }}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="td-primary" style={{ fontSize: 12 }} dir="ltr">
                      {formatCurrency(project.total_price, project.currency)}
                    </td>
                    <td style={{ fontSize: 12 }} dir="ltr">
                      {project.total_cost ? formatCurrency(project.total_cost, project.currency) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12 }} dir="ltr">
                          {formatCurrency(profitData.profit, project.currency)}
                        </span>
                        <span
                          className={profitData.isPositive ? 'badge badge-green' : 'badge badge-red'}
                          style={{ fontSize: 10, padding: '1px 6px' }}
                        >
                          ربح {toEnglishNumbers(profitData.percentage.toFixed(0))}%
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
