import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';

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
  is_main?: boolean;
}

interface Props {
  selectedFields: SelectedField[];
  updateSelectedFields: (fields: SelectedField[]) => void;
}

export const StepFieldsAndRates = ({ selectedFields, updateSelectedFields }: Props) => {
  const [categories, setCategories] = useState<VendorField[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const pricingSectionRef = useRef<HTMLDivElement>(null);
  const pricingCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { fetchVendorFields(); }, []);

  // Auto-scroll to the newly added pricing card
  useEffect(() => {
    if (lastAddedId && pricingCardRefs.current[lastAddedId]) {
      pricingCardRefs.current[lastAddedId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const el = pricingCardRefs.current[lastAddedId];
      if (el) {
        el.classList.add('pricing-card-highlight');
        setTimeout(() => el.classList.remove('pricing-card-highlight'), 1500);
      }
      setLastAddedId(null);
    }
  }, [lastAddedId, selectedFields]);

  const fetchVendorFields = async () => {
    try {
      const { data, error } = await supabase.from('vendor_fields').select('*').eq('is_active', true).order('display_order');
      if (error) throw error;
      const categoriesMap = new Map<string, VendorField>();
      const rootCategories: VendorField[] = [];
      data?.forEach(f => categoriesMap.set(f.id, { ...f, subcategories: [] }));
      data?.forEach(f => {
        if (f.parent_id) {
          const parent = categoriesMap.get(f.parent_id);
          if (parent) parent.subcategories!.push(categoriesMap.get(f.id)!);
        } else {
          rootCategories.push(categoriesMap.get(f.id)!);
        }
      });
      setCategories(rootCategories);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleAccordion = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleField = (sub: VendorField) => {
    const existing = selectedFields.find(f => f.field_id === sub.id);
    if (existing) {
      const updated = selectedFields.filter(f => f.field_id !== sub.id);
      if (existing.is_main && updated.length > 0) {
        updated[0] = { ...updated[0], is_main: true };
      }
      updateSelectedFields(updated);
    } else {
      const isMain = selectedFields.length === 0;
      updateSelectedFields([...selectedFields, {
        field_id: sub.id,
        field_name_ar: sub.name_ar,
        field_name_en: sub.name_en,
        rate_from: '',
        rate_to: '',
        is_main: isMain,
      }]);
      setLastAddedId(sub.id);
    }
  };

  const setAsMain = (fieldId: string) => {
    updateSelectedFields(selectedFields.map(f => ({
      ...f,
      is_main: f.field_id === fieldId,
    })));
  };

  const updateRate = (fieldId: string, key: 'rate_from' | 'rate_to', value: string) => {
    updateSelectedFields(selectedFields.map(f =>
      f.field_id === fieldId ? { ...f, [key]: value } : f
    ));
  };

  const removeField = (id: string) => {
    const removed = selectedFields.find(f => f.field_id === id);
    const updated = selectedFields.filter(f => f.field_id !== id);
    if (removed?.is_main && updated.length > 0) {
      updated[0] = { ...updated[0], is_main: true };
    }
    updateSelectedFields(updated);
  };

  const mainField = selectedFields.find(f => f.is_main);
  const secondaryFields = selectedFields.filter(f => !f.is_main);

  if (loading) {
    return (
      <>
        <h2 className="step-title">💼 المجالات والتسعير</h2>
        <p className="step-subtitle">جاري التحميل...</p>
      </>
    );
  }

  return (
    <>
      <h2 className="step-title">💼 المجالات والتسعير</h2>
      <p className="step-subtitle">اختر مجالات خبرتك وحدد نطاق أسعارك</p>
      <div className="form-section">
        {/* Info */}
        <div className="info-box blue">
          <span className="info-icon">💡</span>
          <span>اختر <strong>خدمة رئيسية</strong> واحدة على الأقل، ويمكنك إضافة خدمات ثانوية. حدد نطاق السعر اليومي لكل خدمة.</span>
        </div>

        {/* ── Pricing Section (TOP) ── */}
        {selectedFields.length > 0 && (
          <div className="fields-pricing-section" ref={pricingSectionRef}>
            <div className="pricing-section-title">
              <span>💰</span> تحديد الأسعار ({selectedFields.length})
            </div>

            {/* Main service */}
            {mainField && (
              <div
                className="pricing-card main"
                ref={el => { pricingCardRefs.current[mainField.field_id] = el; }}
              >
                <div className="pricing-card-header">
                  <div className="pricing-card-title">
                    <span className="pricing-badge main">رئيسي</span>
                    {mainField.field_name_ar}
                  </div>
                  <button
                    className="sf-remove"
                    onClick={() => removeField(mainField.field_id)}
                    type="button"
                    style={{ opacity: 1 }}
                  >
                    ✕
                  </button>
                </div>
                <div className="pricing-inputs">
                  <div className="pricing-input-group">
                    <label>من (ر.س/يوم)</label>
                    <input
                      type="number"
                      className="input"
                      value={mainField.rate_from}
                      onChange={(e) => updateRate(mainField.field_id, 'rate_from', e.target.value)}
                      placeholder="500"
                      min="0"
                      dir="ltr"
                      style={{ fontFamily: 'var(--font-mono)' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="pricing-input-group">
                    <label>إلى (ر.س/يوم)</label>
                    <input
                      type="number"
                      className="input"
                      value={mainField.rate_to}
                      onChange={(e) => updateRate(mainField.field_id, 'rate_to', e.target.value)}
                      placeholder="2000"
                      min="0"
                      dir="ltr"
                      style={{ fontFamily: 'var(--font-mono)' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Secondary services */}
            {secondaryFields.map(field => (
              <div
                key={field.field_id}
                className="pricing-card secondary"
                ref={el => { pricingCardRefs.current[field.field_id] = el; }}
              >
                <div className="pricing-card-header">
                  <div className="pricing-card-title">
                    <span className="pricing-badge secondary">ثانوي</span>
                    {field.field_name_ar}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      className="make-main-btn"
                      onClick={() => setAsMain(field.field_id)}
                      type="button"
                      title="تعيين كرئيسي"
                    >
                      ★
                    </button>
                    <button
                      className="sf-remove"
                      onClick={() => removeField(field.field_id)}
                      type="button"
                      style={{ opacity: 1 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="pricing-inputs">
                  <div className="pricing-input-group">
                    <label>من (ر.س/يوم)</label>
                    <input
                      type="number"
                      className="input"
                      value={field.rate_from}
                      onChange={(e) => updateRate(field.field_id, 'rate_from', e.target.value)}
                      placeholder="500"
                      min="0"
                      dir="ltr"
                      style={{ fontFamily: 'var(--font-mono)' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="pricing-input-group">
                    <label>إلى (ر.س/يوم)</label>
                    <input
                      type="number"
                      className="input"
                      value={field.rate_to}
                      onChange={(e) => updateRate(field.field_id, 'rate_to', e.target.value)}
                      placeholder="2000"
                      min="0"
                      dir="ltr"
                      style={{ fontFamily: 'var(--font-mono)' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Accordion (BELOW pricing) ── */}
        <div className="accordion">
          {categories.map((cat) => {
            const isOpen = expandedCategories.has(cat.id);
            const selectedInCat = cat.subcategories?.filter(sub => selectedFields.some(f => f.field_id === sub.id)).length || 0;
            return (
              <div key={cat.id} className={`accordion-item ${isOpen ? 'open' : ''}`}>
                <button className="accordion-header" onClick={() => toggleAccordion(cat.id)} type="button">
                  <span className="acc-left">
                    <span className="acc-emoji">📁</span> {cat.name_ar}
                    {selectedInCat > 0 && (
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                        background: 'var(--success-bg)', color: 'var(--success-text)', fontWeight: 700,
                      }}>
                        {selectedInCat}
                      </span>
                    )}
                  </span>
                  <span className="acc-chevron">&#9662;</span>
                </button>
                <div className="accordion-body">
                  <div className="accordion-body-inner">
                    {cat.subcategories?.map(sub => {
                      const sel = selectedFields.find(f => f.field_id === sub.id);
                      return (
                        <div
                          key={sub.id}
                          className={`subfield-chip ${sel ? 'selected' : ''}`}
                          onClick={() => toggleField(sub)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {sel ? '✓' : '+'} {sub.name_ar}
                            {sel?.is_main && (
                              <span style={{
                                fontSize: 10, padding: '1px 6px', borderRadius: 'var(--radius-full)',
                                background: 'var(--accent-glow)', color: 'var(--accent-lighter)', fontWeight: 700,
                              }}>
                                رئيسي
                              </span>
                            )}
                          </span>
                          {sel && (
                            <div className="sf-right">
                              <span className="sf-price">
                                {sel.rate_from && sel.rate_to ? `${sel.rate_from} - ${sel.rate_to} ر.س` : 'حدد السعر ↑'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
