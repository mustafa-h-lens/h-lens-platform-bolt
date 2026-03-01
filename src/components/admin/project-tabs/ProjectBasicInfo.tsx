import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
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

interface ProjectBasicInfoProps {
  project: Project;
  client: Client;
  onUpdate: () => void;
}

export const ProjectBasicInfo = ({ project, client, onUpdate, startInEditMode }: ProjectBasicInfoProps) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [isEditing, setIsEditing] = useState(startInEditMode && isAdmin);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [projectManager, setProjectManager] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    name: project.name,
    project_code: project.project_code || '',
    description: project.description || '',
    status: project.status,
    start_date: project.start_date || '',
    end_date: project.end_date || '',
    project_manager_id: project.project_manager_id || '',
    internal_notes: project.internal_notes || '',
  });

  useEffect(() => {
    setFormData({
      name: project.name,
      project_code: project.project_code || '',
      description: project.description || '',
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      project_manager_id: project.project_manager_id || '',
      internal_notes: project.internal_notes || '',
    });
  }, [project]);

  useEffect(() => {
    loadUsers();
    if (project.project_manager_id) {
      loadProjectManager();
    }
  }, [project.project_manager_id]);

  const loadUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name')
      .in('role', ['admin', 'super_admin'])
      .eq('is_active', true)
      .order('full_name');
    setUsers(data || []);
  };

  const loadProjectManager = async () => {
    if (!project.project_manager_id) return;
    const { data } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', project.project_manager_id)
      .maybeSingle();
    setProjectManager(data);
  };

  const handleSave = async () => {
    if (!isAdmin) return;

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

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating project:', error);
      alert('حدث خطأ أثناء التحديث');
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">البيانات الأساسية</h2>
        {isAdmin && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-lg
                    transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: project.name,
                      project_code: project.project_code || '',
                      description: project.description || '',
                      status: project.status,
                      start_date: project.start_date || '',
                      end_date: project.end_date || '',
                      project_manager_id: project.project_manager_id || '',
                      internal_notes: project.internal_notes || '',
                    });
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-dark-border text-slate-700
                    dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg
                    transition-colors text-sm font-medium"
                >
                  إلغاء
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                  transition-colors text-sm font-medium"
              >
                تعديل
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            اسم المشروع
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          ) : (
            <p className="text-slate-800 dark:text-slate-100">{project.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            كود المشروع
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.project_code}
              onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          ) : (
            <p className="text-slate-800 dark:text-slate-100">{project.project_code || '-'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            العميل
          </label>
          <p className="text-slate-800 dark:text-slate-100">{client.name}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            الحالة
          </label>
          {isEditing ? (
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="request">طلب</option>
              <option value="quoted">عرض سعر</option>
              <option value="invoiced">فاتورة</option>
              <option value="po_issued">أمر شراء</option>
              <option value="partial_paid">مدفوع جزئي</option>
              <option value="paid">مدفوع</option>
              <option value="pending">معلق</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="completed">مكتمل</option>
              <option value="closed">مغلق</option>
              <option value="cancelled">ملغي</option>
            </select>
          ) : (
            <p className="text-slate-800 dark:text-slate-100">{formData.status}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            تاريخ البداية
          </label>
          {isEditing ? (
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          ) : (
            <p className="text-slate-800 dark:text-slate-100" style={{ direction: 'ltr', textAlign: 'right' }}>
              {project.start_date ? formatDateArabic(project.start_date) : '-'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            تاريخ النهاية
          </label>
          {isEditing ? (
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          ) : (
            <p className="text-slate-800 dark:text-slate-100" style={{ direction: 'ltr', textAlign: 'right' }}>
              {project.end_date ? formatDateArabic(project.end_date) : '-'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <Users className="w-4 h-4 inline mr-1" />
            مدير المشروع
          </label>
          {isEditing ? (
            <select
              value={formData.project_manager_id}
              onChange={(e) => setFormData({ ...formData, project_manager_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">لا يوجد مدير</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          ) : (
            <p className="text-slate-800 dark:text-slate-100">
              {projectManager?.full_name || '—'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <DollarSign className="w-4 h-4 inline mr-1" />
            إجمالي السعر
          </label>
          <p className="text-slate-800 dark:text-slate-100 font-medium" style={{ direction: 'ltr', textAlign: 'right' }}>
            {formatCurrency(project.total_price, project.currency)}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <DollarSign className="w-4 h-4 inline mr-1" />
            التكلفة
          </label>
          <p className="text-slate-800 dark:text-slate-100 font-medium" style={{ direction: 'ltr', textAlign: 'right' }}>
            {formatCurrency(project.total_cost, project.currency)}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          <FileText className="w-4 h-4 inline mr-1" />
          الوصف
        </label>
        {isEditing ? (
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          />
        ) : (
          <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
            {project.description || '-'}
          </p>
        )}
      </div>

      {isAdmin && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            ملاحظات داخلية
          </label>
          {isEditing ? (
            <textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="ملاحظات داخلية للفريق..."
            />
          ) : (
            <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
              {project.internal_notes || '-'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
