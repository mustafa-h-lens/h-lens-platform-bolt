import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabaseClient';
import { ChevronDown, ChevronRight, Plus, X, DollarSign, Check } from 'lucide-react';

interface VendorField {
  id: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  subcategories?: VendorField[];
}

interface SelectedField {
  field_id: string;
  field_name_ar: string;
  field_name_en: string;
  rate_from: string;
  rate_to: string;
}

interface Props {
  selectedFields: SelectedField[];
  updateSelectedFields: (fields: SelectedField[]) => void;
}

export const StepFieldsAndRates = ({ selectedFields, updateSelectedFields }: Props) => {
  const [categories, setCategories] = useState<VendorField[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<VendorField | null>(null);
  const [tempField, setTempField] = useState<{ id: string; name_ar: string; name_en: string } | null>(null);
  const [tempRates, setTempRates] = useState({ from: '', to: '' });
  const selectedFieldsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVendorFields();
  }, []);

  const fetchVendorFields = async () => {
    try {
      setLoading(false);
      const { data, error } = await supabase
        .from('vendor_fields')
        .select('*')
        .eq('is_active', true)
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
    } catch (error) {
      console.error('Error fetching vendor fields:', error);
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

  const handleAddField = (field: { id: string; name_ar: string; name_en: string }) => {
    if (selectedFields.some(f => f.field_id === field.id)) {
      return;
    }
    setTempField(field);
    setTempRates({ from: '', to: '' });
    setShowAddModal(true);
  };

  const handleSaveField = () => {
    if (!tempField || !tempRates.from || !tempRates.to) {
      return;
    }

    const newField: SelectedField = {
      field_id: tempField.id,
      field_name_ar: tempField.name_ar,
      field_name_en: tempField.name_en,
      rate_from: tempRates.from,
      rate_to: tempRates.to,
    };

    updateSelectedFields([...selectedFields, newField]);
    setShowAddModal(false);
    setTempField(null);
    setTempRates({ from: '', to: '' });
    setTimeout(() => {
      selectedFieldsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleRemoveField = (fieldId: string) => {
    updateSelectedFields(selectedFields.filter(f => f.field_id !== fieldId));
  };

  const handleUpdateRate = (fieldId: string, type: 'from' | 'to', value: string) => {
    updateSelectedFields(
      selectedFields.map(f =>
        f.field_id === fieldId
          ? { ...f, [type === 'from' ? 'rate_from' : 'rate_to']: value }
          : f
      )
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--vr-text-secondary)', fontFamily: "'Cairo', sans-serif" }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--vr-text-primary)' }}>
          مجالات العمل والأسعار
        </h2>
        <p style={{ color: 'var(--vr-text-secondary)' }}>
          اختر مجالات عملك وحدد الأسعار لكل مجال
        </p>
      </motion.div>

      {selectedFields.length > 0 && (
        <motion.div
          ref={selectedFieldsRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          <h3 className="text-lg font-semibold" style={{ color: 'var(--vr-text-primary)' }}>
            المجالات المختارة
          </h3>
          {selectedFields.map((field, index) => (
            <motion.div
              key={field.field_id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="vr-glass-card p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div style={{ color: 'var(--vr-text-primary)', fontWeight: '600', marginBottom: '4px' }}>
                    {field.field_name_ar}
                  </div>
                  <div style={{ color: 'var(--vr-text-muted)', fontSize: '14px' }}>
                    {field.field_name_en}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="vr-input-group">
                      <label className="vr-input-label">السعر من (ريال)</label>
                      <input
                        type="number"
                        value={field.rate_from}
                        onChange={(e) => handleUpdateRate(field.field_id, 'from', e.target.value)}
                        placeholder=" "
                        className="vr-input"
                        min="0"
                        step="100"
                      />
                    </div>
                    <div className="vr-input-group">
                      <label className="vr-input-label">السعر إلى (ريال)</label>
                      <input
                        type="number"
                        value={field.rate_to}
                        onChange={(e) => handleUpdateRate(field.field_id, 'to', e.target.value)}
                        placeholder=" "
                        className="vr-input"
                        min="0"
                        step="100"
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveField(field.field_id)}
                  className="vr-button-ghost p-2"
                  style={{ color: 'var(--vr-error)', borderRadius: 'var(--vr-radius-md)' }}
                >
                  <X size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--vr-text-primary)' }}>
          اختر مجالات أخرى
        </h3>
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="vr-glass-card overflow-hidden">
              <div
                className="p-4 flex items-center gap-3 cursor-pointer transition-all"
                style={{ borderRadius: 'var(--vr-radius-md)' }}
                onClick={() => toggleCategory(category.id)}
              >
                {expandedCategories.has(category.id) ? (
                  <ChevronDown size={20} style={{ color: 'var(--vr-text-secondary)' }} />
                ) : (
                  <ChevronRight size={20} style={{ color: 'var(--vr-text-secondary)' }} />
                )}
                <div>
                  <div style={{ color: 'var(--vr-text-primary)', fontWeight: '600' }}>
                    {category.name_ar}
                  </div>
                  <div style={{ color: 'var(--vr-text-muted)', fontSize: '14px' }}>
                    {category.name_en}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedCategories.has(category.id) && category.subcategories && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {category.subcategories.map((subcat) => {
                        const isSelected = selectedFields.some(f => f.field_id === subcat.id);
                        return (
                          <motion.div
                            key={subcat.id}
                            whileHover={{ scale: isSelected ? 1 : 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => !isSelected && handleAddField(subcat)}
                            className={`vr-selection-card ${isSelected ? 'selected' : ''}`}
                            style={{
                              marginRight: '24px',
                              borderColor: isSelected ? 'var(--vr-success-border)' : undefined,
                              background: isSelected ? 'var(--vr-success-bg)' : undefined,
                            }}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div>
                                <div style={{ color: 'var(--vr-text-primary)', fontSize: '14px' }}>
                                  {subcat.name_ar}
                                </div>
                                <div style={{ color: 'var(--vr-text-muted)', fontSize: '12px' }}>
                                  {subcat.name_en}
                                </div>
                              </div>
                              {isSelected ? (
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{
                                    background: `linear-gradient(135deg, var(--vr-success), var(--vr-success-text))`,
                                    boxShadow: `0 2px 8px rgba(16, 185, 129, 0.4)`,
                                  }}
                                >
                                  <Check size={16} className="text-white" strokeWidth={3} />
                                </div>
                              ) : (
                                <Plus size={20} style={{ color: 'var(--vr-accent-lighter)' }} />
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>

      {showAddModal && tempField && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowAddModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="vr-glass-card p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--vr-text-primary)' }}>
              تحديد الأسعار
            </h3>
            <p className="mb-6" style={{ color: 'var(--vr-text-secondary)' }}>
              {tempField.name_ar}
            </p>

            <div className="space-y-4">
              <div className="vr-input-group">
                <label className="vr-input-label">السعر من (ريال) <span className="req">*</span></label>
                <input
                  type="number"
                  value={tempRates.from}
                  onChange={(e) => setTempRates({ ...tempRates, from: e.target.value })}
                  placeholder=" "
                  className="vr-input"
                  min="0"
                  step="100"
                />
              </div>

              <div className="vr-input-group">
                <label className="vr-input-label">السعر إلى (ريال) <span className="req">*</span></label>
                <input
                  type="number"
                  value={tempRates.to}
                  onChange={(e) => setTempRates({ ...tempRates, to: e.target.value })}
                  placeholder=" "
                  className="vr-input"
                  min="0"
                  step="100"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveField}
                  disabled={!tempRates.from || !tempRates.to}
                  className="vr-button vr-glow flex-1"
                >
                  <DollarSign size={20} className="inline mr-2" />
                  حفظ
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddModal(false)}
                  className="vr-button vr-button-secondary flex-1"
                >
                  إلغاء
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
