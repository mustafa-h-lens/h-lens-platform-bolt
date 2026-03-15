import { useState, useEffect } from 'react';
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
}

export const StepFieldsAndRates = ({ selectedFields, updateSelectedFields }: Props) => {
  const [categories, setCategories] = useState<VendorField[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Price modal state
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceModalField, setPriceModalField] = useState<{ id: string; name_ar: string; name_en: string; category: string } | null>(null);
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');

  useEffect(() => { fetchVendorFields(); }, []);

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

  const openPriceModal = (sub: VendorField, categoryName: string) => {
    const existing = selectedFields.find(f => f.field_id === sub.id);
    setPriceModalField({ id: sub.id, name_ar: sub.name_ar, name_en: sub.name_en, category: categoryName });
    setPriceFrom(existing?.rate_from || '');
    setPriceTo(existing?.rate_to || '');
    setPriceModalOpen(true);
  };

  const savePriceModal = () => {
    if (!priceModalField || !priceFrom || !priceTo) return;
    const existing = selectedFields.find(f => f.field_id === priceModalField.id);
    if (existing) {
      // Update existing
      updateSelectedFields(selectedFields.map(f =>
        f.field_id === priceModalField.id ? { ...f, rate_from: priceFrom, rate_to: priceTo } : f
      ));
    } else {
      // Add new
      updateSelectedFields([...selectedFields, {
        field_id: priceModalField.id,
        field_name_ar: priceModalField.name_ar,
        field_name_en: priceModalField.name_en,
        rate_from: priceFrom,
        rate_to: priceTo,
      }]);
    }
    setPriceModalOpen(false);
    setPriceModalField(null);
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
        {/* Accordion */}
        <div className="accordion">
          {categories.map((cat) => {
            const isOpen = expandedCategories.has(cat.id);
            return (
              <div key={cat.id} className={`accordion-item ${isOpen ? 'open' : ''}`}>
                <button className="accordion-header" onClick={() => toggleAccordion(cat.id)} type="button">
                  <span className="acc-left">
                    <span className="acc-emoji">📁</span> {cat.name_ar}
                  </span>
                  <span className="acc-chevron">&#9662;</span>
                </button>
                <div className="accordion-body">
                  <div className="accordion-body-inner">
                    {cat.subcategories?.map(sub => {
                      const sel = selectedFields.find(f => f.field_id === sub.id);
                      const priceText = sel ? `${sel.rate_from} - ${sel.rate_to} ر.س/يوم` : '';
                      return (
                        <div
                          key={sub.id}
                          className={`subfield-chip ${sel ? 'selected' : ''}`}
                          onClick={() => openPriceModal(sub, cat.name_ar)}
                        >
                          <span>{sub.name_ar}</span>
                          <div className="sf-right">
                            {sel && (
                              <>
                                <span className="sf-price">{priceText}</span>
                                <button
                                  className="sf-remove"
                                  onClick={(e) => { e.stopPropagation(); removeField(sub.id); }}
                                  type="button"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected fields summary */}
        {selectedFields.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <label className="input-label" style={{ marginBottom: 8 }}>
              المجالات المختارة ({selectedFields.length})
            </label>
            <div className="review-fields">
              {selectedFields.map(f => (
                <span key={f.field_id} className="review-field-tag">
                  {f.field_name_ar} · {f.rate_from}-{f.rate_to} ر.س
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Price Modal */}
      {priceModalOpen && (
        <div className="price-modal-overlay" onClick={() => setPriceModalOpen(false)}>
          <div className="price-modal" onClick={(e) => e.stopPropagation()}>
            <div className="price-modal-hdr">
              <div>
                <div className="price-modal-ttl">{priceModalField?.name_ar || 'تحديد السعر'}</div>
                <div className="price-modal-sub">حدد نطاق السعر اليومي بالريال السعودي</div>
              </div>
              <button className="price-modal-close" onClick={() => setPriceModalOpen(false)} type="button">✕</button>
            </div>
            <div className="price-inputs">
              <div className="input-group">
                <label className="input-label">من (ر.س/يوم)</label>
                <input
                  className="input"
                  type="number"
                  value={priceFrom}
                  onChange={(e) => setPriceFrom(e.target.value)}
                  placeholder="500"
                  min="0"
                  dir="ltr"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <div className="input-group">
                <label className="input-label">إلى (ر.س/يوم)</label>
                <input
                  className="input"
                  type="number"
                  value={priceTo}
                  onChange={(e) => setPriceTo(e.target.value)}
                  placeholder="2000"
                  min="0"
                  dir="ltr"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>
            <div className="price-modal-foot">
              <button className="btn btn-ghost" onClick={() => setPriceModalOpen(false)} type="button">إلغاء</button>
              <button className="btn btn-primary" onClick={savePriceModal} type="button" disabled={!priceFrom || !priceTo}>حفظ السعر</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
