import { useState, useEffect } from 'react';
import { ArrowRight, Plus, FolderOpen, CheckCircle2, Clock, FileText, DollarSign, TrendingUp, TrendingDown, Eye, User } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { formatNumber, formatCurrency, formatDateArabic } from '../../lib/formatters';
import type { Client, Project } from '../../types/database';

interface ClientDashboardProps {
  clientId: string;
  onBack: () => void;
  onViewProjects: (clientId: string) => void;
  onViewProject: (projectId: string) => void;
  onCreateProject: (clientId: string) => void;
}

interface ClientStats {
  totalProjects: number;
  openProjects: number;
  closedProjects: number;
  totalInvoices: number;
  totalInvoiceAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

export const ClientDashboard = ({
  clientId,
  onBack,
  onViewProjects,
  onViewProject,
  onCreateProject,
}: ClientDashboardProps) => {
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [stats, setStats] = useState<ClientStats>({
    totalProjects: 0,
    openProjects: 0,
    closedProjects: 0,
    totalInvoices: 0,
    totalInvoiceAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    try {
      setLoading(true);

      const [clientRes, projectsRes, invoicesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
        supabase.from('projects').select('*').eq('client_id', clientId),
        supabase.from('invoices').select('*').eq('client_id', clientId),
      ]);

      if (clientRes.data) {
        setClient(clientRes.data);
      }

      const projects = projectsRes.data || [];
      const openStatuses = ['request', 'quoted', 'invoiced', 'po_issued', 'partial_paid', 'in_progress'];
      const closedStatuses = ['paid', 'closed'];

      const openProjects = projects.filter((p) => openStatuses.includes(p.status));
      const closedProjects = projects.filter((p) => closedStatuses.includes(p.status));

      const invoices = invoicesRes.data || [];
      const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
      const paidAmount = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);

      setStats({
        totalProjects: projects.length,
        openProjects: openProjects.length,
        closedProjects: closedProjects.length,
        totalInvoices: invoices.length,
        totalInvoiceAmount,
        paidAmount,
        remainingAmount: totalInvoiceAmount - paidAmount,
      });

      const recent = projects
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5);
      setRecentProjects(recent);
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      request: { label: 'طلب', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
      quoted: { label: 'عرض سعر', color: 'bg-[#0A2A66]/10 text-[#0A2A66] dark:bg-[#0A2A66]/30 dark:text-[#7CC9FF]' },
      invoiced: { label: 'فاتورة', color: 'bg-[#143D8D]/10 text-[#143D8D] dark:bg-[#143D8D]/30 dark:text-[#47A1FF]' },
      po_issued: { label: 'أمر شراء', color: 'bg-[#1B4FA9]/10 text-[#1B4FA9] dark:bg-[#1B4FA9]/30 dark:text-[#7CC9FF]' },
      partial_paid: { label: 'مدفوع جزئي', color: 'bg-[#47A1FF]/10 text-[#143D8D] dark:bg-[#47A1FF]/30 dark:text-[#7CC9FF]' },
      paid: { label: 'مدفوع', color: 'bg-[#1B4FA9]/20 text-[#0A2A66] dark:bg-[#1B4FA9]/40 dark:text-white' },
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

  if (!client) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-600 dark:text-slate-300">العميل غير موجود</div>
      </div>
    );
  }

  const showFinancialData = user?.role !== 'client_user';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0A2A66] to-[#1B4FA9]
            flex items-center justify-center shadow-lg overflow-hidden">
            {client.client_image ? (
              <img
                src={client.client_image}
                alt={client.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{client.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{client.email || 'لا يوجد بريد إلكتروني'}</p>
          </div>
        </div>
        <button
          onClick={() => onCreateProject(clientId)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0A2A66] to-[#1B4FA9]
            hover:from-[#0d3380] hover:to-[#2260c4] text-white rounded-xl transition-all
            shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة مشروع جديد</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0A2A66] to-[#143D8D] p-6
          shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1
          backdrop-blur-sm border border-white/10">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-normal text-white/70">Total Projects</p>
            <p className="text-4xl font-bold text-white" style={{ direction: 'ltr', textAlign: 'right' }}>
              {formatNumber(stats.totalProjects)}
            </p>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0A2A66] to-[#1B4FA9] p-6
          shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1
          backdrop-blur-sm border border-white/10">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-normal text-white/70">Open Projects</p>
            <p className="text-4xl font-bold text-white" style={{ direction: 'ltr', textAlign: 'right' }}>
              {formatNumber(stats.openProjects)}
            </p>
          </div>
          <p className="text-xs text-white/60 mt-2">In progress</p>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#143D8D] to-[#47A1FF] p-6
          shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1
          backdrop-blur-sm border border-white/10">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-normal text-white/70">Closed Projects</p>
            <p className="text-4xl font-bold text-white" style={{ direction: 'ltr', textAlign: 'right' }}>
              {formatNumber(stats.closedProjects)}
            </p>
          </div>
          <p className="text-xs text-white/60 mt-2">Completed</p>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0A2A66] to-[#47A1FF] p-6
          shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1
          backdrop-blur-sm border border-white/10">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-normal text-white/70">Total Invoices</p>
            <p className="text-4xl font-bold text-white" style={{ direction: 'ltr', textAlign: 'right' }}>
              {formatNumber(stats.totalInvoices)}
            </p>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>
      </div>

      {showFinancialData && (
        <div className="bg-white dark:bg-dark-card rounded-[24px] shadow-lg border border-slate-200 dark:border-dark-border p-6
          hover:shadow-xl transition-all duration-300">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#0A2A66] dark:text-white" />
            البيانات المالية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#0A2A66] to-[#143D8D] p-5
              shadow-md hover:shadow-lg transition-all duration-300 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-normal text-white/70">Total Invoices</p>
              </div>
              <p className="text-3xl font-bold text-white" style={{ direction: 'ltr', textAlign: 'right' }}>
                {formatCurrency(stats.totalInvoiceAmount)}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#143D8D] to-[#1B4FA9] p-5
              shadow-md hover:shadow-lg transition-all duration-300 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-normal text-white/70">Paid Amount</p>
              </div>
              <p className="text-3xl font-bold text-white" style={{ direction: 'ltr', textAlign: 'right' }}>
                {formatCurrency(stats.paidAmount)}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#1B4FA9] to-[#47A1FF] p-5
              shadow-md hover:shadow-lg transition-all duration-300 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/10 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-normal text-white/70">Remaining</p>
              </div>
              <p className="text-3xl font-bold text-white" style={{ direction: 'ltr', textAlign: 'right' }}>
                {formatCurrency(stats.remainingAmount)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-dark-card rounded-[24px] shadow-lg border border-slate-200 dark:border-dark-border
        hover:shadow-xl transition-all duration-300">
        <div className="p-6 border-b border-slate-200 dark:border-dark-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">أحدث المشاريع</h2>
          <button
            onClick={() => onViewProjects(clientId)}
            className="text-sm text-[#0A2A66] dark:text-blue-400 hover:underline font-medium"
          >
            عرض الكل
          </button>
        </div>
        <div className="overflow-x-auto">
          {recentProjects.length === 0 ? (
            <div className="p-6 text-center text-slate-600 dark:text-slate-400">لا توجد مشاريع</div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-dark-border">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                    اسم المشروع
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                    تاريخ البداية
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
                {recentProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800 dark:text-slate-100">{project.name}</div>
                      {project.project_code && (
                        <div className="text-xs text-slate-500 dark:text-slate-400" style={{ direction: 'ltr', textAlign: 'right' }}>
                          {project.project_code}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(project.status)}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm" style={{ direction: 'ltr', textAlign: 'right' }}>
                      {project.start_date ? formatDateArabic(project.start_date) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => onViewProject(project.id)}
                        className="flex items-center gap-1 text-sm text-[#0A2A66] hover:text-[#143D8D]
                          dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        عرض
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
