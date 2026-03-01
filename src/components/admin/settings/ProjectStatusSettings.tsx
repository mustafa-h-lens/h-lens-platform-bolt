import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';

interface ProjectStatus {
  id: string;
  name: string;
  value: string;
  color: string;
  is_default: boolean;
  sort_order: number;
}

export const ProjectStatusSettings = () => {
  const { showSuccess, showError } = useNotification();
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    color: '#1B4FA9',
    is_default: false,
  });

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_statuses')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setStatuses(data || []);
    } catch (error) {
      console.error('Error loading project statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saving) return;

    try {
      setSaving(true);
      if (editingId) {
        const { data, error } = await supabase
          .from('project_statuses')
          .update(formData)
          .eq('id', editingId)
          .select()
          .single();

        if (error) throw error;

        setStatuses(prev => prev.map(s => s.id === editingId ? data : s));
      } else {
        const maxSortOrder = Math.max(...statuses.map(s => s.sort_order), 0);
        const { data, error } = await supabase
          .from('project_statuses')
          .insert({
            ...formData,
            sort_order: maxSortOrder + 1,
          })
          .select()
          .single();

        if (error) throw error;

        setStatuses(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      }

      showSuccess(editingId ? 'تم تحديث الحالة بنجاح' : 'تم إضافة الحالة بنجاح');
      setSuccessAnimation(editingId || 'add');
      setTimeout(() => setSuccessAnimation(null), 600);
      setFormData({ name: '', value: '', color: '#1B4FA9', is_default: false });
      setEditingId(null);
    } catch (error) {
      console.error('Error saving status:', error);
      showError('حدث خطأ أثناء حفظ الحالة');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (status: ProjectStatus) => {
    setEditingId(status.id);
    setFormData({
      name: status.name,
      value: status.value,
      color: status.color,
      is_default: status.is_default,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحالة؟')) return;

    try {
      const { error } = await supabase
        .from('project_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStatuses(prev => prev.filter(s => s.id !== id));
      showSuccess('تم حذف الحالة بنجاح');
    } catch (error) {
      console.error('Error deleting status:', error);
      showError('حدث خطأ أثناء حذف الحالة');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await supabase
        .from('project_statuses')
        .update({ is_default: false })
        .neq('id', id);

      const { data, error } = await supabase
        .from('project_statuses')
        .update({ is_default: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setStatuses(prev => prev.map(s => ({ ...s, is_default: s.id === id })));
      showSuccess('تم تعيين الحالة الافتراضية بنجاح');
    } catch (error) {
      console.error('Error setting default status:', error);
      showError('حدث خطأ أثناء تعيين الحالة الافتراضية');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2A66]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          حالات المشاريع
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          قم بإدارة حالات المشاريع وتحديد الحالة الافتراضية عند إنشاء مشروع جديد
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              اسم الحالة
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثل: قيد التنفيذ"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              القيمة (بالإنجليزية)
            </label>
            <input
              type="text"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="in_progress"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              اللون
            </label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-[42px] border border-slate-300 dark:border-slate-600 rounded-lg
                bg-white dark:bg-slate-900 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-2.5 bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9] text-white
              rounded-lg hover:shadow-lg transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${successAnimation ? 'animate-success-flash' : ''}`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {editingId ? 'جاري التحديث...' : 'جاري الإضافة...'}
              </>
            ) : editingId ? (
              <>
                <Check className="w-4 h-4" />
                تحديث
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                إضافة حالة
              </>
            )}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormData({ name: '', value: '', color: '#1B4FA9', is_default: false });
              }}
              className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700
                dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg
                transition-colors font-medium flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              إلغاء
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {statuses.map((status) => (
          <div
            key={status.id}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between
              border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {status.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {status.value}
                </p>
              </div>
              {status.is_default && (
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700
                  dark:text-green-300 text-xs font-medium rounded-full">
                  افتراضي
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!status.is_default && (
                <button
                  onClick={() => handleSetDefault(status.id)}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100
                    dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="جعلها الحالة الافتراضية"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleEdit(status)}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50
                  dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(status.id)}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50
                  dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {statuses.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            لا توجد حالات بعد. قم بإضافة حالة جديدة.
          </div>
        )}
      </div>
    </div>
  );
};
