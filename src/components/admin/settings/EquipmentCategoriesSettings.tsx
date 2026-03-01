import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';

interface EquipmentCategory {
  id: string;
  name: string;
  name_en: string;
  is_active: boolean;
  display_order: number;
}

export const EquipmentCategoriesSettings = () => {
  const { showSuccess, showError } = useNotification();
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    display_order: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_categories')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showError('فشل تحميل التصنيفات');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.name_en.trim()) {
      showError('يرجى إدخال اسم التصنيف بالعربية والإنجليزية');
      return;
    }

    if (isSaving) return;

    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('equipment_categories')
        .insert([{
          name: formData.name,
          name_en: formData.name_en,
          display_order: formData.display_order,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => [...prev, data].sort((a, b) => a.display_order - b.display_order));

      showSuccess('تم إضافة التصنيف بنجاح');
      setSuccessAnimation('add');
      setTimeout(() => setSuccessAnimation(null), 600);
      setFormData({ name: '', name_en: '', display_order: 0 });
    } catch (error) {
      console.error('Error adding category:', error);
      showError('فشل إضافة التصنيف');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (category: EquipmentCategory) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      name_en: category.name_en,
      display_order: category.display_order,
    });
  };

  const handleUpdate = async () => {
    if (!editingId || isSaving) return;

    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('equipment_categories')
        .update({
          name: formData.name,
          name_en: formData.name_en,
          display_order: formData.display_order,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => prev.map(cat => cat.id === editingId ? data : cat).sort((a, b) => a.display_order - b.display_order));

      showSuccess('تم تحديث التصنيف بنجاح');
      setSuccessAnimation(editingId);
      setTimeout(() => setSuccessAnimation(null), 600);
      setEditingId(null);
      setFormData({ name: '', name_en: '', display_order: 0 });
    } catch (error) {
      console.error('Error updating category:', error);
      showError('فشل تحديث التصنيف');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;

    try {
      const { error } = await supabase
        .from('equipment_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(prev => prev.filter(cat => cat.id !== id));
      showSuccess('تم حذف التصنيف بنجاح');
    } catch (error) {
      console.error('Error deleting category:', error);
      showError('فشل حذف التصنيف');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { data, error } = await supabase
        .from('equipment_categories')
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => prev.map(cat => cat.id === id ? data : cat));
      showSuccess('تم تحديث حالة التصنيف');
    } catch (error) {
      console.error('Error toggling category:', error);
      showError('فشل تحديث حالة التصنيف');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">تصنيفات المعدات</h2>
        <p className="text-blue-50">إدارة تصنيفات المعدات المتاحة في النظام</p>
      </div>

      {/* نموذج الإضافة/التعديل */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {editingId ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الاسم بالعربية
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثال: كاميرا"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الاسم بالإنجليزية
            </label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Example: Camera"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ترتيب العرض
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir="ltr"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          {editingId ? (
            <>
              <button
                onClick={handleUpdate}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${successAnimation === editingId ? 'animate-success-flash' : ''}`}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormData({ name: '', name_en: '', display_order: 0 });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
                إلغاء
              </button>
            </>
          ) : (
            <button
              onClick={handleAdd}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${successAnimation === 'add' ? 'animate-success-flash' : ''}`}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isSaving ? 'جاري الإضافة...' : 'إضافة تصنيف'}
            </button>
          )}
        </div>
      </div>

      {/* قائمة التصنيفات */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">الاسم بالعربية</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">الاسم بالإنجليزية</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">ترتيب العرض</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">الحالة</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-900">{category.name}</td>
                  <td className="px-6 py-4 text-slate-700" dir="ltr">{category.name_en}</td>
                  <td className="px-6 py-4 text-center text-slate-700" dir="ltr">{category.display_order}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleActive(category.id, category.is_active)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        category.is_active
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {category.is_active ? 'نشط' : 'غير نشط'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    لا توجد تصنيفات حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
