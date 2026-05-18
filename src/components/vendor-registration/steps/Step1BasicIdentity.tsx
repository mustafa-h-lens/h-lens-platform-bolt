import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { VendorFormData } from '../VendorRegistrationForm';
import { getNationalityNames } from '../../../lib/shared-data';

interface Props {
  formData: VendorFormData;
  updateFormData: (data: Partial<VendorFormData>) => void;
  errors?: Record<string, React.ReactNode>;
}

const FieldError = ({ msg }: { msg?: React.ReactNode }) => msg ? (
  <div className="field-error">✕ {msg}</div>
) : null;

interface FieldChild {
  id: string;
  name_ar: string;
}

interface FieldCategory {
  id: string;
  name_ar: string;
  children: FieldChild[];
}

const nationalities = getNationalityNames();

export const Step1BasicIdentity = ({ formData, updateFormData, errors = {} }: Props) => {
  const [fieldCategories, setFieldCategories] = useState<FieldCategory[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);
  const [fieldsError, setFieldsError] = useState<string>('');
  const [natOpen, setNatOpen] = useState(false);
  const [natSearch, setNatSearch] = useState('');
  const natRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFields();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (natRef.current && !natRef.current.contains(e.target as Node)) {
        setNatOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const filteredNationalities = nationalities.filter(n =>
    n.includes(natSearch)
  );

  return (
    <>
      <h2 className="step-title">👤 الهوية</h2>
      <p className="step-subtitle">المعلومات الشخصية الأساسية</p>
      <div className="form-section">
        {/* Full Name */}
        <div className="input-group">
          <label className="input-label"><span className="req">*</span> الاسم الثلاثي</label>
          <input
            className={`input ${errors.full_name ? 'input-error' : ''}`}
            type="text"
            value={formData.full_name}
            onChange={(e) => updateFormData({ full_name: e.target.value })}
            placeholder="أدخل اسمك الثلاثي"
          />
          <FieldError msg={errors.full_name} />
        </div>

        {/* Nationality — custom select */}
        <div className="input-group">
          <label className="input-label"><span className="req">*</span> الجنسية</label>
          <div className={`custom-select ${natOpen ? 'open' : ''} ${errors.nationality ? 'has-error' : ''}`} ref={natRef}>
            <div className="cs-trigger" tabIndex={0} onClick={() => setNatOpen(!natOpen)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setNatOpen(!natOpen); } }}>
              <span className={formData.nationality ? '' : 'cs-placeholder'}>
                {formData.nationality || 'اختر الجنسية'}
              </span>
              <span className="cs-chevron">&#9662;</span>
            </div>
            {natOpen && (
              <div className="cs-dropdown" style={{ display: 'flex' }}>
                <div className="cs-search">
                  <input
                    type="text"
                    placeholder="ابحث..."
                    value={natSearch}
                    onChange={(e) => setNatSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="cs-options">
                  {filteredNationalities.map((nat) => (
                    <div
                      key={nat}
                      className={`cs-option ${formData.nationality === nat ? 'selected' : ''}`}
                      onClick={() => {
                        updateFormData({ nationality: nat });
                        setNatOpen(false);
                        setNatSearch('');
                      }}
                    >
                      {nat}
                    </div>
                  ))}
                  {filteredNationalities.length === 0 && (
                    <div className="cs-option" style={{ color: 'var(--text-muted)', cursor: 'default' }}>
                      لا توجد نتائج
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <FieldError msg={errors.nationality} />
        </div>

        {/* Vendor Type */}
        <div className="input-group">
          <label className="input-label"><span className="req">*</span> نوع المورد</label>
          <div className="vendor-type-grid">
            <div
              className={`vendor-type-card ${formData.vendor_type === 'individual' ? 'selected' : ''}`}
              onClick={() => updateFormData({ vendor_type: 'individual' })}
            >
              <span className="vt-emoji">👤</span>
              <span className="vt-label">فرد</span>
              <span className="vt-desc">مقدم خدمة مستقل</span>
            </div>
            <div
              className={`vendor-type-card ${formData.vendor_type === 'company' ? 'selected' : ''}`}
              onClick={() => updateFormData({ vendor_type: 'company' })}
            >
              <span className="vt-emoji">🏢</span>
              <span className="vt-label">شركة</span>
              <span className="vt-desc">شركة أو مؤسسة</span>
            </div>
          </div>
          <FieldError msg={errors.vendor_type} />
        </div>
      </div>
    </>
  );
};
