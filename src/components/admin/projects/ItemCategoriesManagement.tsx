import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, X } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';

interface ItemCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export const ItemCategoriesManagement = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('item_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category?: ItemCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      is_active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError('الرجاء إدخال اسم التصنيف');
      return;
    }

    try {
      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
        created_by: user?.id,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('item_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('item_categories')
          .insert(categoryData);

        if (error) throw error;
      }

      loadCategories();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving category:', error);
      if (error.code === '23505') {
        showError('هذا التصنيف موجود بالفعل');
      } else {
        showError('حدث خطأ أثناء حفظ التصنيف');
      }
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟\nملاحظة: لن يتم حذف البنود المرتبطة بهذا التصنيف')) return;

    try {
      const { error } = await supabase
        .from('item_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      showError('حدث خطأ أثناء حذف التصنيف');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <div className="p-3 rounded-xl border"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}>
              <Tag className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
            </div>
            تصنيفات البنود
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            إدارة تصنيفات البنود المستخدمة في المشاريع
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg transition-all font-medium"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Plus className="w-4 h-4" />
          <span>إضافة تصنيف</span>
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200
          dark:border-dark-border p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700
            flex items-center justify-center">
            <Tag className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">لا توجد تصنيفات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200
                dark:border-dark-border p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}>
                    <Tag className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {category.name}
                    </h3>
                    {!category.is_active && (
                      <span className="text-xs text-slate-500">معطل</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(category)}
                    className="p-2 text-[#0A2A66] hover:bg-[#0A2A66]/10 rounded-lg transition-colors"
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
              </div>

              {category.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {category.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  اسم التصنيف <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                    bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="مثال: تطوير"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  الوصف
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg
                    bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="وصف التصنيف..."
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  تصنيف نشط
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 text-white rounded-lg transition-all font-medium"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {editingCategory ? 'حفظ التعديلات' : 'إضافة التصنيف'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700
                    dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl
                    transition-colors font-medium"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
