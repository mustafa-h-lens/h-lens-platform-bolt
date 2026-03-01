import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Save, X, Upload, Image as ImageIcon, Search, Filter, Package } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';

interface EquipmentCategory {
  id: string;
  name: string;
  name_en: string;
}

interface EquipmentBrand {
  id: string;
  name: string;
  name_en: string;
}

interface CatalogItem {
  id: string;
  brand_id: string | null;
  name: string;
  name_en: string | null;
  category_id: string | null;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
  equipment_categories?: EquipmentCategory;
  equipment_brands?: EquipmentBrand;
}

interface BrandStats {
  id: string;
  name: string;
  name_en: string;
  count: number;
}

export const EquipmentCatalogSettings = () => {
  const { showSuccess, showError } = useNotification();
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [brands, setBrands] = useState<EquipmentBrand[]>([]);
  const [brandStats, setBrandStats] = useState<BrandStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    brand_id: '',
    name: '',
    name_en: '',
    category_id: '',
    image_url: '',
    description: '',
  });

  const [filters, setFilters] = useState({
    selectedBrand: '',
    selectedCategory: '',
    searchTerm: '',
    showActive: 'all' as 'all' | 'active' | 'inactive',
  });

  useEffect(() => {
    fetchCategories();
    fetchBrands();
    fetchCatalogItems();
  }, []);

  useEffect(() => {
    if (formData.category_id) {
      fetchBrands(formData.category_id);
    } else {
      fetchBrands();
    }
  }, [formData.category_id]);

  useEffect(() => {
    applyFilters();
  }, [catalogItems, filters]);

  useEffect(() => {
    fetchBrandStats();
  }, [catalogItems]);

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

  const fetchBrands = async (categoryId?: string) => {
    try {
      if (categoryId) {
        // جلب العلامات المرتبطة بهذا التصنيف
        const { data: brandCategories, error: bcError } = await supabase
          .from('brand_categories')
          .select('brand_id')
          .eq('category_id', categoryId);

        if (bcError) throw bcError;

        const brandIds = brandCategories?.map(bc => bc.brand_id) || [];

        if (brandIds.length > 0) {
          const { data, error } = await supabase
            .from('equipment_brands')
            .select('*')
            .eq('is_active', true)
            .in('id', brandIds)
            .order('display_order');

          if (error) throw error;
          setBrands(data || []);
        } else {
          // لا توجد علامات مرتبطة، جلب جميع العلامات
          const { data, error } = await supabase
            .from('equipment_brands')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

          if (error) throw error;
          setBrands(data || []);
        }
      } else {
        // جلب جميع العلامات
        const { data, error } = await supabase
          .from('equipment_brands')
          .select('*')
          .eq('is_active', true)
          .order('display_order');

        if (error) throw error;
        setBrands(data || []);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const fetchCatalogItems = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_catalog')
        .select('*, equipment_categories(id, name, name_en), equipment_brands(id, name, name_en)')
        .order('name');

      if (error) throw error;
      setCatalogItems(data || []);
    } catch (error) {
      console.error('Error fetching catalog items:', error);
      showError('فشل تحميل كتالوج المعدات');
    } finally {
      setLoading(false);
    }
  };

  const fetchBrandStats = () => {
    const stats: { [key: string]: BrandStats } = {};

    catalogItems.forEach(item => {
      if (item.brand_id && item.equipment_brands) {
        if (!stats[item.brand_id]) {
          stats[item.brand_id] = {
            id: item.brand_id,
            name: item.equipment_brands.name,
            name_en: item.equipment_brands.name_en,
            count: 0,
          };
        }
        stats[item.brand_id].count++;
      }
    });

    const sortedStats = Object.values(stats).sort((a, b) => b.count - a.count);
    setBrandStats(sortedStats);
  };

  const applyFilters = () => {
    let filtered = [...catalogItems];

    if (filters.selectedBrand) {
      filtered = filtered.filter(item => item.brand_id === filters.selectedBrand);
    }

    if (filters.selectedCategory) {
      filtered = filtered.filter(item => item.category_id === filters.selectedCategory);
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.name_en?.toLowerCase().includes(searchLower) ||
        item.equipment_brands?.name.toLowerCase().includes(searchLower) ||
        item.equipment_brands?.name_en?.toLowerCase().includes(searchLower) ||
        item.equipment_categories?.name.toLowerCase().includes(searchLower)
      );
    }

    if (filters.showActive === 'active') {
      filtered = filtered.filter(item => item.is_active);
    } else if (filters.showActive === 'inactive') {
      filtered = filtered.filter(item => !item.is_active);
    }

    setFilteredItems(filtered);
  };

  const handleBrandFilterClick = (brandId: string) => {
    setFilters(prev => ({
      ...prev,
      selectedBrand: prev.selectedBrand === brandId ? '' : brandId,
    }));
  };

  const clearFilters = () => {
    setFilters({
      selectedBrand: '',
      selectedCategory: '',
      searchTerm: '',
      showActive: 'all',
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError('حجم الصورة يجب أن يكون أقل من 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `equipment/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      showSuccess('تم رفع الصورة بنجاح');
    } catch (error) {
      console.error('Error uploading image:', error);
      showError('فشل رفع الصورة');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      showError('يرجى إدخال اسم المعدة');
      return;
    }

    try {
      const { error } = await supabase
        .from('equipment_catalog')
        .insert([{
          brand_id: formData.brand_id || null,
          name: formData.name,
          name_en: formData.name_en || null,
          category_id: formData.category_id || null,
          image_url: formData.image_url || null,
          description: formData.description || null,
          is_active: true,
        }]);

      if (error) throw error;

      showSuccess('تم إضافة المعدة بنجاح');
      setFormData({ brand_id: '', name: '', name_en: '', category_id: '', image_url: '', description: '' });
      fetchCatalogItems();
    } catch (error) {
      console.error('Error adding catalog item:', error);
      showError('فشل إضافة المعدة');
    }
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setFormData({
      brand_id: item.brand_id || '',
      name: item.name,
      name_en: item.name_en || '',
      category_id: item.category_id || '',
      image_url: item.image_url || '',
      description: item.description || '',
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('equipment_catalog')
        .update({
          brand_id: formData.brand_id || null,
          name: formData.name,
          name_en: formData.name_en || null,
          category_id: formData.category_id || null,
          image_url: formData.image_url || null,
          description: formData.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);

      if (error) throw error;

      showSuccess('تم تحديث المعدة بنجاح');
      setEditingId(null);
      setFormData({ brand_id: '', name: '', name_en: '', category_id: '', image_url: '', description: '' });
      fetchCatalogItems();
    } catch (error) {
      console.error('Error updating catalog item:', error);
      showError('فشل تحديث المعدة');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المعدة؟')) return;

    try {
      const { error } = await supabase
        .from('equipment_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showSuccess('تم حذف المعدة بنجاح');
      fetchCatalogItems();
    } catch (error) {
      console.error('Error deleting catalog item:', error);
      showError('فشل حذف المعدة');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('equipment_catalog')
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      showSuccess('تم تحديث حالة المعدة');
      fetchCatalogItems();
    } catch (error) {
      console.error('Error toggling item:', error);
      showError('فشل تحديث حالة المعدة');
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
        <h2 className="text-2xl font-bold mb-2">كتالوج المعدات</h2>
        <p className="text-blue-50">إدارة المعدات المتاحة في النظام ({catalogItems.length} معدة)</p>
      </div>

      {/* إحصائيات العلامات التجارية */}
      {brandStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">العلامات التجارية</h3>
            <span className="text-sm text-slate-500">({brandStats.length} علامة)</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {brandStats.map((brand) => (
              <button
                key={brand.id}
                onClick={() => handleBrandFilterClick(brand.id)}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                  filters.selectedBrand === brand.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-slate-900 mb-1">{brand.name}</div>
                  {brand.name_en && (
                    <div className="text-xs text-slate-500 mb-2" dir="ltr">{brand.name_en}</div>
                  )}
                  <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium ${
                    filters.selectedBrand === brand.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {brand.count} معدة
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* شريط الفلترة */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">فلترة النتائج</h3>
          {(filters.selectedBrand || filters.selectedCategory || filters.searchTerm || filters.showActive !== 'all') && (
            <button
              onClick={clearFilters}
              className="mr-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              إلغاء جميع الفلاتر
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Search className="w-4 h-4 inline-block ml-1" />
              بحث
            </label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              placeholder="ابحث عن معدة..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              التصنيف
            </label>
            <select
              value={filters.selectedCategory}
              onChange={(e) => setFilters({ ...filters, selectedCategory: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir="rtl"
            >
              <option value="">جميع التصنيفات</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              العلامة التجارية
            </label>
            <select
              value={filters.selectedBrand}
              onChange={(e) => setFilters({ ...filters, selectedBrand: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir="rtl"
            >
              <option value="">جميع العلامات</option>
              {brandStats.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name} ({brand.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الحالة
            </label>
            <select
              value={filters.showActive}
              onChange={(e) => setFilters({ ...filters, showActive: e.target.value as 'all' | 'active' | 'inactive' })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir="rtl"
            >
              <option value="all">الكل</option>
              <option value="active">النشط فقط</option>
              <option value="inactive">غير النشط فقط</option>
            </select>
          </div>
        </div>

        {filteredItems.length !== catalogItems.length && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              عرض {filteredItems.length} من أصل {catalogItems.length} معدة
            </p>
          </div>
        )}
      </div>

      {/* نموذج الإضافة/التعديل */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {editingId ? 'تعديل المعدة' : 'إضافة معدة جديدة'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              العلامة التجارية
            </label>
            <select
              value={formData.brand_id}
              onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir="rtl"
            >
              <option value="">اختر العلامة التجارية</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              التصنيف
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir="rtl"
            >
              <option value="">اختر التصنيف</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              اسم الموديل بالعربية *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثال: A7 III"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              اسم الموديل بالإنجليزية (اختياري)
            </label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Example: A7 III"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              صورة المعدة
            </label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploadingImage ? 'جاري الرفع...' : 'رفع صورة'}
              </button>
              {formData.image_url && (
                <img
                  src={formData.image_url}
                  alt="Preview"
                  className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                />
              )}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            وصف مختصر (اختياري)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="وصف المعدة وميزاتها..."
          />
        </div>

        <div className="flex gap-3">
          {editingId ? (
            <>
              <button
                onClick={handleUpdate}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                <Save className="w-4 h-4" />
                حفظ التغييرات
              </button>
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormData({ brand_id: '', name: '', name_en: '', category_id: '', image_url: '', description: '' });
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
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              إضافة معدة
            </button>
          )}
        </div>
      </div>

      {/* قائمة المعدات */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">الصورة</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">العلامة التجارية</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">الموديل</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">التصنيف</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">الوصف</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">الحالة</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.equipment_brands ? (
                      <>
                        <div className="font-medium text-slate-900">{item.equipment_brands.name}</div>
                        {item.equipment_brands.name_en && (
                          <div className="text-sm text-slate-500" dir="ltr">{item.equipment_brands.name_en}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{item.name}</div>
                    {item.name_en && (
                      <div className="text-sm text-slate-500" dir="ltr">{item.name_en}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {item.equipment_categories?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">
                    {item.description ? (
                      <div className="max-w-xs truncate">{item.description}</div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleActive(item.id, item.is_active)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        item.is_active
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {item.is_active ? 'نشط' : 'غير نشط'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    {catalogItems.length === 0 ? 'لا توجد معدات في الكتالوج حالياً' : 'لا توجد نتائج مطابقة للفلاتر المحددة'}
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
