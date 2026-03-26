import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { formatCurrency } from '../../../../lib/formatters';
import { toEnglishNumbers } from '../../../../lib/numberUtils';

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
        return <span className="badge badge-green">مدفوعة</span>;
      case 'partial':
        return <span className="badge badge-blue">مدفوعة جزئياً</span>;
      case 'pending':
        return <span className="badge badge-amber">قيد الانتظار</span>;
      case 'overdue':
        return <span className="badge badge-red">متأخرة</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="dash-empty" style={{ height: 256 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>الفواتير</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            عرض فقط - الفواتير تُنشأ تلقائياً عند تعيين المورد على مشروع
          </p>
        </div>
      </div>

      {invoices.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المشروع</th>
                <th>العميل</th>
                <th>المجال</th>
                <th>الإجمالي</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>الحالة</th>
                <th>تاريخ الاستحقاق</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <span className="td-primary">
                      {invoice.project?.name || 'غير محدد'}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {invoice.client?.name || 'غير محدد'}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {invoice.project?.field || '-'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }} dir="ltr">
                      {formatCurrency(invoice.amount_total)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500, color: 'var(--success-text)', fontSize: 13 }} dir="ltr">
                      {formatCurrency(invoice.amount_paid)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500, color: 'var(--warning-text)', fontSize: 13 }} dir="ltr">
                      {formatCurrency(invoice.amount_remaining)}
                    </span>
                  </td>
                  <td>
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }} dir="ltr">
                      {invoice.due_date ? toEnglishNumbers(new Date(invoice.due_date).toLocaleDateString('ar-SA')) : '-'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" style={{ gap: 6, color: 'var(--accent-lighter)', fontSize: 12 }}>
                      <ExternalLink size={13} />
                      عرض المشروع
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 48, background: 'var(--accent-glow)', border: '1px solid var(--accent-glow-md)' }}>
          <p style={{ color: 'var(--accent-lighter)', fontWeight: 500, marginBottom: 8 }}>لا توجد فواتير لهذا المورد</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            سيتم إنشاء الفواتير تلقائياً عند تعيين المورد على مشاريع
          </p>
        </div>
      )}
    </div>
  );
};
