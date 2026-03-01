import { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { supabase } from '../../../lib/supabaseClient';
import { getTheme, borderRadius } from '../../../theme/tokens';
import { Plus, Edit2, ChevronDown, ChevronRight, Trash2, Save, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../shared/Modal';

interface VendorField {
  id: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  subcategories?: VendorField[];
}

export const VendorFieldsSettings = () => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const { showSuccess, showError } = useNotification();

  const [categories, setCategories] = useState<VendorField[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<VendorField | null>(null);
  const [newField, setNewField] = useState({
    name_ar: '',
    name_en: '',
    parent_id: null as string | null,
  });

  useEffect(() => {
    fetchVendorFields();
  }, []);

  const fetchVendorFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendor_fields')
        .select('*')
        .order('display_order');

      if (error) throw error;

      const categoriesMap = new Map<string, VendorField>();
      const rootCategories: VendorField[] = [];

      data?.forEach((field) => {
        categoriesMap.set(field.id, { ...field, subcategories: [] });
      });

      data?.forEach((field) => {
        if (field.parent_id) {
          const parent = categoriesMap.get(field.parent_id);
          if (parent) {
            parent.subcategories!.push(categoriesMap.get(field.id)!);
          }
        } else {
          rootCategories.push(categoriesMap.get(field.id)!);
        }
      });

      setCategories(rootCategories);

      const allExpanded = new Set(rootCategories.map(cat => cat.id));
      setExpandedCategories(allExpanded);
    } catch (error) {
      console.error('Error fetching vendor fields:', error);
      showError('حدث خطأ أثناء تحميل مجالات الموردين');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleAddCategory = () => {
    setNewField({ name_ar: '', name_en: '', parent_id: null });
    setShowAddModal(true);
  };

  const handleAddSubcategory = (parentId: string) => {
    setNewField({ name_ar: '', name_en: '', parent_id: parentId });
    setShowAddModal(true);
  };

  const handleSaveNew = async () => {
    if (!newField.name_ar || !newField.name_en) {
      showError('يرجى ملء جميع الحقول');
      return;
    }

    if (saving) return;

    try {
      setSaving(true);
      const { data, error } = await supabase.from('vendor_fields').insert([
        {
          name_ar: newField.name_ar,
          name_en: newField.name_en,
          parent_id: newField.parent_id,
          display_order: 999,
        },
      ])
      .select()
      .single();

      if (error) throw error;

      await fetchVendorFields();

      showSuccess('تم إضافة المجال بنجاح');
      setShowAddModal(false);
      setNewField({ name_ar: '', name_en: '', parent_id: null });
    } catch (error) {
      console.error('Error adding field:', error);
      showError('حدث خطأ أثناء إضافة المجال');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (field: VendorField) => {
    setEditingField(field);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingField || !editingField.name_ar || !editingField.name_en) {
      showError('يرجى ملء جميع الحقول');
      return;
    }

    if (saving) return;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('vendor_fields')
        .update({
          name_ar: editingField.name_ar,
          name_en: editingField.name_en,
          is_active: editingField.is_active,
        })
        .eq('id', editingField.id)
        .select()
        .single();

      if (error) throw error;

      await fetchVendorFields();

      showSuccess('تم تحديث المجال بنجاح');
      setShowEditModal(false);
      setEditingField(null);
    } catch (error) {
      console.error('Error updating field:', error);
      showError('حدث خطأ أثناء تحديث المجال');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fieldId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المجال؟')) return;

    try {
      const { error } = await supabase
        .from('vendor_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      await fetchVendorFields();
      showSuccess('تم حذف المجال بنجاح');
    } catch (error) {
      console.error('Error deleting field:', error);
      showError('حدث خطأ أثناء حذف المجال');
    }
  };

  const renderSubcategories = (subcategories: VendorField[]) => {
    return subcategories.map((subcat) => (
      <div
        key={subcat.id}
        style={{
          padding: '12px 16px',
          marginLeft: '32px',
          marginTop: '4px',
          backgroundColor: theme.background.tertiary,
          borderRadius: borderRadius.DEFAULT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ color: theme.text.primary, fontSize: '14px' }}>
            {subcat.name_ar}
          </div>
          <div style={{ color: theme.text.secondary, fontSize: '12px', marginTop: '2px' }}>
            {subcat.name_en}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(subcat)}
            style={{ padding: '4px 8px' }}
          >
            <Edit2 size={16} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(subcat.id)}
            style={{ padding: '4px 8px', color: theme.status.error }}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    ));
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>جاري التحميل...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', color: theme.text.primary, marginBottom: '8px' }}>
            مجالات الموردين
          </h2>
          <p style={{ color: theme.text.secondary, fontSize: '14px' }}>
            إدارة الفئات والمجالات الفرعية للموردين
          </p>
        </div>
        <Button onClick={handleAddCategory}>
          <Plus size={20} />
          إضافة فئة رئيسية
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {categories.map((category) => (
          <div
            key={category.id}
            style={{
              backgroundColor: theme.background.secondary,
              borderRadius: borderRadius.lg,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                backgroundColor: theme.background.primary,
              }}
              onClick={() => toggleCategory(category.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                {expandedCategories.has(category.id) ? (
                  <ChevronDown size={20} style={{ color: theme.text.secondary }} />
                ) : (
                  <ChevronRight size={20} style={{ color: theme.text.secondary }} />
                )}
                <div>
                  <div style={{ color: theme.text.primary, fontSize: '16px', fontWeight: '600' }}>
                    {category.name_ar}
                  </div>
                  <div style={{ color: theme.text.secondary, fontSize: '14px', marginTop: '2px' }}>
                    {category.name_en}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddSubcategory(category.id)}
                >
                  <Plus size={16} />
                  إضافة مجال فرعي
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(category)}
                >
                  <Edit2 size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(category.id)}
                  style={{ color: theme.status.error }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            {expandedCategories.has(category.id) && category.subcategories && category.subcategories.length > 0 && (
              <div style={{ padding: '16px' }}>
                {renderSubcategories(category.subcategories)}
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setNewField({ name_ar: '', name_en: '', parent_id: null });
          }}
          title={newField.parent_id ? 'إضافة مجال فرعي' : 'إضافة فئة رئيسية'}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="الاسم بالعربية"
              value={newField.name_ar}
              onChange={(e) => setNewField({ ...newField, name_ar: e.target.value })}
            />
            <Input
              label="الاسم بالإنجليزية"
              value={newField.name_en}
              onChange={(e) => setNewField({ ...newField, name_en: e.target.value })}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setNewField({ name_ar: '', name_en: '', parent_id: null });
                }}
              >
                <X size={16} />
                إلغاء
              </Button>
              <Button onClick={handleSaveNew}>
                <Save size={16} />
                حفظ
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showEditModal && editingField && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingField(null);
          }}
          title="تعديل المجال"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="الاسم بالعربية"
              value={editingField.name_ar}
              onChange={(e) => setEditingField({ ...editingField, name_ar: e.target.value })}
            />
            <Input
              label="الاسم بالإنجليزية"
              value={editingField.name_en}
              onChange={(e) => setEditingField({ ...editingField, name_en: e.target.value })}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="is_active"
                checked={editingField.is_active}
                onChange={(e) => setEditingField({ ...editingField, is_active: e.target.checked })}
                style={{ width: '16px', height: '16px' }}
              />
              <label htmlFor="is_active" style={{ color: theme.text.primary, fontSize: '14px' }}>
                نشط
              </label>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingField(null);
                }}
              >
                <X size={16} />
                إلغاء
              </Button>
              <Button onClick={handleSaveEdit}>
                <Save size={16} />
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
