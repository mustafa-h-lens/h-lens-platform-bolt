import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabaseClient';
import { ChevronDown, ChevronRight, Plus, X, Check, Star, Briefcase } from 'lucide-react';

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
  const selectedFieldsRef = useRef<HTMLDivElement>(null);

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

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addField = (field: VendorField) => {
    if (selectedFields.some(f => f.field_id === field.id)) return;
    updateSelectedFields([...selectedFields, {
      field_id: field.id, field_name_ar: field.name_ar, field_name_en: field.name_en,
      rate_from: '', rate_to: '',
    }]);
  };

  const removeField = (id: string) => {
    updateSelectedFields(selectedFields.filter(f => f.field_id !== id));
  };

  const updateRate = (id: string, key: 'rate_from' | 'rate_to', val: string) => {
    updateSelectedFields(selectedFields.map(f => f.field_id === id ? { ...f, [key]: val.replace(/\D/g, '') } : f));
  };

  const mainField = selectedFields[0];
  const secondaryFields = selectedFields.slice(1);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48, color: 'var(--vr-text-secondary)', fontFamily: "'Cairo', sans-serif" }}>جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--vr-text-primary)' }}>مجالات العمل والأسعار</h2>
        <p style={{ color: 'var(--vr-text-secondary)' }}>اختر مجالك الأساسي ثم أضف مجالات فرعية أخرى مع تحديد نطاق الأسعار</p>
      </motion.div>

      {/* ── SELECTED FIELDS ── */}
      {selectedFields.length > 0 && (
        <motion.div ref={selectedFieldsRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          {/* Main service */}
          {mainField && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Star size={16} style={{ color: 'var(--vr-warning-text)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--vr-warning-text)' }}>الخدمة الأساسية</span>
              </div>
              <FieldCard field={mainField} isMain onRemove={() => removeField(mainField.field_id)} onUpdateRate={updateRate} />
            </div>
          )}

          {/* Secondary services */}
          {secondaryFields.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Briefcase size={16} style={{ color: 'var(--vr-accent-lighter)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--vr-accent-lighter)' }}>خدمات إضافية</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {secondaryFields.map((field, i) => (
                  <FieldCard key={field.field_id} field={field} onRemove={() => removeField(field.field_id)} onUpdateRate={updateRate} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── AVAILABLE CATEGORIES ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--vr-text-primary)', marginBottom: 12 }}>
          {selectedFields.length === 0 ? 'اختر خدمتك الأساسية' : 'إضافة خدمات أخرى'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categories.map(cat => {
            const selectedCount = (cat.subcategories || []).filter(s => selectedFields.some(f => f.field_id === s.id)).length;
            const isExpanded = expandedCategories.has(cat.id);
            return (
              <div key={cat.id} style={{
                borderRadius: 14, overflow: 'hidden',
                border: '1px solid var(--vr-border-soft)',
                background: 'var(--vr-bg-card)',
              }}>
                {/* Category header */}
                <div
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                >
                  {isExpanded ? <ChevronDown size={18} style={{ color: 'var(--vr-text-secondary)' }} /> : <ChevronRight size={18} style={{ color: 'var(--vr-text-secondary)' }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--vr-text-primary)' }}>{cat.name_ar}</div>
                    {cat.name_en && <div style={{ fontSize: 12, color: 'var(--vr-text-muted)' }}>{cat.name_en}</div>}
                  </div>
                  {selectedCount > 0 && (
                    <span style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--vr-accent-glow-md)', color: 'var(--vr-accent-lighter)', fontSize: 11, fontWeight: 700 }}>
                      {selectedCount}
                    </span>
                  )}
                </div>

                {/* Subcategories */}
                <AnimatePresence>
                  {isExpanded && cat.subcategories && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {cat.subcategories.map(sub => {
                          const isSel = selectedFields.some(f => f.field_id === sub.id);
                          return (
                            <motion.div
                              key={sub.id}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => !isSel && addField(sub)}
                              style={{
                                padding: '10px 14px', borderRadius: 10,
                                border: `1.5px solid ${isSel ? 'var(--vr-success-border)' : 'var(--vr-border-subtle)'}`,
                                background: isSel ? 'var(--vr-success-bg)' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: isSel ? 'default' : 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: isSel ? 'var(--vr-success-text)' : 'var(--vr-text-primary)' }}>{sub.name_ar}</div>
                                {sub.name_en && <div style={{ fontSize: 11, color: 'var(--vr-text-muted)' }}>{sub.name_en}</div>}
                              </div>
                              {isSel ? (
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--vr-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Check size={14} style={{ color: 'white' }} strokeWidth={3} />
                                </div>
                              ) : (
                                <Plus size={18} style={{ color: 'var(--vr-accent-lighter)' }} />
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

// ── Field Card Component ──
function FieldCard({ field, isMain, onRemove, onUpdateRate }: {
  field: SelectedField; isMain?: boolean;
  onRemove: () => void;
  onUpdateRate: (id: string, key: 'rate_from' | 'rate_to', val: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        padding: 16, borderRadius: 14,
        border: `1.5px solid ${isMain ? 'var(--vr-warning-border)' : 'var(--vr-border-soft)'}`,
        background: isMain ? 'var(--vr-warning-bg)' : 'var(--vr-bg-card)',
        position: 'relative',
      }}
    >
      {/* Remove button */}
      <button onClick={onRemove} style={{
        position: 'absolute', top: 10, left: 10,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--vr-error-text)', padding: 4, borderRadius: 6,
        display: 'flex', transition: 'background 0.15s',
      }}>
        <X size={16} />
      </button>

      {/* Field info */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: isMain ? 'var(--vr-warning-text)' : 'var(--vr-text-primary)' }}>
          {field.field_name_ar}
        </div>
        {field.field_name_en && (
          <div style={{ fontSize: 12, color: 'var(--vr-text-muted)', marginTop: 2 }}>{field.field_name_en}</div>
        )}
      </div>

      {/* Price range */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--vr-text-muted)', marginBottom: 4, display: 'block' }}>من (SAR)</label>
          <input
            type="text"
            inputMode="numeric"
            value={field.rate_from}
            onChange={(e) => onUpdateRate(field.field_id, 'rate_from', e.target.value)}
            placeholder="0"
            className="vr-input"
            dir="ltr"
            style={{ textAlign: 'center', height: 40, fontSize: 15, fontWeight: 700 }}
          />
        </div>
        <div style={{ color: 'var(--vr-text-muted)', fontSize: 16, fontWeight: 700, paddingBottom: 10 }}>—</div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--vr-text-muted)', marginBottom: 4, display: 'block' }}>إلى (SAR)</label>
          <input
            type="text"
            inputMode="numeric"
            value={field.rate_to}
            onChange={(e) => onUpdateRate(field.field_id, 'rate_to', e.target.value)}
            placeholder="0"
            className="vr-input"
            dir="ltr"
            style={{ textAlign: 'center', height: 40, fontSize: 15, fontWeight: 700 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
