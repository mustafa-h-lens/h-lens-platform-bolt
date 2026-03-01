import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotification } from '../../contexts/NotificationContext';
import { Modal } from '../shared/Modal';

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

interface EditProjectModalProps {
  projectId: string;
  currentData: {
    name: string;
    client_id: string;
    project_code: string | null;
    description: string | null;
    project_mode: 'STANDARD' | 'FRAMEWORK';
    status: string;
    start_date: string | null;
    end_date: string | null;
    project_manager_id: string | null;
    internal_notes: string | null;
    total_cost: number;
    total_price: number;
    currency: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const PROJECT_STATUSES = [
  { value: 'request', label: 'طلب' },
  { value: 'quoted', label: 'تم عمل عرض سعر' },
  { value: 'invoiced', label: 'تم إصدار فاتورة' },
  { value: 'po_issued', label: 'تم إصدار أمر شراء' },
  { value: 'partial_paid', label: 'مدفوع جزئياً' },
  { value: 'paid', label: 'مدفوع' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'closed', label: 'مغلق' },
  { value: 'cancelled', label: 'ملغى' },
];

export const EditProjectModal = ({ projectId, currentData, onClose, onSuccess }: EditProjectModalProps) => {
  const { showSuccess, showError } = useNotification();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    name: currentData.name,
    client_id: currentData.client_id,
    project_code: currentData.project_code || '',
    description: currentData.description || '',
    project_mode: currentData.project_mode || 'STANDARD',
    status: currentData.status,
    start_date: currentData.start_date || '',
    end_date: currentData.end_date || '',
    project_manager_id: currentData.project_manager_id || '',
    internal_notes: currentData.internal_notes || '',
    total_cost: currentData.total_cost,
    total_price: currentData.total_price,
    currency: currentData.currency,
  });

  useEffect(() => {
    loadClients();
    loadUsers();
  }, []);

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
    setClients(data || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name')
      .in('role', ['admin', 'super_admin'])
      .eq('is_active', true)
      .order('full_name');
    setUsers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError('الرجاء إدخال اسم المشروع');
      return;
    }

    if (!formData.client_id) {
      showError('الرجاء اختيار العميل');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('projects')
        .update({
          name: formData.name.trim(),
          client_id: formData.client_id,
          project_code: formData.project_code.trim() || null,
          description: formData.description.trim() || null,
          project_mode: formData.project_mode,
          status: formData.status,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          project_manager_id: formData.project_manager_id || null,
          internal_notes: formData.internal_notes.trim() || null,
          total_cost: formData.total_cost,
          total_price: formData.total_price,
          currency: formData.currency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (error) throw error;

      showSuccess('تم تحديث المشروع بنجاح');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating project:', error);

      let errorMessage = 'حدث خطأ أثناء تحديث المشروع';

      if (error.code === '23505') {
        errorMessage = 'اسم المشروع موجود مسبقاً لهذا العميل';
      } else if (error.code === '23503') {
        errorMessage = 'العميل أو مدير المشروع المحدد غير موجود';
      } else if (error.code === '22007') {
        errorMessage = 'تنسيق التاريخ غير صحيح. يرجى التحقق من التواريخ المدخلة';
      } else if (error.message) {
        errorMessage = `خطأ: ${error.message}`;
        if (error.details) {
          errorMessage += ` - ${error.details}`;
        }
        if (error.hint) {
          errorMessage += ` (${error.hint})`;
        }
      }

      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="تعديل المشروع" maxWidth="4xl">
      <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                اسم المشروع <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="اسم المشروع"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                رقم المشروع
              </label>
              <input
                type="text"
                value={formData.project_code}
                onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="PRJ-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                العميل <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">اختر العميل</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                مدير المشروع
              </label>
              <select
                value={formData.project_manager_id}
                onChange={(e) => setFormData({ ...formData, project_manager_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">بدون مدير مشروع</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                نوع المشروع
              </label>
              <select
                value={formData.project_mode}
                onChange={(e) => setFormData({ ...formData, project_mode: e.target.value as 'STANDARD' | 'FRAMEWORK' })}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="STANDARD">مشروع (Standard)</option>
                <option value="FRAMEWORK">عقد إطاري (Framework)</option>
              </select>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {formData.project_mode === 'STANDARD'
                  ? 'مشروع محدد يحتوي على بنود ومهام'
                  : 'عقد تشغيل مستمر بدون بنود'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                حالة المشروع
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {PROJECT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                تاريخ البداية
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                تاريخ النهاية
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                التكاليف
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.total_cost}
                onChange={(e) => setFormData({ ...formData, total_cost: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                إجمالي السعر / الميزانية
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.total_price}
                onChange={(e) => setFormData({ ...formData, total_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                العملة
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                  bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="SAR">ر.س (SAR)</option>
                <option value="USD">$ (USD)</option>
                <option value="EUR">€ (EUR)</option>
                <option value="AED">د.إ (AED)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              الوصف
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="وصف تفصيلي للمشروع..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              ملاحظات داخلية
            </label>
            <textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="ملاحظات داخلية للفريق..."
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9]
                text-white rounded-xl hover:shadow-lg transition-all font-medium
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700
                dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl
                transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              إلغاء
            </button>
        </div>
      </form>
    </Modal>
  );
};
