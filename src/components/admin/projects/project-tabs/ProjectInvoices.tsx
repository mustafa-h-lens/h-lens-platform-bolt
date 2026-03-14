import { useState, useEffect } from 'react';
import { Plus, CreditCard, Eye, Download } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { formatCurrency, formatDateArabic } from '../../../../lib/formatters';
import { CreateInvoiceModal } from '../../invoices/CreateInvoiceModal';

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  status: string;
  currency: string;
  created_at: string;
}

interface ProjectData {
  id: string;
  client: { id: string };
  total_price: number;
  currency: string;
}

interface ProjectInvoicesProps {
  projectId: string;
}

const INVOICE_STATUSES: Record<string, { label: string; gradient: string }> = {
  draft: { label: 'مسودة', gradient: 'from-slate-400 to-slate-500' },
  sent: { label: 'مرسلة', gradient: 'from-[#0A2A66] to-[#143D8D]' },
  paid: { label: 'مدفوعة', gradient: 'from-[#1B4FA9] to-[#47A1FF]' },
  overdue: { label: 'متأخرة', gradient: 'from-slate-500 to-slate-600' },
  cancelled: { label: 'ملغاة', gradient: 'from-slate-400 to-slate-500' },
};

export const ProjectInvoices = ({ projectId }: ProjectInvoicesProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);

  useEffect(() => {
    loadInvoices();
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, total_price, currency, client_id')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      setProjectData({
        id: data.id,
        client: { id: data.client_id },
        total_price: data.total_price || 0,
        currency: data.currency || 'SAR',
      });
    } catch (error) {
      console.error('Error loading project data:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    return INVOICE_STATUSES[status] || INVOICE_STATUSES.draft;
  };

  if (loading) {
    return (
      <div className="text-center text-slate-600 py-8">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#0A2A66]/10 to-[#1B4FA9]/10
            border border-[#0A2A66]/20">
            <CreditCard className="w-5 h-5 text-[#0A2A66]" />
          </div>
          فواتير المشروع
        </h2>

        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!projectData}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9]
            text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>إصدار فاتورة</span>
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700
            flex items-center justify-center">
            <CreditCard className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">لا توجد فواتير لهذا المشروع</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {invoices.map((invoice) => {
            const statusInfo = getStatusInfo(invoice.status);

            return (
              <div
                key={invoice.id}
                className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border p-6
                  hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-100" dir="ltr">
                        #{invoice.invoice_number}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium text-white
                        bg-gradient-to-l ${statusInfo.gradient}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">تاريخ الإصدار: </span>
                        <span dir="ltr">{formatDateArabic(invoice.issue_date)}</span>
                      </div>
                      {invoice.due_date && (
                        <>
                          <span className="text-slate-400 dark:text-slate-500">•</span>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">تاريخ الاستحقاق: </span>
                            <span dir="ltr">{formatDateArabic(invoice.due_date)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">المبلغ الإجمالي</div>
                    <div className="text-xl font-bold text-[#0A2A66] dark:text-[#47A1FF]" dir="ltr">
                      {formatCurrency(invoice.total_amount, invoice.currency)}
                    </div>
                    {invoice.paid_amount > 0 && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1" dir="ltr">
                        مدفوع: {formatCurrency(invoice.paid_amount, invoice.currency)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-dark-border">
                  <button
                    onClick={() => {}}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-[#0A2A66] dark:text-[#47A1FF]
                      rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    <span>عرض</span>
                  </button>
                  <button
                    onClick={() => {}}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-[#0A2A66] dark:text-[#47A1FF]
                      rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && projectData && (
        <CreateInvoiceModal
          project={projectData}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadInvoices();
          }}
        />
      )}
    </div>
  );
};
