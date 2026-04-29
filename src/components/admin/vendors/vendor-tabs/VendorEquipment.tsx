import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Camera as CameraIcon } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useNotification } from '../../../../contexts/NotificationContext';
import { Modal } from '../../../shared/Modal';
import { FileUploader } from '../../../ui/FileUploader';

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
    try {
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
      if (data && data.length > 0) {
        setCatalogItems(data);
      }
    } catch (error) {
      console.error('Error fetching equipment without brands:', error);
    }
  };

  const fetchBrands = async () => {
    try {
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

  const handleImageUpload = async (file: File) => {
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
    return <div className="dash-empty" style={{ height: 256 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>المعدات</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} style={{ gap: 6 }}>
          <Plus size={13} />
          إضافة معدة
        </button>
      </div>

      {equipment.length === 0 ? (
        <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 48 }}>
          <CameraIcon size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد معدات حالياً</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, opacity: 0.7 }}>قم بإضافة أول معدة للمورد</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {equipment.map((item) => (
            <div key={item.id} className="card" style={{ cursor: 'default', padding: 0, overflow: 'hidden' }}>
              {/* Equipment Image */}
              <div style={{ aspectRatio: '16/9', background: 'var(--bg-overlay)', position: 'relative', overflow: 'hidden' }}>
                {item.image ? (
                  <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : item.equipment_catalog?.image_url ? (
                  <img src={item.equipment_catalog.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CameraIcon size={36} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                  </div>
                )}
                {item.type && (
                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <span className="badge badge-blue" style={{ backdropFilter: 'blur(8px)' }}>
                      {item.type}
                    </span>
                  </div>
                )}
              </div>

              {/* Equipment Details */}
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>{item.name}</h3>
                  {item.equipment_catalog && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      من الكتالوج: {item.equipment_catalog.name}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  {item.serial_number && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>الرقم التسلسلي:</span>
                      <span style={{ fontFamily: 'monospace' }} dir="ltr">{item.serial_number}</span>
                    </div>
                  )}
                  {item.condition && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>الحالة:</span>
                      <span className={`badge ${
                        item.condition === 'excellent' ? 'badge-green' :
                        item.condition === 'good' ? 'badge-blue' : 'badge-amber'
                      }`}>
                        {CONDITION_OPTIONS.find((opt) => opt.value === item.condition)?.label}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>العدد:</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-lighter)' }}>{item.quantity}</span>
                  </div>
                  {item.notes && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', padding: 8 }}>
                      {item.notes}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border-soft)' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => startEdit(item)}
                    style={{ flex: 1, gap: 6, color: 'var(--accent-lighter)', justifyContent: 'center' }}
                  >
                    <Edit2 size={13} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>تعديل</span>
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(item.id)}
                    style={{ flex: 1, gap: 6, color: 'var(--danger-text)', justifyContent: 'center' }}
                  >
                    <Trash2 size={13} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>حذف</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingId ? 'تعديل المعدة' : 'إضافة معدة جديدة'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Catalog Selection */}
          {(
            <div style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', padding: 16, border: '1px solid var(--border-soft)' }}>
              <h3 style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 12, fontSize: 13 }}>اختر من كتالوج المعدات</h3>

              <div className="input-group">
                <label className="input-label">1. التصنيف <span className="req">*</span></label>
                <select
                  className="input"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
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

              {selectedCategory && brands.length > 0 && (
                <div className="input-group" style={{ marginTop: 12 }}>
                  <label className="input-label">2. العلامة التجارية</label>
                  <select
                    className="input"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
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

              {((selectedBrand && catalogItems.length > 0) || (catalogItems.length > 0 && brands.length === 0)) && (
                <div className="input-group" style={{ marginTop: 12 }}>
                  <label className="input-label">
                    {brands.length > 0 ? '3. المعدة' : '2. المعدة'} ({catalogItems.length} متاح)
                  </label>
                  <select
                    className="input"
                    value={formData.catalog_item_id}
                    onChange={(e) => {
                      const selectedItem = catalogItems.find(item => item.id === e.target.value);
                      if (selectedItem) {
                        handleCatalogSelect(selectedItem);
                      }
                    }}
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
                <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)' }}>
                  <CameraIcon size={36} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p style={{ fontSize: 12 }}>لا توجد معدات متاحة لهذه العلامة</p>
                </div>
              )}
            </div>
          )}

          {/* Selected catalog preview */}
          {selectedCatalogItem && (
            <div style={{ borderRadius: 'var(--radius-md)', padding: 12, border: '1px solid var(--accent-glow-md)', background: 'var(--accent-glow)' }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent-lighter)', marginBottom: 8 }}>تم الاختيار من الكتالوج:</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectedCatalogItem.image_url && (
                  <img
                    src={selectedCatalogItem.image_url}
                    alt={selectedCatalogItem.name}
                    style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '2px solid var(--accent-glow-md)' }}
                  />
                )}
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--accent-lighter)', fontSize: 13 }}>{selectedCatalogItem.name}</div>
                  {selectedCatalogItem.equipment_categories && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedCatalogItem.equipment_categories.name}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Name & Type (read-only, filled from catalog) */}
          {selectedCatalogItem && (
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">الاسم</label>
                <input type="text" className="input" value={formData.name} disabled style={{ opacity: 0.7 }} />
              </div>
              <div className="input-group">
                <label className="input-label">التصنيف</label>
                <input type="text" className="input" value={formData.type} disabled style={{ opacity: 0.7 }} />
              </div>
            </div>
          )}

          {/* Additional vendor fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">الرقم التسلسلي (اختياري)</label>
              <input
                type="text"
                className="input"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="الرقم التسلسلي"
                dir="ltr"
              />
            </div>

            <div className="input-group">
              <label className="input-label">الحالة (اختياري)</label>
              <select
                className="input"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
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

            <div className="input-group">
              <label className="input-label">العدد</label>
              <input
                type="number"
                className="input"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                placeholder="1"
              />
            </div>
          </div>

          {/* Custom image upload */}
          {!selectedCatalogItem && (
            <FileUploader
              label="صورة المعدة (اختياري)"
              hint="JPG, PNG, WebP - حد أقصى 5MB"
              value={formData.image}
              onChange={(url) => setFormData({ ...formData, image: url })}
              onFile={handleImageUpload}
              accept="image/jpeg,image/png,image/webp"
              preview="image"
              uploading={uploadingImage}
            />
          )}

          {/* Notes */}
          <div className="input-group">
            <label className="input-label">ملاحظات (اختياري)</label>
            <textarea
              className="input"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="أي ملاحظات أو تفاصيل إضافية..."
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
            <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>
              {editingId ? 'حفظ التغييرات' : 'إضافة المعدة'}
            </button>
            <button className="btn btn-secondary" onClick={resetForm}>
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
