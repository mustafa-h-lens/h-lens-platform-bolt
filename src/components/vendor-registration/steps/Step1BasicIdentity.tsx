import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabaseClient';
import { VendorFormData } from '../VendorRegistrationForm';
import { User, Building2, ChevronDown, Loader2 } from 'lucide-react';
import { getNationalityOptions } from '../../../lib/countries';

interface Props {
  formData: VendorFormData;
  updateFormData: (data: Partial<VendorFormData>) => void;
}

interface FieldChild {
  id: string;
  name_ar: string;
}

interface FieldCategory {
  id: string;
  name_ar: string;
  children: FieldChild[];
}

interface NationalityOption {
  value: string;
  label: string;
}

export const Step1BasicIdentity = ({ formData, updateFormData }: Props) => {
  const [fieldCategories, setFieldCategories] = useState<FieldCategory[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);
  const [fieldsError, setFieldsError] = useState<string>('');
  const [nationalities, setNationalities] = useState<NationalityOption[]>([]);
  const [nationalitySearch, setNationalitySearch] = useState('');
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const fieldDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFields();
    loadNationalities();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fieldDropdownRef.current && !fieldDropdownRef.current.contains(e.target as Node)) {
        setShowFieldDropdown(false);
        setExpandedCategory(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNationalities = async () => {
    const options = await getNationalityOptions('ar');
    setNationalities(options);
  };

  const fetchFields = async () => {
    try {
      setIsLoadingFields(true);
      setFieldsError('');

      const { data: parents, error: parentsError } = await supabase
        .from('vendor_fields')
        .select('id, name_ar')
        .eq('is_active', true)
        .is('parent_id', null)
        .order('display_order');

      if (parentsError) {
        setFieldsError('حدث خطأ في تحميل المجالات');
        return;
      }

      if (!parents || parents.length === 0) {
        setFieldsError('لا توجد مجالات متاحة');
        return;
      }

      const { data: children, error: childrenError } = await supabase
        .from('vendor_fields')
        .select('id, name_ar, parent_id')
        .eq('is_active', true)
        .not('parent_id', 'is', null)
        .order('display_order');

      if (childrenError) {
        setFieldsError('حدث خطأ في تحميل المجالات الفرعية');
        return;
      }

      const categories: FieldCategory[] = parents.map(p => ({
        id: p.id,
        name_ar: p.name_ar,
        children: (children || [])
          .filter(c => c.parent_id === p.id)
          .map(c => ({ id: c.id, name_ar: c.name_ar })),
      }));

      setFieldCategories(categories);
    } catch {
      setFieldsError('حدث خطأ في تحميل المجالات');
    } finally {
      setIsLoadingFields(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setExpandedCategory(prev => prev === categoryId ? null : categoryId);
  };

  const handleSelectSubField = (childName: string, parentName: string) => {
    updateFormData({ primary_field: `${parentName} - ${childName}` });
    setShowFieldDropdown(false);
    setExpandedCategory(null);
  };

  const handleSelectParent = (parentName: string) => {
    updateFormData({ primary_field: parentName });
    setShowFieldDropdown(false);
    setExpandedCategory(null);
  };

  const filteredNationalities = nationalities.filter(n =>
    n.label.includes(nationalitySearch) || n.value.includes(nationalitySearch)
  );

  return (
    <div className="space-y-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--vr-text-primary)' }}>
          المعلومات الأساسية
        </h2>
        <p style={{ color: 'var(--vr-text-secondary)' }}>
          دعنا نتعرف عليك أكثر
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="vr-input-group"
      >
        <label className="vr-input-label">الاسم الثلاثي <span className="req">*</span></label>
        <input
          type="text"
          value={formData.full_name}
          onChange={(e) => updateFormData({ full_name: e.target.value })}
          placeholder="الاسم الكامل كما في الهوية"
          className="vr-input"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="relative"
      >
        <div className="vr-input-group">
          <label className="vr-input-label">الجنسية <span className="req">*</span></label>
          <input
            type="text"
            value={formData.nationality ? formData.nationality : nationalitySearch}
            onChange={(e) => {
              const value = e.target.value;
              setNationalitySearch(value);
              setShowNationalityDropdown(true);
              if (value === '') {
                updateFormData({ nationality: '' });
              }
            }}
            onFocus={() => setShowNationalityDropdown(true)}
            onBlur={() => {
              setTimeout(() => setShowNationalityDropdown(false), 200);
            }}
            placeholder="ابحث عن الجنسية..."
            className="vr-input"
          />
          <ChevronDown
            className="absolute left-4 top-9 w-5 h-5 pointer-events-none"
            style={{ color: 'var(--vr-text-muted)' }}
          />
        </div>

        <AnimatePresence>
          {showNationalityDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="vr-dropdown absolute top-full left-0 right-0 mt-2 z-10"
            >
              {filteredNationalities.length > 0 ? (
                filteredNationalities.map((nat) => (
                  <div
                    key={nat.value}
                    className="vr-dropdown-item"
                    onClick={() => {
                      updateFormData({ nationality: nat.value });
                      setNationalitySearch('');
                      setShowNationalityDropdown(false);
                    }}
                  >
                    {nat.label}
                  </div>
                ))
              ) : (
                <div className="vr-dropdown-item" style={{ color: 'var(--vr-text-muted)' }}>
                  لا توجد نتائج
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Field dropdown hidden - moved to dedicated StepFieldsAndRates page */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <label className="vr-input-label block mb-3">
          نوع المورد <span className="req">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => updateFormData({ vendor_type: 'individual' })}
            className={`vr-selection-card flex-col ${formData.vendor_type === 'individual' ? 'selected' : ''}`}
          >
            <User className="w-8 h-8 mb-3 mx-auto" style={{ color: 'var(--vr-accent-lighter)' }} />
            <h3 className="text-xl font-semibold text-center" style={{ color: 'var(--vr-text-primary)' }}>
              فرد
            </h3>
            <p className="text-sm text-center mt-2" style={{ color: 'var(--vr-text-muted)' }}>
              مورد فردي
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => updateFormData({ vendor_type: 'company' })}
            className={`vr-selection-card flex-col ${formData.vendor_type === 'company' ? 'selected' : ''}`}
          >
            <Building2 className="w-8 h-8 mb-3 mx-auto" style={{ color: 'var(--vr-accent-lighter)' }} />
            <h3 className="text-xl font-semibold text-center" style={{ color: 'var(--vr-text-primary)' }}>
              شركة
            </h3>
            <p className="text-sm text-center mt-2" style={{ color: 'var(--vr-text-muted)' }}>
              شركة أو مؤسسة
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
