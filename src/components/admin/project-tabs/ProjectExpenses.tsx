import { useState, useEffect } from 'react';
import { Plus, Download, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { formatCurrency, formatDateArabic } from '../../../lib/formatters';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import { Modal } from '../../shared/Modal';
import { ConfirmationModal } from '../../shared/ConfirmationModal';
import { useNotification } from '../../../contexts/NotificationContext';

interface Expense {
  id: string;
  vendor_id: string;
  vendor_name: string;
  field: string;
  amount: number;
  amount_paid: number;
  amount_remaining: number;
  due_date: string | null;
  status: string;
  created_at: string;
}

interface Vendor {
  id: string;
  full_name: string;
  primary_field: string | null;
}

interface ProjectExpensesProps {
  projectId: string;
}

export const ProjectExpenses = ({ projectId }: ProjectExpensesProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    vendor_id: '',
    field: '',
    amount: '',
    tax_included: false,
    due_date: '',
  });
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    loadExpenses();
    loadVendors();
  }, [projectId]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendor_invoices')
        .select(`
          id,
          vendor_id,
          amount_total,
          amount_paid,
          amount_remaining,
          status,
          due_date,
          created_at,
          vendors (
            full_name,
            primary_field
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        vendor_id: item.vendor_id,
        vendor_name: item.vendors?.full_name || '',
        field: item.vendors?.primary_field || '',
        amount: item.amount_total,
        amount_paid: item.amount_paid,
        amount_remaining: item.amount_remaining,
        due_date: item.due_date,
        status: item.status,
        created_at: item.created_at,
      }));
      setExpenses(mapped);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, full_name, primary_field')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vendor_id || !formData.amount) {
      showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const amount = parseFloat(toEnglishNumbers(formData.amount));
      const { error } = await supabase
        .from('vendor_invoices')
        .insert({
          vendor_id: formData.vendor_id,
          project_id: projectId,
          amount_total: amount,
          amount_remaining: amount,
          due_date: formData.due_date || null,
          status: 'pending',
        });

      if (error) throw error;
      showSuccess('تم تعيين المورد بنجاح');
      setShowAddModal(false);
      setFormData({ vendor_id: '', field: '', amount: '', tax_included: false, due_date: '' });
      loadExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      showError('حدث خطأ أثناء تعيين المورد');
    }
  };

  const handleDelete = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_invoices')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      showSuccess('تم حذف المورد بنجاح');
      loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      showError('حدث خطأ أثناء الحذف');
    } finally {
      setDeleteExpenseId(null);
    }
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
          المصروفات والموردين
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
          تعيين مورد
        </button>
      </div>

      {expenses.length === 0 ? (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <p className="text-lg mb-2">لا توجد مصروفات</p>
          <p className="text-sm">قم بتعيين موردين للمشروع</p>
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
                  اسم المورد
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  المجال
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  المبلغ
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  المدفوع
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  المتبقي
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  الحالة
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  تاريخ الاستحقاق
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense, index) => (
                <tr
                  key={expense.id}
                  style={{
                    borderBottom: index < expenses.length - 1 ? '1px solid var(--color-table-border)' : 'none',
                  }}
                >
                  <td className="px-6 py-4" style={{ color: 'var(--color-text-primary)' }}>
                    {expense.vendor_name}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-text-secondary)' }}>
                    {expense.field}
                  </td>
                  <td className="px-6 py-4 font-semibold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                    {formatCurrency(expense.amount, 'SAR')}
                  </td>
                  <td className="px-6 py-4 font-semibold" style={{ color: 'var(--color-text-primary)' }} dir="ltr">
                    {formatCurrency(expense.amount_paid, 'SAR')}
                  </td>
                  <td className="px-6 py-4 font-semibold" style={{ color: expense.amount_remaining > 0 ? 'var(--color-danger)' : 'var(--color-success)' }} dir="ltr">
                    {formatCurrency(expense.amount_remaining, 'SAR')}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: expense.status === 'paid' ? 'var(--color-success)' : expense.status === 'overdue' ? 'var(--color-danger)' : 'var(--color-warning)',
                        color: '#ffffff',
                      }}
                    >
                      {expense.status === 'paid' ? 'مدفوع' : expense.status === 'partial' ? 'جزئي' : expense.status === 'overdue' ? 'متأخر' : 'معلق'}
                    </span>
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                    {expense.due_date ? formatDateArabic(expense.due_date) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      className="text-red-500 hover:text-red-700 transition-colors"
                      onClick={() => setDeleteExpenseId(expense.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteExpenseId}
        title="حذف المورد"
        message="هل أنت متأكد من حذف هذا المورد من المشروع؟ هذا الإجراء لا يمكن التراجع عنه."
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
        onConfirm={() => deleteExpenseId && handleDelete(deleteExpenseId)}
        onCancel={() => setDeleteExpenseId(null)}
      />

      {showAddModal && (
        <Modal isOpen={true} onClose={() => setShowAddModal(false)} title="تعيين مورد للمشروع">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                اختر المورد *
              </label>
              <select
                value={formData.vendor_id}
                onChange={(e) => {
                  const vendor = vendors.find(v => v.id === e.target.value);
                  setFormData({
                    ...formData,
                    vendor_id: e.target.value,
                    field: vendor?.primary_field || '',
                  });
                }}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                required
              >
                <option value="">اختر المورد</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                المجال
              </label>
              <input
                type="text"
                value={formData.field}
                onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="مثال: تصوير، إضاءة..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                المبلغ *
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                تاريخ الاستحقاق
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
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
    </div>
  );
};
