import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface SupplierField {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export const SupplierFieldsSettings = () => {
  const [fields, setFields] = useState<SupplierField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('supplier_fields')
        .select('*')
        .order('name');

      if (error) throw error;
      setFields(data || []);
    } catch (error) {
      console.error('Error loading supplier fields:', error);
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
          .from('supplier_fields')
          .update({
            name: formData.name,
            description: formData.description || null,
            is_active: formData.is_active,
          })
          .eq('id', editingId)
          .select()
          .single();

        if (error) throw error;

        setFields(prev => prev.map(f => f.id === editingId ? data : f).sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const { data, error } = await supabase
          .from('supplier_fields')
          .insert({
            name: formData.name,
            description: formData.description || null,
            is_active: formData.is_active,
          })
          .select()
          .single();

        if (error) throw error;

        setFields(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      }

      setFormData({ name: '', description: '', is_active: true });
      setEditingId(null);
    } catch (error) {
      console.error('Error saving field:', error);
      alert('حدث خطأ أثناء حفظ المجال');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (field: SupplierField) => {
    setEditingId(field.id);
    setFormData({
      name: field.name,
      description: field.description || '',
      is_active: field.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المجال؟')) return;

    try {
      const { error } = await supabase
        .from('supplier_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFields(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Error deleting field:', error);
      alert('حدث خطأ أثناء حذف المجال');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('supplier_fields')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadFields();
    } catch (error) {
      console.error('Error toggling field status:', error);
      alert('حدث خطأ أثناء تغيير حالة المجال');
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
          مجالات الموردين
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          قم بإدارة مجالات الموردين التي يمكن استخدامها عند إضافة مورد جديد أو فاتورة مصاريف
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              اسم المجال <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثل: تصميم، برمجة، تسويق"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              الوصف
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="وصف مختصر للمجال"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              المجال نشط
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9] text-white
              rounded-lg hover:shadow-lg transition-all font-medium flex items-center gap-2"
          >
            {editingId ? (
              <>
                <Check className="w-4 h-4" />
                تحديث
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                إضافة مجال
              </>
            )}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormData({ name: '', description: '', is_active: true });
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
        {fields.map((field) => (
          <div
            key={field.id}
            className={`bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between
              border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow
              ${!field.is_active ? 'opacity-60' : ''}`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {field.name}
                </p>
                {!field.is_active && (
                  <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600
                    dark:text-slate-400 text-xs font-medium rounded-full">
                    غير نشط
                  </span>
                )}
              </div>
              {field.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {field.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleActive(field.id, field.is_active)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${field.is_active
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                  }`}
              >
                {field.is_active ? 'نشط' : 'غير نشط'}
              </button>
              <button
                onClick={() => handleEdit(field)}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50
                  dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(field.id)}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50
                  dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {fields.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            لا توجد مجالات بعد. قم بإضافة مجال جديد.
          </div>
        )}
      </div>
    </div>
  );
};
