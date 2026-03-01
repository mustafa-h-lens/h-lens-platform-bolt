import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, GripVertical, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';

interface Category {
  id: string;
  name: string;
  name_en: string | null;
}

interface Brand {
  id: string;
  name: string;
  name_en: string | null;
  is_active: boolean;
  display_order: number;
  categories?: string[];
}

export const EquipmentBrandsSettings = () => {
  const { showSuccess, showError } = useNotification();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    categories: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_brands')
        .select('*')
        .order('display_order');

      if (error) throw error;

      // جلب التصنيفات المرتبطة بكل علامة
      const brandsWithCategories = await Promise.all(
        (data || []).map(async (brand) => {
          const { data: brandCats } = await supabase
            .from('brand_categories')
            .select('category_id')
            .eq('brand_id', brand.id);

          // إزالة التصنيفات المكررة
          const uniqueCategories = [...new Set(brandCats?.map(bc => bc.category_id) || [])];

          return {
            ...brand,
            categories: uniqueCategories
          };
        })
      );

      setBrands(brandsWithCategories);
    } catch (error) {
      console.error('Error fetching brands:', error);
      showError('فشل تحميل العلامات التجارية');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      showError('يرجى إدخال اسم العلامة التجارية');
      return;
    }

    if (isSaving) return;

    try {
      setIsSaving(true);
      const maxOrder = brands.length > 0
        ? Math.max(...brands.map(b => b.display_order))
        : 0;

      const { data: newBrand, error } = await supabase
        .from('equipment_brands')
        .insert([{
          name: formData.name,
          name_en: formData.name_en || null,
          display_order: maxOrder + 1,
          is_active: true,
        }])
        .select()
        .single();

      if (error) {
        // التحقق من خطأ التكرار
        if (error.code === '23505') {
          showError(`العلامة التجارية "${formData.name}" موجودة بالفعل في النظام`);
          return;
        }
        throw error;
      }

      // إضافة ربط التصنيفات
      if (newBrand && formData.categories.length > 0) {
        const categoryLinks = formData.categories.map(catId => ({
          brand_id: newBrand.id,
          category_id: catId
        }));

        const { error: linkError } = await supabase
          .from('brand_categories')
          .insert(categoryLinks);

        if (linkError) throw linkError;
      }

      const brandWithCategories = {
        ...newBrand,
        categories: formData.categories
      };
      setBrands(prev => [...prev, brandWithCategories].sort((a, b) => a.display_order - b.display_order));

      showSuccess('تم إضافة العلامة التجارية بنجاح');
      setSuccessAnimation('add');
      setTimeout(() => setSuccessAnimation(null), 600);
      setFormData({ name: '', name_en: '', categories: [] });
    } catch (error) {
      console.error('Error adding brand:', error);
      showError('فشل إضافة العلامة التجارية');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setFormData({
      name: brand.name,
      name_en: brand.name_en || '',
      categories: brand.categories || [],
    });
  };

  const handleUpdate = async () => {
    if (!editingId || isSaving) return;

    try {
      setIsSaving(true);
      const { data: updatedBrand, error } = await supabase
        .from('equipment_brands')
        .update({
          name: formData.name,
          name_en: formData.name_en || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          showError(`العلامة التجارية "${formData.name}" موجودة بالفعل في النظام`);
          return;
        }
        throw error;
      }

      await supabase
        .from('brand_categories')
        .delete()
        .eq('brand_id', editingId);

      if (formData.categories.length > 0) {
        const categoryLinks = formData.categories.map(catId => ({
          brand_id: editingId,
          category_id: catId
        }));

        const { error: linkError } = await supabase
          .from('brand_categories')
          .insert(categoryLinks);

        if (linkError) throw linkError;
      }

      const brandWithCategories = {
        ...updatedBrand,
        categories: formData.categories
      };
      setBrands(prev => prev.map(b => b.id === editingId ? brandWithCategories : b));

      showSuccess('تم تحديث العلامة التجارية بنجاح');
      setSuccessAnimation(editingId);
      setTimeout(() => setSuccessAnimation(null), 600);
      setEditingId(null);
      setFormData({ name: '', name_en: '', categories: [] });
    } catch (error) {
      console.error('Error updating brand:', error);
      showError('فشل تحديث العلامة التجارية');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه العلامة التجارية؟')) return;

    try {
      const { error } = await supabase
        .from('equipment_brands')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBrands(prev => prev.filter(b => b.id !== id));
      showSuccess('تم حذف العلامة التجارية بنجاح');
    } catch (error) {
      console.error('Error deleting brand:', error);
      showError('فشل حذف العلامة التجارية');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { data, error } = await supabase
        .from('equipment_brands')
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setBrands(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
      showSuccess('تم تحديث حالة العلامة التجارية');
    } catch (error) {
      console.error('Error toggling brand:', error);
      showError('فشل تحديث حالة العلامة التجارية');
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
        <h2 className="text-2xl font-bold mb-2">العلامات التجارية للمعدات</h2>
        <p className="text-blue-50">إدارة العلامات التجارية المتاحة في النظام</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {editingId ? 'تعديل العلامة التجارية' : 'إضافة علامة تجارية جديدة'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الاسم بالعربية *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثال: سوني، كانون، نيكون"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الاسم بالإنجليزية (اختياري)
            </label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Example: Sony, Canon, Nikon"
              dir="ltr"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            التصنيفات المرتبطة (اختياري)
          </label>
          <p className="text-xs text-slate-500 mb-3">
            اختر التصنيفات التي تنتمي إليها هذه العلامة. إذا لم تختر أي تصنيف، ستظهر العلامة لجميع التصنيفات.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={formData.categories.includes(category.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        categories: [...formData.categories, category.id]
                      });
                    } else {
                      setFormData({
                        ...formData,
                        categories: formData.categories.filter(id => id !== category.id)
                      });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">{category.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
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
                  setFormData({ name: '', name_en: '', categories: [] });
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
              {isSaving ? 'جاري الإضافة...' : 'إضافة علامة تجارية'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">الترتيب</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">الاسم بالعربية</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">الاسم بالإنجليزية</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">التصنيفات</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">الحالة</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {brands.map((brand) => (
                <tr key={brand.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <GripVertical className="w-4 h-4" />
                      <span className="text-slate-600">{brand.display_order}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{brand.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-700" dir="ltr">{brand.name_en || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    {brand.categories && brand.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {brand.categories.map(catId => {
                          const category = categories.find(c => c.id === catId);
                          return category ? (
                            <span
                              key={catId}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {category.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">جميع التصنيفات</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleActive(brand.id, brand.is_active)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        brand.is_active
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {brand.is_active ? 'نشط' : 'غير نشط'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(brand)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(brand.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {brands.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    لا توجد علامات تجارية في النظام حالياً
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
