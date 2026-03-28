import { useState, useEffect } from 'react';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useClientPortal } from '../../contexts/ClientPortalContext';
import { formatCurrency, formatDateArabic, formatNumber } from '../../lib/formatters';

export const ClientInvoices = () => {
  const { client } = useClientPortal();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client?.id) return;
    loadInvoices();
  }, [client?.id]);

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, paid_amount, status, currency, issue_date, due_date, projects(name)')
        .eq('client_id', client!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvoices((data || []).map((inv: any) => ({
        ...inv,
        project_name: inv.projects?.name || '-',
        paid_amount: inv.paid_amount || 0,
        currency: inv.currency || 'SAR',
      })));
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally { setLoading(false); }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      paid: { label: 'مدفوع', cls: 'badge badge-green' }, partial: { label: 'جزئي', cls: 'badge badge-amber' },
      unpaid: { label: 'غير مدفوع', cls: 'badge badge-red' }, sent: { label: 'مرسل', cls: 'badge badge-blue' },
      draft: { label: 'مسودة', cls: 'badge badge-gray' }, overdue: { label: 'متأخر', cls: 'badge badge-red' },
      cancelled: { label: 'ملغي', cls: 'badge badge-red' },
    };
    return map[status] || { label: status, cls: 'badge badge-gray' };
  };

  const totalInvoiced = invoices.reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paid_amount, 0);
  const totalOutstanding = totalInvoiced - totalPaid;
  const currency = invoices[0]?.currency || 'SAR';

  if (loading) return <div className="dash-empty" style={{ height: 384 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;

  return (
    <div>
      <div className="page-title-row">
        <div>
          <div className="page-title">الفواتير</div>
          <div className="page-subtitle">جميع الفواتير الخاصة بمشاريعك</div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card sc-purple">
          <div className="stat-icon-box"><FileText size={18} /></div>
          <div className="stat-sub">إجمالي الفواتير</div>
          <div className="stat-val" dir="ltr">{formatCurrency(totalInvoiced, currency)}</div>
          <div className="stat-hint">{formatNumber(invoices.length)} فاتورة</div>
        </div>
        <div className="stat-card sc-green">
          <div className="stat-icon-box"><CheckCircle size={18} /></div>
          <div className="stat-sub">المدفوع</div>
          <div className="stat-val" dir="ltr">{formatCurrency(totalPaid, currency)}</div>
        </div>
        <div className="stat-card sc-amber">
          <div className="stat-icon-box"><AlertCircle size={18} /></div>
          <div className="stat-sub">المتبقي</div>
          <div className="stat-val" dir="ltr">{formatCurrency(totalOutstanding, currency)}</div>
        </div>
      </div>

      {/* Table */}
      {invoices.length === 0 ? (
        <div className="dash-empty" style={{ height: 200 }}>
          <FileText size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد فواتير بعد</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>المشروع</th>
                <th>المبلغ</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>الحالة</th>
                <th>الاستحقاق</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const badge = getStatusBadge(inv.status);
                const remaining = inv.total_amount - inv.paid_amount;
                return (
                  <tr key={inv.id}>
                    <td className="td-primary">#{inv.invoice_number}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{inv.project_name}</td>
                    <td style={{ fontWeight: 600 }} dir="ltr">{formatCurrency(inv.total_amount, inv.currency)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success-text)' }} dir="ltr">{formatCurrency(inv.paid_amount, inv.currency)}</td>
                    <td style={{ fontWeight: 600, color: remaining > 0 ? 'var(--warning-text)' : 'var(--success-text)' }} dir="ltr">{formatCurrency(remaining, inv.currency)}</td>
                    <td><span className={badge.cls}>{badge.label}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{formatDateArabic(inv.due_date)}</td>
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
