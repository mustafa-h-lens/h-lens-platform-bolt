import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, ExternalLink } from 'lucide-react';
import { CreateInvoiceModal } from './CreateInvoiceModal';

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

interface InvoicesTabProps {
  project: {
    id: string;
    client: {
      id: string;
    };
    total_price: number;
    currency: string;
  };
  onUpdate: () => void;
}

export const InvoicesTab = ({ project, onUpdate }: InvoicesTabProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [project.id]);

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'unpaid': return 'bg-red-100 text-red-700';
      case 'partial': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'مدفوعة';
      case 'unpaid': return 'غير مدفوعة';
      case 'partial': return 'مدفوعة جزئياً';
      case 'cancelled': return 'ملغاة';
      default: return status;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">فواتير المشروع</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>إصدار فاتورة جديدة</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-600">جاري التحميل...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <p className="text-slate-600 mb-4">لا توجد فواتير لهذا المشروع</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            إصدار أول فاتورة
          </button>
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
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">المبلغ المدفوع</th>
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
                      {getStatusText(invoice.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {invoice.total_amount.toLocaleString('en-US')} {invoice.currency}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {invoice.paid_amount.toLocaleString('en-US')} {invoice.currency}
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

      {showCreateModal && (
        <CreateInvoiceModal
          project={project}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadInvoices();
            onUpdate();
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};
