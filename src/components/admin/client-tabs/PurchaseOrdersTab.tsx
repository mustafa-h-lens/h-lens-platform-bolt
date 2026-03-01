import { useState, useEffect } from 'react';
import { Plus, FileText, Eye, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { formatCurrency } from '../../../lib/formatters';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import { Modal } from '../../shared/Modal';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';

interface PurchaseOrder {
  id: string;
  po_number: string;
  total_amount: number;
  used_amount: number;
  remaining_amount: number;
  status: string;
  file_url: string | null;
  notes: string | null;
  created_at: string;
}

interface PurchaseOrdersTabProps {
  clientId: string;
}

export const PurchaseOrdersTab = ({ clientId }: PurchaseOrdersTabProps) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState({
    po_number: '',
    total_amount: '',
    file_url: '',
    notes: '',
  });
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  useEffect(() => {
    loadOrders();
  }, [clientId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      showError('حدث خطأ أثناء تحميل أوامر الشراء');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.po_number || !formData.total_amount) {
      showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const { error } = await supabase.from('purchase_orders').insert({
        client_id: clientId,
        po_number: formData.po_number,
        total_amount: parseFloat(formData.total_amount),
        file_url: formData.file_url || null,
        notes: formData.notes || null,
        created_by: user?.id,
      });

      if (error) throw error;

      showSuccess('تم إضافة أمر الشراء بنجاح');
      setShowAddModal(false);
      setFormData({ po_number: '', total_amount: '', file_url: '', notes: '' });
      loadOrders();
    } catch (error: any) {
      console.error('Error adding purchase order:', error);
      if (error.code === '23505') {
        showError('رقم أمر الشراء موجود مسبقًا');
      } else {
        showError('حدث خطأ أثناء إضافة أمر الشراء');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف أمر الشراء؟')) return;

    try {
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id);

      if (error) throw error;

      showSuccess('تم حذف أمر الشراء بنجاح');
      loadOrders();
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      showError('حدث خطأ أثناء حذف أمر الشراء');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
      active: { label: 'نشط', color: '#ffffff', bgColor: 'var(--color-info)' },
      near_full: { label: 'شارف على الانتهاء', color: '#ffffff', bgColor: 'var(--color-warning)' },
      full: { label: 'ممتلئ', color: '#ffffff', bgColor: 'var(--color-danger)' },
      completed: { label: 'مكتمل', color: '#ffffff', bgColor: 'var(--color-success)' },
      cancelled: { label: 'ملغي', color: 'var(--color-text-muted)', bgColor: 'var(--color-background-hover)' },
    };
    return statusMap[status] || statusMap.active;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'var(--color-danger)';
    if (percentage >= 80) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  if (loading) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          أوامر الشراء
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
          }}
        >
          <Plus size={18} />
          أمر شراء جديد
        </button>
      </div>

      {orders.length === 0 ? (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <p className="text-lg mb-2">لا توجد أوامر شراء</p>
          <p className="text-sm">قم بإضافة أمر شراء جديد للبدء</p>
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <table className="w-full">
            <thead
              style={{
                backgroundColor: 'var(--color-table-header)',
                borderBottom: '1px solid var(--color-table-border)',
              }}
            >
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  رقم PO
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  القيمة الإجمالية
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  المستخدم
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  المتبقي
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  التقدم
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  الحالة
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => {
                const statusBadge = getStatusBadge(order.status);
                const percentage = (order.used_amount / order.total_amount) * 100;
                const progressColor = getProgressColor(percentage);

                return (
                  <tr
                    key={order.id}
                    style={{
                      borderBottom: index < orders.length - 1 ? '1px solid var(--color-table-border)' : 'none',
                    }}
                  >
                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {order.po_number}
                    </td>
                    <td className="px-6 py-4 font-semibold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                      {formatCurrency(order.total_amount, 'SAR')}
                    </td>
                    <td className="px-6 py-4 font-semibold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                      {formatCurrency(order.used_amount, 'SAR')}
                    </td>
                    <td className="px-6 py-4 font-semibold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                      {formatCurrency(order.remaining_amount, 'SAR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 h-2 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--color-background-hover)' }}
                          >
                            <div
                              className="h-full transition-all rounded-full"
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                                backgroundColor: progressColor,
                              }}
                            />
                          </div>
                          {percentage >= 80 && <AlertCircle size={16} style={{ color: progressColor }} />}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {toEnglishNumbers(percentage.toFixed(1))}%
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: statusBadge.bgColor,
                          color: statusBadge.color,
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailsModal(true);
                          }}
                          className="transition-colors"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <Modal isOpen={true} onClose={() => setShowAddModal(false)} title="أمر شراء جديد">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                رقم أمر الشراء *
              </label>
              <input
                type="text"
                value={formData.po_number}
                onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="PO-2024-001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                القيمة الإجمالية (SAR) *
              </label>
              <input
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                رابط الملف
              </label>
              <input
                type="url"
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                ملاحظات
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="ملاحظات إضافية..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: 'var(--color-background-hover)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                }}
              >
                حفظ
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showDetailsModal && selectedOrder && (
        <Modal isOpen={true} onClose={() => setShowDetailsModal(false)} title={`تفاصيل ${selectedOrder.po_number}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  القيمة الإجمالية
                </div>
                <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                  {formatCurrency(selectedOrder.total_amount, 'SAR')}
                </div>
              </div>
              <div>
                <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  المستخدم
                </div>
                <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                  {formatCurrency(selectedOrder.used_amount, 'SAR')}
                </div>
              </div>
              <div>
                <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  المتبقي
                </div>
                <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                  {formatCurrency(selectedOrder.remaining_amount, 'SAR')}
                </div>
              </div>
              <div>
                <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  الحالة
                </div>
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: getStatusBadge(selectedOrder.status).bgColor,
                    color: getStatusBadge(selectedOrder.status).color,
                  }}
                >
                  {getStatusBadge(selectedOrder.status).label}
                </span>
              </div>
            </div>

            {selectedOrder.file_url && (
              <div>
                <div className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  الملف المرفق
                </div>
                <a
                  href={selectedOrder.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: 'var(--color-primary)' }}
                >
                  <FileText size={16} />
                  عرض الملف
                </a>
              </div>
            )}

            {selectedOrder.notes && (
              <div>
                <div className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  الملاحظات
                </div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {selectedOrder.notes}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
