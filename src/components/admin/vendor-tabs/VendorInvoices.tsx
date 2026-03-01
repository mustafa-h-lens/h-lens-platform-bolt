import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { formatCurrency } from '../../../lib/formatters';

interface Invoice {
  id: string;
  vendor_id: string;
  project_id: string;
  client_id: string;
  amount_total: number;
  amount_paid: number;
  amount_remaining: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  due_date?: string;
  created_at: string;
  project?: {
    name: string;
    field?: string;
  };
  client?: {
    name: string;
  };
}

interface VendorInvoicesProps {
  vendorId: string;
}

export const VendorInvoices = ({ vendorId }: VendorInvoicesProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, [vendorId]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_invoices')
        .select(`
          *,
          project:projects(name, field),
          client:clients(name)
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">مدفوعة</span>;
      case 'partial':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">مدفوعة جزئياً</span>;
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">قيد الانتظار</span>;
      case 'overdue':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">متأخرة</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">الفواتير</h2>
          <p className="text-sm text-slate-600 mt-1">
            عرض فقط - الفواتير تُنشأ تلقائياً عند تعيين المورد على مشروع
          </p>
        </div>
      </div>

      {invoices.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">المشروع</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">العميل</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">المجال</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">الإجمالي</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">المدفوع</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">المتبقي</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">الحالة</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">تاريخ الاستحقاق</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">
                        {invoice.project?.name || 'غير محدد'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700">
                        {invoice.client?.name || 'غير محدد'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700">
                        {invoice.project?.field || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900" dir="ltr">
                        {formatCurrency(invoice.amount_total)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-green-700 font-medium" dir="ltr">
                        {formatCurrency(invoice.amount_paid)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-orange-700 font-medium" dir="ltr">
                        {formatCurrency(invoice.amount_remaining)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700" dir="ltr">
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('ar-SA') : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm">
                        <ExternalLink className="w-4 h-4" />
                        عرض المشروع
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
          <p className="text-blue-900 font-medium mb-2">لا توجد فواتير لهذا المورد</p>
          <p className="text-blue-700 text-sm">
            سيتم إنشاء الفواتير تلقائياً عند تعيين المورد على مشاريع
          </p>
        </div>
      )}
    </div>
  );
};
