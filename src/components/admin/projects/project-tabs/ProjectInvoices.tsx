import { useState, useEffect } from 'react';
import { Plus, CreditCard, Eye, EyeOff, Download, Send, XCircle, Banknote, ChevronDown } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { formatCurrency, formatDateArabic } from '../../../../lib/formatters';
import { CreateInvoiceModal } from '../../invoices/CreateInvoiceModal';
import { useNotification } from '../../../../contexts/NotificationContext';
import { Modal } from '../../../shared/Modal';
import { ConfirmationModal } from '../../../shared/ConfirmationModal';
import { PAYMENT_METHODS } from '../../../../types/database';
import type { InvoicePayment } from '../../../../types/database';

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  status: string;
  currency: string;
  payments: InvoicePayment[] | null;
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

const INVOICE_STATUSES: Record<string, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: '#94a3b8' },
  sent: { label: 'مرسلة', color: 'var(--color-primary)' },
  paid: { label: 'مدفوعة', color: 'var(--color-primary)' },
  overdue: { label: 'متأخرة', color: '#64748b' },
  cancelled: { label: 'ملغاة', color: '#94a3b8' },
};

export const ProjectInvoices = ({ projectId }: ProjectInvoicesProps) => {
  const { showSuccess, showError } = useNotification();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Payment modal state
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer' as 'bank_transfer' | 'cash' | 'check',
    notes: '',
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Cancel confirmation state
  const [cancelInvoice, setCancelInvoice] = useState<Invoice | null>(null);

  // Status dropdown state
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);

  // Hide amounts state
  const [hideAmounts, setHideAmounts] = useState(false);
  const masked = (value: string) => hideAmounts ? '••••••' : value;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setStatusDropdown(null);
    if (statusDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [statusDropdown]);

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

  const handleDownloadInvoice = (invoice: Invoice) => {
    const statusInfo = getStatusInfo(invoice.status);
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>فاتورة #${invoice.invoice_number}</title>
      <style>body{font-family:system-ui,sans-serif;padding:40px;max-width:800px;margin:auto}
      table{width:100%;border-collapse:collapse;margin:20px 0}td,th{border:1px solid #ddd;padding:10px;text-align:right}
      th{background:#f5f5f5}.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:30px}
      .badge{display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;color:#fff;background:${statusInfo.color}}
      @media print{button{display:none}}</style></head><body>
      <div class="header"><h1>فاتورة #${invoice.invoice_number}</h1><span class="badge">${statusInfo.label}</span></div>
      <table><tr><th>تاريخ الإصدار</th><td>${invoice.issue_date}</td></tr>
      ${invoice.due_date ? `<tr><th>تاريخ الاستحقاق</th><td>${invoice.due_date}</td></tr>` : ''}
      <tr><th>المبلغ الإجمالي</th><td>${invoice.total_amount} ${invoice.currency}</td></tr>
      <tr><th>المبلغ المدفوع</th><td>${invoice.paid_amount} ${invoice.currency}</td></tr>
      <tr><th>المتبقي</th><td>${invoice.total_amount - invoice.paid_amount} ${invoice.currency}</td></tr></table>
      <button onclick="window.print()" style="padding:10px 20px;background:#0A2A66;color:#fff;border:none;border-radius:8px;cursor:pointer">طباعة</button>
      </body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // --- Status change handlers ---

  const handleSendInvoice = async (invoice: Invoice) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id);

      if (error) throw error;

      showSuccess('تم إرسال الفاتورة بنجاح');
      loadInvoices();
      if (selectedInvoice?.id === invoice.id) {
        setSelectedInvoice({ ...invoice, status: 'sent' });
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      showError('حدث خطأ أثناء إرسال الفاتورة');
    }
  };

  const handleCancelInvoice = async () => {
    if (!cancelInvoice) return;
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', cancelInvoice.id);

      if (error) throw error;

      showSuccess('تم إلغاء الفاتورة بنجاح');
      setCancelInvoice(null);
      loadInvoices();
      if (selectedInvoice?.id === cancelInvoice.id) {
        setSelectedInvoice({ ...cancelInvoice, status: 'cancelled' });
      }
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      showError('حدث خطأ أثناء إلغاء الفاتورة');
    }
  };

  const handleStatusChange = async (invoice: Invoice, newStatus: string) => {
    if (newStatus === 'cancelled') {
      setCancelInvoice(invoice);
      setStatusDropdown(null);
      return;
    }
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoice.id);
      if (error) throw error;
      const statusLabels: Record<string, string> = { draft: 'مسودة', sent: 'مرسلة', paid: 'مدفوعة', overdue: 'متأخرة' };
      showSuccess(`تم تغيير الحالة إلى ${statusLabels[newStatus] || newStatus}`);
      setStatusDropdown(null);
      loadInvoices();
      if (selectedInvoice?.id === invoice.id) {
        setSelectedInvoice({ ...invoice, status: newStatus });
      }
    } catch (error) {
      console.error('Error changing status:', error);
      showError('حدث خطأ أثناء تغيير الحالة');
    }
  };

  // --- Payment handlers ---

  const openPaymentModal = (invoice: Invoice) => {
    const remaining = invoice.total_amount - invoice.paid_amount;
    setPaymentInvoice(invoice);
    setPaymentForm({
      amount: remaining.toString(),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      notes: '',
    });
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;

    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      showError('يرجى إدخال مبلغ صحيح');
      return;
    }

    const remaining = paymentInvoice.total_amount - paymentInvoice.paid_amount;
    if (amount > remaining) {
      showError('المبلغ المدخل أكبر من المبلغ المتبقي');
      return;
    }

    setPaymentLoading(true);
    try {
      const newPayment: InvoicePayment = {
        id: crypto.randomUUID(),
        amount,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        notes: paymentForm.notes || null,
        created_at: new Date().toISOString(),
      };

      const existingPayments: InvoicePayment[] = paymentInvoice.payments || [];
      const updatedPayments = [...existingPayments, newPayment];
      const newPaidAmount = paymentInvoice.paid_amount + amount;
      const fullyPaid = newPaidAmount >= paymentInvoice.total_amount;

      const { error } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          status: fullyPaid ? 'paid' : paymentInvoice.status === 'draft' ? 'sent' : paymentInvoice.status,
          payments: updatedPayments,
        })
        .eq('id', paymentInvoice.id);

      if (error) throw error;

      showSuccess(fullyPaid ? 'تم تسجيل الدفعة - الفاتورة مدفوعة بالكامل' : 'تم تسجيل الدفعة بنجاح');
      setPaymentInvoice(null);
      loadInvoices();
      if (selectedInvoice?.id === paymentInvoice.id) {
        setSelectedInvoice({
          ...paymentInvoice,
          paid_amount: newPaidAmount,
          status: fullyPaid ? 'paid' : paymentInvoice.status,
          payments: updatedPayments,
        });
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      showError('حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setPaymentLoading(false);
    }
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={() => setHideAmounts(!hideAmounts)}
          className="btn btn-ghost"
          style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, color: 'var(--text-muted, #94a3b8)' }}
        >
          {hideAmounts ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {hideAmounts ? 'إظهار المبالغ' : 'إخفاء المبالغ'}
        </button>
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!projectData}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg transition-all font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}
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
            const remaining = invoice.total_amount - invoice.paid_amount;
            const canRecordPayment = invoice.status !== 'cancelled' && invoice.status !== 'paid' && remaining > 0;
            const canSend = invoice.status === 'draft';
            const canCancel = invoice.status !== 'cancelled' && invoice.status !== 'paid';

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
                      <span className="px-3 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: statusInfo.color }}>
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
                      {masked(formatCurrency(invoice.total_amount, invoice.currency))}
                    </div>
                    {invoice.paid_amount > 0 && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1" dir="ltr">
                        مدفوع: {masked(formatCurrency(invoice.paid_amount, invoice.currency))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-dark-border flex-wrap">
                  <button
                    onClick={() => setSelectedInvoice(invoice)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-[#0A2A66] dark:text-[#47A1FF]
                      rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    <span>عرض</span>
                  </button>
                  <button
                    onClick={() => handleDownloadInvoice(invoice)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-[#0A2A66] dark:text-[#47A1FF]
                      rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل</span>
                  </button>

                  {canRecordPayment && (
                    <button
                      onClick={() => openPaymentModal(invoice)}
                      className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all text-sm font-medium"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>تسجيل دفعة</span>
                    </button>
                  )}

                  {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setStatusDropdown(statusDropdown === invoice.id ? null : invoice.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300
                          rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all text-sm font-medium"
                      >
                        <span>تغيير الحالة</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {statusDropdown === invoice.id && (
                        <div
                          style={{
                            position: 'absolute', top: '100%', left: 0, marginTop: 4, minWidth: 160,
                            background: 'var(--bg-elevated, #fff)', border: '1px solid var(--border-primary, #e2e8f0)',
                            borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden',
                          }}
                          dir="rtl"
                        >
                          {Object.entries(INVOICE_STATUSES)
                            .filter(([key]) => key !== invoice.status)
                            .map(([key, val]) => (
                              <button
                                key={key}
                                onClick={() => handleStatusChange(invoice, key)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px',
                                  fontSize: 13, fontWeight: 500, border: 'none', background: 'transparent', cursor: 'pointer',
                                  color: 'var(--text-primary, #1e293b)', textAlign: 'right',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover, #f1f5f9)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: val.color, flexShrink: 0 }} />
                                {val.label}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Invoice Modal */}
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

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
          <div
            className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                فاتورة #{selectedInvoice.invoice_number}
              </h3>
              <span
                className="px-3 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: getStatusInfo(selectedInvoice.status).color }}
              >
                {getStatusInfo(selectedInvoice.status).label}
              </span>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">تاريخ الإصدار</span>
                <span className="font-medium text-slate-800 dark:text-slate-100" dir="ltr">{formatDateArabic(selectedInvoice.issue_date)}</span>
              </div>
              {selectedInvoice.due_date && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">تاريخ الاستحقاق</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100" dir="ltr">{formatDateArabic(selectedInvoice.due_date)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">المبلغ الإجمالي</span>
                <span className="font-bold text-lg text-[#0A2A66] dark:text-[#47A1FF]" dir="ltr">{formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">المدفوع</span>
                <span className="font-medium text-slate-800 dark:text-slate-100" dir="ltr">{formatCurrency(selectedInvoice.paid_amount, selectedInvoice.currency)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-dark-border pt-3">
                <span className="text-slate-500 dark:text-slate-400">المتبقي</span>
                <span className="font-bold text-slate-800 dark:text-slate-100" dir="ltr">{formatCurrency(selectedInvoice.total_amount - selectedInvoice.paid_amount, selectedInvoice.currency)}</span>
              </div>
            </div>

            {/* Payment History */}
            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-dark-border">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">سجل الدفعات</h4>
                <div className="space-y-3">
                  {selectedInvoice.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-[#0A2A66] dark:text-[#47A1FF]" dir="ltr">
                          {formatCurrency(payment.amount, selectedInvoice.currency)}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {PAYMENT_METHODS[payment.payment_method] || payment.payment_method}
                        </span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs">
                        <span dir="ltr">{formatDateArabic(payment.payment_date)}</span>
                      </div>
                      {payment.notes && (
                        <div className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                          {payment.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleDownloadInvoice(selectedInvoice)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg font-medium"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Download className="w-4 h-4" />
                تحميل
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentInvoice && (
        <Modal isOpen={true} onClose={() => setPaymentInvoice(null)} title="تسجيل دفعة" maxWidth="md">
          <form onSubmit={handleRecordPayment} className="space-y-4" dir="rtl">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-sm mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-slate-500 dark:text-slate-400">الفاتورة</span>
                <span className="font-medium text-slate-800 dark:text-slate-100" dir="ltr">#{paymentInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-500 dark:text-slate-400">المبلغ الإجمالي</span>
                <span className="font-medium text-slate-800 dark:text-slate-100" dir="ltr">{formatCurrency(paymentInvoice.total_amount, paymentInvoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">المتبقي</span>
                <span className="font-bold text-[#0A2A66] dark:text-[#47A1FF]" dir="ltr">{formatCurrency(paymentInvoice.total_amount - paymentInvoice.paid_amount, paymentInvoice.currency)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">المبلغ</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={paymentInvoice.total_amount - paymentInvoice.paid_amount}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                required
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">تاريخ الدفع</label>
              <input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">طريقة الدفع</label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as 'bank_transfer' | 'cash' | 'check' })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="cash">نقدي</option>
                <option value="check">شيك</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ملاحظات (اختياري)</label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                rows={2}
                placeholder="أي ملاحظات إضافية..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={paymentLoading}
                className="flex-1 py-2.5 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {paymentLoading ? 'جاري التسجيل...' : 'تسجيل الدفعة'}
              </button>
              <button
                type="button"
                onClick={() => setPaymentInvoice(null)}
                className="px-6 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 rounded-lg transition-colors font-medium"
              >
                إلغاء
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Invoice Confirmation */}
      <ConfirmationModal
        isOpen={!!cancelInvoice}
        title="إلغاء الفاتورة"
        message={`هل أنت متأكد من إلغاء الفاتورة #${cancelInvoice?.invoice_number}؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="نعم، إلغاء الفاتورة"
        cancelText="تراجع"
        onConfirm={handleCancelInvoice}
        onCancel={() => setCancelInvoice(null)}
        type="danger"
      />
    </div>
  );
};
