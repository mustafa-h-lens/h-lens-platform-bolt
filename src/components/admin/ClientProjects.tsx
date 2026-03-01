import { useState, useEffect } from 'react';
import { Search, Filter, Eye, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { formatNumber, formatCurrency, formatDateArabic } from '../../lib/formatters';
import type { Project, Client } from '../../types/database';

interface ClientProjectsProps {
  clientId: string;
  onViewProject: (projectId: string) => void;
}

export const ClientProjects = ({ clientId, onViewProject }: ClientProjectsProps) => {
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [clientId]);

  useEffect(() => {
    filterProjects();
  }, [searchQuery, statusFilter, projects]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [clientRes, projectsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
        supabase.from('projects').select('*').eq('client_id', clientId).order('updated_at', { ascending: false }),
      ]);

      if (clientRes.data) {
        setClient(clientRes.data);
      }

      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = projects;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.project_code && p.project_code.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    setFilteredProjects(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      request: { label: 'طلب', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
      quoted: { label: 'عرض سعر', color: 'bg-[#0A2A66]/10 text-[#0A2A66] dark:bg-[#0A2A66]/30 dark:text-[#7CC9FF]' },
      invoiced: { label: 'فاتورة', color: 'bg-[#143D8D]/10 text-[#143D8D] dark:bg-[#143D8D]/30 dark:text-[#47A1FF]' },
      po_issued: { label: 'أمر شراء', color: 'bg-[#1B4FA9]/10 text-[#1B4FA9] dark:bg-[#1B4FA9]/30 dark:text-[#7CC9FF]' },
      partial_paid: { label: 'مدفوع جزئي', color: 'bg-[#47A1FF]/10 text-[#143D8D] dark:bg-[#47A1FF]/30 dark:text-[#7CC9FF]' },
      paid: { label: 'مدفوع', color: 'bg-[#1B4FA9]/20 text-[#0A2A66] dark:bg-[#1B4FA9]/40 dark:text-white' },
      pending: { label: 'معلق', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
      in_progress: { label: 'قيد التنفيذ', color: 'bg-[#0A2A66]/10 text-[#0A2A66] dark:bg-[#0A2A66]/30 dark:text-[#47A1FF]' },
      completed: { label: 'مكتمل', color: 'bg-[#143D8D]/20 text-[#0A2A66] dark:bg-[#143D8D]/40 dark:text-white' },
      closed: { label: 'مغلق', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
      cancelled: { label: 'ملغي', color: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-400' },
    };

    const statusInfo = statusMap[status] || statusMap.request;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-600 dark:text-slate-300">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            المشاريع ({formatNumber(projects.length)})
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            عرض وإدارة جميع المشاريع
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن مشروع..."
            className="w-full pr-10 pl-4 py-2.5 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="relative min-w-[200px]">
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
          >
            <option value="all">كل الحالات</option>
            <option value="request">طلب</option>
            <option value="quoted">عرض سعر</option>
            <option value="invoiced">فاتورة</option>
            <option value="po_issued">أمر شراء</option>
            <option value="partial_paid">مدفوع جزئي</option>
            <option value="paid">مدفوع</option>
            <option value="pending">معلق</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="completed">مكتمل</option>
            <option value="closed">مغلق</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-8">
          <div className="text-center text-slate-600 dark:text-slate-300">
            {searchQuery || statusFilter !== 'all' ? 'لا توجد نتائج للبحث' : 'لا توجد مشاريع'}
          </div>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-dark-border">
                  <tr>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                      اسم المشروع
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                      الكود
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                      إجمالي المبلغ
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                      آخر تعديل
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{project.name}</div>
                        {project.description && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                            {project.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {project.project_code || '-'}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(project.status)}</td>
                      <td className="px-6 py-4 text-slate-800 dark:text-slate-100 font-medium" style={{ direction: 'ltr', textAlign: 'right' }}>
                        {formatCurrency(project.total_price, project.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm" style={{ direction: 'ltr', textAlign: 'right' }}>
                          <Calendar className="w-4 h-4" />
                          <span>{formatDateArabic(project.updated_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => onViewProject(project.id)}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700
                            dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          عرض
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200
                  dark:border-dark-border p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{project.name}</h3>
                    {project.project_code && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{project.project_code}</p>
                    )}
                  </div>
                  {getStatusBadge(project.status)}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">إجمالي المبلغ</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300" style={{ direction: 'ltr', textAlign: 'right' }}>
                      {formatCurrency(project.total_price, project.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">آخر تعديل</p>
                    <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400" style={{ direction: 'ltr', textAlign: 'right' }}>
                      <Calendar className="w-3 h-3" />
                      <span>{formatDateArabic(project.updated_at)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onViewProject(project.id)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2
                    text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100
                    dark:hover:bg-blue-900/30 rounded-lg transition-colors text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  <span>عرض المشروع</span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
