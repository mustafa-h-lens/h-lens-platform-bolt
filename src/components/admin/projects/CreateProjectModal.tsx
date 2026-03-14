import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { Modal } from '../../shared/Modal';

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateProjectModal = ({ onClose, onSuccess }: CreateProjectModalProps) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    description: '',
    project_mode: 'STANDARD',
    status: 'pending',
    start_date: '',
    end_date: '',
    project_manager_id: '',
    total_cost: '',
    total_price: '',
    currency: 'SAR',
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

    if (!formData.client_id || !formData.name) {
      showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('projects').insert({
        client_id: formData.client_id,
        name: formData.name,
        description: formData.description || null,
        project_mode: formData.project_mode,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        project_manager_id: formData.project_manager_id || null,
        total_cost: parseFloat(formData.total_cost) || 0,
        total_price: parseFloat(formData.total_price) || 0,
        currency: formData.currency,
        created_by: user!.id,
      });

      if (error) throw error;

      showSuccess('تم إنشاء المشروع بنجاح');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating project:', error);

      let errorMessage = 'حدث خطأ أثناء إنشاء المشروع';

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
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="مشروع جديد" maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">العميل</label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">اختر العميل</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">اسم المشروع</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">نوع المشروع</label>
            <select
              value={formData.project_mode}
              onChange={(e) => setFormData({ ...formData, project_mode: e.target.value as 'STANDARD' | 'FRAMEWORK' })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="STANDARD">مشروع (Standard Project)</option>
              <option value="FRAMEWORK">عقد إطاري (Framework Contract)</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {formData.project_mode === 'STANDARD'
                ? 'مشروع محدد بنطاق واضح يحتوي على بنود ومهام'
                : 'عقد تشغيل مستمر يعتمد على أوامر شراء بدون بنود'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">مدير المشروع</label>
            <select
              value={formData.project_manager_id}
              onChange={(e) => setFormData({ ...formData, project_manager_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">لا يوجد مدير</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.full_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">تاريخ البدء</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">تاريخ الانتهاء</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">التكلفة</label>
              <input
                type="number"
                step="0.01"
                value={formData.total_cost}
                onChange={(e) => setFormData({ ...formData, total_cost: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">السعر</label>
              <input
                type="number"
                step="0.01"
                value={formData.total_price}
                onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء المشروع'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 border border-slate-300 text-slate-700 hover:bg-slate-50 py-2 rounded-lg transition-colors"
            >
              إلغاء
            </button>
        </div>
      </form>
    </Modal>
  );
};
