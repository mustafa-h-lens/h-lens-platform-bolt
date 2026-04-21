import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft, ExternalLink } from 'lucide-react';

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

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  currency: string;
  file_url: string | null;
}

interface ClientProjectDetailsProps {
  projectId: string;
  onBack: () => void;
}

export const ClientProjectDetails = ({ projectId, onBack }: ClientProjectDetailsProps) => {
  const [project, setProject] = useState<Project | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'invoices'>('details');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const [projectRes, invoicesRes] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single(),
        supabase
          .from('invoices')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
      ]);

      if (projectRes.error) throw projectRes.error;
      setProject(projectRes.data);
      setInvoices(invoicesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">جاري التحميل...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">المشروع غير موجود</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'paid': return 'bg-green-100 text-green-700';
      case 'unpaid': return 'bg-red-100 text-red-700';
      case 'partial': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusText = (status: string, type: 'project' | 'invoice') => {
    if (type === 'project') {
      switch (status) {
        case 'completed': return 'مكتمل';
        case 'in_progress': return 'قيد التنفيذ';
        case 'pending': return 'قيد الانتظار';
        case 'cancelled': return 'ملغي';
        default: return status;
      }
    } else {
      switch (status) {
        case 'paid': return 'مدفوعة';
        case 'unpaid': return 'غير مدفوعة';
        case 'partial': return 'مدفوعة جزئياً';
        case 'cancelled': return 'ملغاة';
        default: return status;
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>العودة للمشاريع</span>
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">{project.name}</h1>
              {project.description && (
                <p className="text-slate-600">{project.description}</p>
              )}
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
              {getStatusText(project.status, 'project')}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="border-b border-slate-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'details'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                تفاصيل المشروع
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'invoices'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                الفواتير
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'details' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">تاريخ البدء</h3>
                    <p className="text-slate-600">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString('en-US') : 'غير محدد'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">تاريخ الانتهاء</h3>
                    <p className="text-slate-600">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString('en-US') : 'غير محدد'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">قيمة المشروع</h3>
                    <p className="text-slate-600">
                      {project.total_price.toLocaleString('en-US')} {project.currency}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">فواتير المشروع</h3>

                {invoices.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <p className="text-slate-600">لا توجد فواتير لهذا المشروع</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">رقم الفاتورة</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">تاريخ الإصدار</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">تاريخ الاستحقاق</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">الحالة</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">المبلغ</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">ملف الفاتورة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-700 font-medium">{invoice.invoice_number}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {new Date(invoice.issue_date).toLocaleDateString('en-US')}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {new Date(invoice.due_date).toLocaleDateString('en-US')}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                                {getStatusText(invoice.status, 'invoice')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {invoice.total_amount.toLocaleString('en-US')} {invoice.currency}
                            </td>
                            <td className="px-4 py-3">
                              {invoice.file_url ? (
                                <a
                                  href={invoice.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>عرض</span>
                                </a>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
