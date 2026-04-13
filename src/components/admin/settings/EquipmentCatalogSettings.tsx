import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Save, X, Upload, Image as ImageIcon, Search, Filter, Package } from 'lucide-react';
import { Modal } from '../../shared/Modal';
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
  const [showModal, setShowModal] = useState(false);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
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
    fetchUsageCounts();
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

  const fetchUsageCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_equipment')
        .select('catalog_item_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach(row => {
        if (row.catalog_item_id) {
          counts[row.catalog_item_id] = (counts[row.catalog_item_id] || 0) + 1;
        }
      });
      setUsageCounts(counts);
    } catch (error) {
      console.error('Error fetching usage counts:', error);
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
    openEditModal(item);
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

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ brand_id: '', name: '', name_en: '', category_id: '', image_url: '', description: '' });
  };

  const openEditModal = (item: CatalogItem) => {
    setEditingId(item.id);
    setFormData({
      brand_id: item.brand_id || '',
      name: item.name,
      name_en: item.name_en || '',
      category_id: item.category_id || '',
      image_url: item.image_url || '',
      description: item.description || '',
    });
    setShowModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>كتالوج المعدات</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>إدارة المعدات المتاحة في النظام — {catalogItems.length} معدة</p>
        </div>
        <button
          className="btn btn-sm"
          onClick={() => { setEditingId(null); setFormData({ brand_id: '', name: '', name_en: '', category_id: '', image_url: '', description: '' }); setShowModal(true); }}
          style={{ gap: 6, flexShrink: 0, background: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={15} /> إضافة معدة
        </button>
      </div>

      {/* Search + Filters row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 220px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            placeholder="ابحث عن معدة..."
            style={{ paddingRight: 36, fontSize: 13 }}
          />
        </div>
        <select
          className="input"
          value={filters.selectedCategory}
          onChange={(e) => setFilters({ ...filters, selectedCategory: e.target.value })}
          style={{ flex: '0 1 160px', fontSize: 13 }}
        >
          <option value="">جميع التصنيفات</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          className="input"
          value={filters.selectedBrand}
          onChange={(e) => setFilters({ ...filters, selectedBrand: e.target.value })}
          style={{ flex: '0 1 180px', fontSize: 13 }}
        >
          <option value="">جميع العلامات</option>
          {brandStats.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.count})</option>)}
        </select>
        <select
          className="input"
          value={filters.showActive}
          onChange={(e) => setFilters({ ...filters, showActive: e.target.value as 'all' | 'active' | 'inactive' })}
          style={{ flex: '0 1 120px', fontSize: 13 }}
        >
          <option value="all">الكل</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
        {(filters.selectedBrand || filters.selectedCategory || filters.searchTerm || filters.showActive !== 'all') && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ color: 'var(--accent-lighter)', fontSize: 12 }}>
            <X size={13} /> مسح الفلاتر
          </button>
        )}
      </div>

      {filteredItems.length !== catalogItems.length && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          عرض {filteredItems.length} من أصل {catalogItems.length} معدة
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal isOpen={true} onClose={closeModal} title={editingId ? 'تعديل المعدة' : 'إضافة معدة جديدة'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">العلامة التجارية</label>
                <select className="input" value={formData.brand_id} onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}>
                  <option value="">اختر العلامة التجارية</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">التصنيف</label>
                <select className="input" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
                  <option value="">اختر التصنيف</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">اسم الموديل بالعربية <span className="req">*</span></label>
                <input className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="مثال: A7 III" />
              </div>
              <div className="input-group">
                <label className="input-label">اسم الموديل بالإنجليزية</label>
                <input className="input" value={formData.name_en} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} placeholder="Example: A7 III" dir="ltr" />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">صورة المعدة</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} style={{ display: 'none' }} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} style={{ gap: 6 }}>
                  <Upload size={14} /> {uploadingImage ? 'جاري الرفع...' : 'رفع صورة'}
                </button>
                {formData.image_url && (
                  <img src={formData.image_url} alt="Preview" style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '1px solid var(--border-soft)' }} />
                )}
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">وصف مختصر</label>
              <textarea className="input" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} placeholder="وصف المعدة وميزاتها..." />
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
              {editingId ? (
                <>
                  <button className="btn btn-sm" onClick={async () => { await handleUpdate(); closeModal(); }} style={{ gap: 6, background: 'var(--accent)', color: '#fff' }}>
                    <Save size={14} /> حفظ التغييرات
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={closeModal}>إلغاء</button>
                </>
              ) : (
                <>
                  <button className="btn btn-sm" onClick={async () => { await handleAdd(); closeModal(); }} style={{ gap: 6, background: 'var(--accent)', color: '#fff' }}>
                    <Plus size={14} /> إضافة
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={closeModal}>إلغاء</button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* قائمة المعدات */}
      <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الصورة</th>
                <th>العلامة التجارية</th>
                <th>الموديل</th>
                <th>التصنيف</th>
                <th>الوصف</th>
                <th>الاستخدام</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
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
                  <td style={{ textAlign: 'center' }}>
                    {usageCounts[item.id] ? (
                      <span className="badge badge-blue">{usageCounts[item.id]} مورد</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>
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
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    {catalogItems.length === 0 ? 'لا توجد معدات في الكتالوج حالياً' : 'لا توجد نتائج مطابقة للفلاتر المحددة'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>
    </div>
  );
};
