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
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

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

  const toggleFieldSelection = (sub: VendorField) => {
    const existing = selectedFields.find(f => f.field_id === sub.id);
    if (existing) {
      // Already selected, remove it
      updateSelectedFields(selectedFields.filter(f => f.field_id !== sub.id));
      if (editingFieldId === sub.id) setEditingFieldId(null);
    } else {
      // Add new with default empty prices and set as editing
      updateSelectedFields([...selectedFields, {
        field_id: sub.id,
        field_name_ar: sub.name_ar,
        field_name_en: sub.name_en,
        rate_from: '',
        rate_to: '',
      }]);
      setEditingFieldId(sub.id);
    }
  };

  const updateFieldPrice = (fieldId: string, rateFrom: string, rateTo: string) => {
    updateSelectedFields(selectedFields.map(f =>
      f.field_id === fieldId ? { ...f, rate_from: rateFrom, rate_to: rateTo } : f
    ));
  };

  const removeField = (id: string) => {
    updateSelectedFields(selectedFields.filter(f => f.field_id !== id));
    if (editingFieldId === id) setEditingFieldId(null);
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
                      const isEditing = editingFieldId === sub.id;
                      return (
                        <div key={sub.id}>
                          <div
                            className={`subfield-chip ${sel ? 'selected' : ''}`}
                            onClick={() => toggleFieldSelection(sub)}
                          >
                            <span>{sub.name_ar}</span>
                            <div className="sf-right">
                              {sel && !isEditing && (
                                <>
                                  <span className="sf-price">{sel.rate_from} - {sel.rate_to} ر.س/يوم</span>
                                  <button
                                    className="sf-remove"
                                    onClick={(e) => { e.stopPropagation(); removeField(sub.id); }}
                                    type="button"
                                  >
                                    ✕
                                  </button>
                                </>
                              )}
                              {sel && isEditing && (
                                <span className="sf-price" style={{ color: 'var(--accent-lighter)' }}>✏️ جاري التحرير</span>
                              )}
                            </div>
                          </div>
                          {sel && isEditing && (
                            <div className="inline-price-inputs">
                              <div className="input-group">
                                <label className="input-label">من (ر.س/يوم)</label>
                                <input
                                  className="input"
                                  type="number"
                                  value={sel.rate_from}
                                  onChange={(e) => updateFieldPrice(sub.id, e.target.value, sel.rate_to)}
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
                                  value={sel.rate_to}
                                  onChange={(e) => updateFieldPrice(sub.id, sel.rate_from, e.target.value)}
                                  placeholder="2000"
                                  min="0"
                                  dir="ltr"
                                  style={{ fontFamily: 'var(--font-mono)' }}
                                />
                              </div>
                              <button
                                className="btn btn-primary"
                                onClick={() => setEditingFieldId(null)}
                                type="button"
                                disabled={!sel.rate_from || !sel.rate_to}
                                style={{ marginTop: 8 }}
                              >
                                ✓ تأكيد السعر
                              </button>
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

        {/* Selected fields summary */}
        {selectedFields.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <label className="input-label" style={{ marginBottom: 8 }}>
              المجالات المختارة ({selectedFields.length})
            </label>
            <div className="review-fields">
              {selectedFields.filter(f => f.rate_from && f.rate_to).map(f => (
                <span key={f.field_id} className="review-field-tag">
                  {f.field_name_ar} · {f.rate_from}-{f.rate_to} ر.س
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
