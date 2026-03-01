import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { LogOut, FolderOpen, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { ClientProjectDetails } from './ClientProjectDetails';

interface Stats {
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  total_price: number;
  currency: string;
}

export const ClientDashboard = () => {
  const { profile, signOut } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalInvoices: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', profile?.id)
        .maybeSingle();

      if (!clientData) return;

      const [invoicesRes, projectsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('status')
          .eq('client_id', clientData.id),
        supabase
          .from('projects')
          .select('*')
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false }),
      ]);

      const totalInvoices = invoicesRes.data?.length || 0;
      const paidInvoices = invoicesRes.data?.filter(inv => inv.status === 'paid').length || 0;
      const unpaidInvoices = invoicesRes.data?.filter(inv => ['unpaid', 'partial'].includes(inv.status)).length || 0;

      setStats({ totalInvoices, paidInvoices, unpaidInvoices });
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (selectedProjectId) {
    return (
      <ClientProjectDetails
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'in_progress': return 'قيد التنفيذ';
      case 'pending': return 'قيد الانتظار';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">بوابة العميل</h1>
            <p className="text-slate-600 text-sm">مرحباً، {profile?.full_name}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <span>تسجيل الخروج</span>
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-1">إجمالي الفواتير</p>
            <p className="text-3xl font-bold text-slate-800">{stats.totalInvoices}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-1">الفواتير المسددة</p>
            <p className="text-3xl font-bold text-slate-800">{stats.paidInvoices}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-1">الفواتير غير المسددة</p>
            <p className="text-3xl font-bold text-slate-800">{stats.unpaidInvoices}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">مشاريعي</h2>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-600">جاري التحميل...</div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center text-slate-600">لا توجد مشاريع</div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">اسم المشروع</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">الحالة</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">تاريخ البدء</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">القيمة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FolderOpen className="w-5 h-5 text-blue-600" />
                          <div>
                            <div className="font-medium text-slate-800">{project.name}</div>
                            {project.description && (
                              <div className="text-sm text-slate-600 mt-1 line-clamp-1">
                                {project.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {project.start_date ? new Date(project.start_date).toLocaleDateString('en-US') : '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {project.total_price.toLocaleString('en-US')} {project.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
