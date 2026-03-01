import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Search, User } from 'lucide-react';
import { formatNumber, formatCurrency, formatDateArabic } from '../../lib/formatters';

interface Project {
  id: string;
  name: string;
  description: string | null;
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
          status,
          start_date,
          end_date,
          total_price,
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

  const getStatusStyle = (status: string) => {
    const statusMap: Record<string, { label: string; gradient: string }> = {
      request: { label: 'طلب', gradient: 'from-[#072A52] to-[#0A2A66]' },
      in_progress: { label: 'قيد التنفيذ', gradient: 'from-[#0A2A66] to-[#143D8D]' },
      pending_payment: { label: 'بانتظار الدفع', gradient: 'from-[#0A2A66] to-[#1B4FA9]' },
      paid: { label: 'مدفوع', gradient: 'from-[#1B4FA9] to-[#47A1FF]' },
      closed: { label: 'مغلق', gradient: 'from-[#0A2A66] to-[rgba(10,42,102,0.4)]' },
      completed: { label: 'مكتمل', gradient: 'from-[#143D8D] to-[#47A1FF]' },
      pending: { label: 'قيد الانتظار', gradient: 'from-[#0A2A66] to-[#1B4FA9]' },
      cancelled: { label: 'ملغي', gradient: 'from-[#072A52] to-[rgba(10,42,102,0.6)]' },
    };
    return statusMap[status] || statusMap.request;
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن مشروع أو عميل..."
            className="w-full pr-10 pl-4 py-3 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent
              transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500
              hover:border-slate-400 dark:hover:border-slate-500"
          />
        </div>

        {onCreateProject && (
          <button
            onClick={onCreateProject}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0A2A66] to-[#1B4FA9]
              hover:from-[#0d3380] hover:to-[#2260c4] text-white rounded-xl transition-all
              shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة مشروع جديد</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-600 dark:text-slate-300">جاري التحميل...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-8 text-center text-slate-600 dark:text-slate-300">لا توجد مشاريع</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-dark-border">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200">اسم المشروع</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200">العميل</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200">الحالة</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200">مدير المشروع</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200">
                  <span dir="ltr">تاريخ البدء</span>
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200">
                  <span dir="ltr">القيمة</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
              {filteredProjects.map((project) => {
                const statusStyle = getStatusStyle(project.status);
                return (
                  <tr
                    key={project.id}
                    onClick={() => onSelectProject(project.id)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#0A2A66] dark:group-hover:text-[#47A1FF] transition-colors">
                        {project.name}
                      </div>
                      {project.description && (
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                          {project.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0A2A66] to-[#1B4FA9]
                          flex items-center justify-center shadow-md overflow-hidden flex-shrink-0">
                          {project.client.client_image ? (
                            <img
                              src={project.client.client_image}
                              alt={project.client.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{project.client.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium text-white
                        bg-gradient-to-l ${statusStyle.gradient} shadow-sm`}>
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {project.project_manager?.full_name || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300" dir="ltr">
                      {project.start_date ? formatDateArabic(project.start_date) : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-800 dark:text-slate-100 font-bold" dir="ltr">
                      {formatCurrency(project.total_price, project.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
