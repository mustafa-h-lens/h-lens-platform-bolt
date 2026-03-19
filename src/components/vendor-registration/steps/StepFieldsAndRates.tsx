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
}

interface Props {
  selectedFields: SelectedField[];
  updateSelectedFields: (fields: SelectedField[]) => void;
  portfolioUrl: string;
  updatePortfolioUrl: (url: string) => void;
  errors?: Record<string, string>;
}

const FieldError = ({ msg }: { msg?: string }) => msg ? (
  <div className="field-error">✕ {msg}</div>
) : null;

export const StepFieldsAndRates = ({ selectedFields, updateSelectedFields, portfolioUrl, updatePortfolioUrl, errors = {} }: Props) => {
  const [categories, setCategories] = useState<VendorField[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [fieldSearch, setFieldSearch] = useState('');
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
      updateSelectedFields(selectedFields.filter(f => f.field_id !== sub.id));
    } else {
      updateSelectedFields([...selectedFields, {
        field_id: sub.id,
        field_name_ar: sub.name_ar,
        field_name_en: sub.name_en,
        rate_from: '',
        rate_to: '',
      }]);
      setLastAddedId(sub.id);
    }
  };

  const updateRate = (fieldId: string, key: 'rate_from' | 'rate_to', value: string) => {
    updateSelectedFields(selectedFields.map(f =>
      f.field_id === fieldId ? { ...f, [key]: value } : f
    ));
  };

  const removeField = (id: string) => {
    updateSelectedFields(selectedFields.filter(f => f.field_id !== id));
  };

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
        {/* Portfolio URL */}
        <div className="input-group">
          <label className="input-label">🔗 رابط البورتفوليو / معرض الأعمال</label>
          <input
            className="input"
            type="url"
            value={portfolioUrl}
            onChange={(e) => updatePortfolioUrl(e.target.value)}
            placeholder="https://behance.net/yourname"
            dir="ltr"
            style={{ fontFamily: 'var(--font-mono)', textAlign: 'left' }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Behance, Vimeo, Instagram, أو موقعك الشخصي
          </div>
        </div>

        {/* Info */}
        <div className="info-box blue">
          <span className="info-icon">💡</span>
          <span>اختر خدمة واحدة على الأقل وحدد نطاق السعر لكل خدمة.</span>
        </div>
        <FieldError msg={errors.selected_fields} />

        {/* ── Pricing Section (TOP) ── */}
        {selectedFields.length > 0 && (
          <div className="fields-pricing-section" ref={pricingSectionRef}>
            <div className="pricing-section-title">
              <span>💰</span> تحديد الأسعار ({selectedFields.length})
            </div>

            {selectedFields.map(field => (
              <div
                key={field.field_id}
                className="pricing-card main"
                ref={el => { pricingCardRefs.current[field.field_id] = el; }}
              >
                <div className="pricing-card-header">
                  <div className="pricing-card-title">
                    {field.field_name_ar}
                  </div>
                  <button
                    className="sf-remove"
                    onClick={() => removeField(field.field_id)}
                    type="button"
                    style={{ opacity: 1 }}
                  >
                    ✕
                  </button>
                </div>
                <div className="pricing-inputs">
                  <div className="pricing-input-group">
                    <label>من (ر.س)</label>
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
                    <label>إلى (ر.س)</label>
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

        {/* ── Search ── */}
        <div className="input-group" style={{ marginBottom: 8 }}>
          <input
            className="input"
            value={fieldSearch}
            onChange={e => { setFieldSearch(e.target.value); if (e.target.value) setExpandedCategories(new Set(categories.map(c => c.id))); }}
            placeholder="ابحث بالعربي أو الإنجليزي... Search in Arabic or English"
            style={{ fontSize: 13 }}
          />
        </div>

        {/* ── Accordion (BELOW pricing) ── */}
        <div className="accordion">
          {categories.filter(cat => {
            if (!fieldSearch.trim()) return true;
            const q = fieldSearch.toLowerCase();
            return cat.name_ar.includes(q) || cat.name_en.toLowerCase().includes(q) ||
              cat.subcategories?.some(s => s.name_ar.includes(q) || s.name_en.toLowerCase().includes(q));
          }).map((cat) => {
            const q = fieldSearch.toLowerCase();
            const filteredSubs = fieldSearch.trim()
              ? (cat.subcategories || []).filter(s => s.name_ar.includes(q) || s.name_en.toLowerCase().includes(q))
              : (cat.subcategories || []);
            const isOpen = expandedCategories.has(cat.id) || !!fieldSearch.trim();
            const selectedInCat = filteredSubs.filter(sub => selectedFields.some(f => f.field_id === sub.id)).length;
            return (
              <div key={cat.id} className={`accordion-item ${isOpen ? 'open' : ''}`}>
                <button className="accordion-header" onClick={() => toggleAccordion(cat.id)} type="button">
                  <span className="acc-left">
                    <span className="acc-emoji">📁</span> {cat.name_ar} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{cat.name_en}</span>
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
                    {filteredSubs.map(sub => {
                      const sel = selectedFields.find(f => f.field_id === sub.id);
                      return (
                        <div
                          key={sub.id}
                          className={`subfield-chip ${sel ? 'selected' : ''}`}
                          onClick={() => toggleField(sub)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {sel ? '✓' : '+'} {sub.name_ar} <span style={{ fontSize: 11, opacity: 0.5 }}>{sub.name_en}</span>
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
