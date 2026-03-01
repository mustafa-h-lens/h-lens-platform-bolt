import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  project_manager_id: string | null;
  internal_notes: string | null;
}

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

interface ImprovedProjectBasicInfoProps {
  project: Project;
  client: Client;
  onUpdate: () => void;
}

const PROJECT_STATUSES = [
  { value: 'request', label: 'طلب' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'pending_payment', label: 'بانتظار الدفع' },
  { value: 'paid', label: 'مدفوع' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'closed', label: 'مغلق' },
  { value: 'cancelled', label: 'ملغي' },
];

export const ImprovedProjectBasicInfo = ({ project, client, onUpdate }: ImprovedProjectBasicInfoProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || '',
    status: project.status,
    start_date: project.start_date || '',
    end_date: project.end_date || '',
    project_manager_id: project.project_manager_id || '',
    internal_notes: project.internal_notes || '',
  });
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name')
      .order('full_name');
    setUsers(data || []);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('projects')
        .update({
          ...formData,
          project_manager_id: formData.project_manager_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (error) throw error;

      showSuccess('تم تحديث البيانات بنجاح');
      onUpdate();
    } catch (error) {
      console.error('Error updating project:', error);
      showError('حدث خطأ أثناء التحديث');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          البيانات الأساسية
        </h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
          }}
        >
          <Save size={18} />
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      <div
        className="p-6 rounded-lg border space-y-6"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              اسم المشروع *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              العميل
            </label>
            <input
              type="text"
              value={client.name}
              disabled
              className="w-full px-4 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-background-hover)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              مدير المشروع
            </label>
            <select
              value={formData.project_manager_id}
              onChange={(e) => setFormData({ ...formData, project_manager_id: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option value="">غير محدد</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              الحالة *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              تاريخ البداية
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              تاريخ الانتهاء المتوقع
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            الوصف
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            placeholder="أضف وصفًا للمشروع..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            ملاحظات داخلية
          </label>
          <textarea
            value={formData.internal_notes}
            onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            placeholder="ملاحظات خاصة بالفريق..."
          />
        </div>
      </div>
    </div>
  );
};
