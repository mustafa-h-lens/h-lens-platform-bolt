import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Upload, Camera as CameraIcon } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useNotification } from '../../../../contexts/NotificationContext';
import { Modal } from '../../../shared/Modal';

interface Equipment {
  id: string;
  vendor_id: string;
  name: string;
  type: string;
  image?: string;
  serial_number?: string;
  notes?: string;
  condition?: string;
  catalog_item_id?: string;
  quantity: number;
  created_at: string;
  equipment_catalog?: {
    id: string;
    name: string;
    name_en: string;
    image_url: string;
    equipment_categories?: {
      name: string;
      name_en: string;
    };
  };
}

interface CatalogItem {
  id: string;
  name: string;
  name_en: string | null;
  image_url: string | null;
  category_id: string | null;
  brand_id: string | null;
  equipment_categories?: {
    id: string;
    name: string;
    name_en: string;
  };
  equipment_brands?: {
    id: string;
    name: string;
    name_en: string;
  };
}

interface Category {
  id: string;
  name: string;
  name_en: string;
}

interface Brand {
  id: string;
  name: string;
  name_en: string;
}

interface VendorEquipmentProps {
  vendorId: string;
}

const CONDITION_OPTIONS = [
  { value: 'excellent', label: 'ممتازة', label_en: 'Excellent' },
  { value: 'good', label: 'جيدة', label_en: 'Good' },
  { value: 'needs_service', label: 'تحتاج صيانة', label_en: 'Needs Service' },
];

export const VendorEquipment = ({ vendorId }: VendorEquipmentProps) => {
  const { showSuccess, showError, confirm } = useNotification();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    catalog_item_id: '',
    name: '',
    type: '',
    image: '',
    serial_number: '',
    condition: '',
    notes: '',
    quantity: 1,
  });

  useEffect(() => {
    fetchEquipment();
    fetchCategories();
  }, [vendorId]);

  useEffect(() => {
    if (selectedCategory) {
      fetchBrands();
      // جلب معدات الإضاءة بدون علامات تجارية مباشرة
      fetchCategoryEquipmentWithoutBrands();
      setSelectedBrand('');
      setCatalogItems([]);
      setSelectedCatalogItem(null);
      setFormData(prev => ({ ...prev, catalog_item_id: '', name: '', type: '', image: '' }));
    } else {
      setBrands([]);
      setSelectedBrand('');
      setCatalogItems([]);
      setSelectedCatalogItem(null);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedBrand && selectedCategory) {
      fetchCatalogItems();
      setSelectedCatalogItem(null);
      setFormData(prev => ({ ...prev, catalog_item_id: '', name: '', type: '', image: '' }));
    } else {
      setCatalogItems([]);
      setSelectedCatalogItem(null);
    }
  }, [selectedBrand, selectedCategory]);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_equipment')
        .select(`
          *,
          equipment_catalog (
            id,
            name,
            name_en,
            image_url,
            equipment_categories (
              name,
              name_en
            )
          )
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_categories')
        .select('id, name, name_en')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCategoryEquipmentWithoutBrands = async () => {
    // التحقق من أن التصنيف المختار هو الإضاءة أو الأكسسوارات
    const selectedCat = categories.find(c => c.id === selectedCategory);
    if (selectedCat && (
      selectedCat.name === 'إضاءة' ||
      selectedCat.name_en === 'Lighting' ||
      selectedCat.name === 'اكسسوارات' ||
      selectedCat.name_en === 'Accessories'
    )) {
      try {
        // جلب المعدات بدون علامات تجارية
        const { data, error } = await supabase
          .from('equipment_catalog')
          .select(`
            *,
            equipment_categories (
              id,
              name,
              name_en
            )
          `)
          .eq('is_active', true)
          .eq('category_id', selectedCategory)
          .is('brand_id', null)
          .order('name');

        if (error) throw error;
        setCatalogItems(data || []);
      } catch (error) {
        console.error('Error fetching equipment:', error);
      }
    }
  };

  const fetchBrands = async () => {
    try {
      // جلب معرفات العلامات التجارية المرتبطة بهذا التصنيف
      const { data: brandCategoryData, error: bcError } = await supabase
        .from('brand_categories')
        .select('brand_id')
        .eq('category_id', selectedCategory);

      if (bcError) throw bcError;

      const brandIds = [...new Set(brandCategoryData?.map(bc => bc.brand_id) || [])];

      if (brandIds.length === 0) {
        setBrands([]);
        return;
      }

      // جلب تفاصيل العلامات التجارية
      const { data: brandsData, error: brandsError } = await supabase
        .from('equipment_brands')
        .select('id, name, name_en')
        .in('id', brandIds)
        .eq('is_active', true)
        .order('name');

      if (brandsError) throw brandsError;

      setBrands(brandsData || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const fetchCatalogItems = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_catalog')
        .select(`
          *,
          equipment_categories (
            id,
            name,
            name_en
          ),
          equipment_brands (
            id,
            name,
            name_en
          )
        `)
        .eq('is_active', true)
        .eq('category_id', selectedCategory)
        .eq('brand_id', selectedBrand)
        .order('name');

      if (error) throw error;
      setCatalogItems(data || []);
    } catch (error) {
      console.error('Error fetching catalog items:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      catalog_item_id: '',
      name: '',
      type: '',
      image: '',
      serial_number: '',
      condition: '',
      notes: '',
      quantity: 1,
    });
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedCatalogItem(null);
    setCatalogItems([]);
    setEditingId(null);
    setShowModal(false);
  };

  const handleCatalogSelect = (item: CatalogItem) => {
    setSelectedCatalogItem(item);
    setFormData({
      ...formData,
      catalog_item_id: item.id,
      name: item.name,
      type: item.equipment_categories?.name || '',
      image: item.image_url || '',
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

      setFormData({ ...formData, image: publicUrl });
      showSuccess('تم رفع الصورة بنجاح');
    } catch (error) {
      console.error('Error uploading image:', error);
      showError('فشل رفع الصورة');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!editingId && !selectedCategory) {
      showError('يرجى اختيار التصنيف أولاً');
      return;
    }

    if (!formData.name.trim() || !formData.type.trim()) {
      showError('يرجى إدخال اسم ونوع المعدة');
      return;
    }

    try {
      const equipmentData = {
        vendor_id: vendorId,
        name: formData.name.trim(),
        type: formData.type.trim(),
        catalog_item_id: formData.catalog_item_id || null,
        image: formData.image || null,
        serial_number: formData.serial_number || null,
        condition: formData.condition || null,
        notes: formData.notes || null,
        quantity: formData.quantity || 1,
      };

      if (editingId) {
        const { error } = await supabase
          .from('vendor_equipment')
          .update(equipmentData)
          .eq('id', editingId);

        if (error) throw error;
        showSuccess('تم تحديث المعدة بنجاح');
      } else {
        const { error } = await supabase
          .from('vendor_equipment')
          .insert([equipmentData]);

        if (error) throw error;
        showSuccess('تم إضافة المعدة بنجاح');
      }

      resetForm();
      fetchEquipment();
    } catch (error) {
      console.error('Error saving equipment:', error);
      showError('حدث خطأ أثناء حفظ المعدة');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm('هل أنت متأكد من حذف هذه المعدة؟');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('vendor_equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSuccess('تم حذف المعدة بنجاح');
      fetchEquipment();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      showError('حدث خطأ أثناء حذف المعدة');
    }
  };

  const startEdit = (item: Equipment) => {
    setFormData({
      catalog_item_id: item.catalog_item_id || '',
      name: item.name,
      type: item.type,
      image: item.image || '',
      serial_number: item.serial_number || '',
      condition: item.condition || '',
      notes: item.notes || '',
      quantity: item.quantity || 1,
    });
    if (item.equipment_catalog) {
      setSelectedCatalogItem({
        id: item.equipment_catalog.id,
        name: item.equipment_catalog.name,
        name_en: item.equipment_catalog.name_en,
        image_url: item.equipment_catalog.image_url,
        category_id: null,
        brand_id: null,
        equipment_categories: item.equipment_catalog.equipment_categories,
      });
    }
    setEditingId(item.id);
    setShowModal(true);
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">المعدات</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Plus className="w-4 h-4" />
          إضافة معدة
        </button>
      </div>

      {/* عرض المعدات */}
      {equipment.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CameraIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">لا توجد معدات حالياً</p>
          <p className="text-sm text-slate-400 mt-1">قم بإضافة أول معدة للمورد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group"
            >
              {/* صورة المعدة */}
              <div className="aspect-video bg-slate-100 dark:bg-slate-700 relative overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : item.equipment_catalog?.image_url ? (
                  <img
                    src={item.equipment_catalog.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <CameraIcon className="w-12 h-12 text-slate-400" />
                  </div>
                )}
                {/* شارة التصنيف */}
                {item.type && (
                  <div className="absolute top-3 right-3">
                    <span className="px-3 py-1 backdrop-blur-sm text-white text-xs rounded-full font-medium"
                      style={{ backgroundColor: 'var(--color-primary)' }}>
                      {item.type}
                    </span>
                  </div>
                )}
              </div>

              {/* تفاصيل المعدة */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{item.name}</h3>
                  {item.equipment_catalog && (
                    <p className="text-xs text-slate-500">
                      من الكتالوج: {item.equipment_catalog.name}
                    </p>
                  )}
                </div>

                {/* معلومات إضافية */}
                <div className="space-y-2 text-sm">
                  {item.serial_number && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-500">الرقم التسلسلي:</span>
                      <span className="font-mono" dir="ltr">{item.serial_number}</span>
                    </div>
                  )}
                  {item.condition && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">الحالة:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.condition === 'excellent'
                            ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                            : item.condition === 'good'
                            ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800'
                            : 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800'
                        }`}
                      >
                        {CONDITION_OPTIONS.find((opt) => opt.value === item.condition)?.label}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-500">العدد:</span>
                    <span className="font-semibold text-blue-600">{item.quantity}</span>
                  </div>
                  {item.notes && (
                    <div className="text-slate-600 text-xs bg-slate-50 rounded-lg p-2">
                      {item.notes}
                    </div>
                  )}
                </div>

                {/* أزرار التحكم */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => startEdit(item)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="text-sm font-medium">تعديل</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium">حذف</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal إضافة/تعديل */}
      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingId ? 'تعديل المعدة' : 'إضافة معدة جديدة'}
      >
        <div className="space-y-4">
          {/* اختيار من الكتالوج */}
          {!editingId && (
            <div className="space-y-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-medium text-slate-900 mb-3">اختر من كتالوج المعدات</h3>

              {/* 1. اختيار التصنيف */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  1. التصنيف <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  dir="rtl"
                  required
                >
                  <option value="">اختر التصنيف</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. اختيار العلامة التجارية */}
              {selectedCategory && brands.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    2. العلامة التجارية
                  </label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    dir="rtl"
                  >
                    <option value="">اختر العلامة التجارية</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name_en} - {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. اختيار المعدة */}
              {((selectedBrand && catalogItems.length > 0) || (catalogItems.length > 0 && brands.length === 0)) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {brands.length > 0 ? '3. المعدة' : '2. المعدة'} ({catalogItems.length} متاح)
                  </label>
                  <select
                    value={formData.catalog_item_id}
                    onChange={(e) => {
                      const selectedItem = catalogItems.find(item => item.id === e.target.value);
                      if (selectedItem) {
                        handleCatalogSelect(selectedItem);
                      }
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    dir="rtl"
                  >
                    <option value="">اختر المعدة</option>
                    {catalogItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.name_en ? `- ${item.name_en}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedBrand && catalogItems.length === 0 && (
                <div className="text-center py-4 text-slate-500">
                  <CameraIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">لا توجد معدات متاحة لهذه العلامة</p>
                </div>
              )}
            </div>
          )}

          {/* معاينة العنصر المختار */}
          {selectedCatalogItem && (
            <div className="rounded-lg p-4 border"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, white)', borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}>
              <p className="text-sm font-medium text-blue-900 mb-2">تم الاختيار من الكتالوج:</p>
              <div className="flex items-center gap-3">
                {selectedCatalogItem.image_url && (
                  <img
                    src={selectedCatalogItem.image_url}
                    alt={selectedCatalogItem.name}
                    className="w-16 h-16 rounded-lg object-cover border-2 border-blue-300"
                  />
                )}
                <div>
                  <div className="font-medium text-blue-900">{selectedCatalogItem.name}</div>
                  {selectedCatalogItem.equipment_categories && (
                    <div className="text-sm text-blue-700">{selectedCatalogItem.equipment_categories.name}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* الحقول الأساسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                الاسم <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="اسم المعدة"
                disabled={!!selectedCatalogItem && !editingId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                التصنيف <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="التصنيف"
                disabled={!!selectedCatalogItem && !editingId}
              />
            </div>
          </div>

          {/* الحقول الإضافية للمورد */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                الرقم التسلسلي (اختياري)
              </label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Serial Number"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                الحالة (اختياري)
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="rtl"
              >
                <option value="">اختر الحالة</option>
                {CONDITION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                العدد
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1"
              />
            </div>
          </div>

          {/* رفع صورة مخصصة */}
          {!selectedCatalogItem && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                صورة المعدة (اختياري)
              </label>
              <div className="flex gap-3">
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
                {formData.image && (
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                  />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP - حد أقصى 5MB</p>
            </div>
          )}

          {/* ملاحظات */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ملاحظات (اختياري)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="أي ملاحظات أو تفاصيل إضافية..."
            />
          </div>

          {/* أزرار التحكم */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 text-white rounded-lg transition-all"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {editingId ? 'حفظ التغييرات' : 'إضافة المعدة'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
