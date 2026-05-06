import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { normalizeArabic } from '../../../utils/arabicNormalize';

interface CatalogItem {
  id: string;
  name: string;
  name_en: string | null;
  image_url: string | null;
  category_id: string | null;
  brand_id: string | null;
  equipment_categories?: { name: string } | null;
  equipment_brands?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  selectedIds: string[];
  customNames: string[];
  updateSelectedIds: (ids: string[]) => void;
  updateCustomNames: (names: string[]) => void;
}

const Step7Equipment = ({ selectedIds, customNames, updateSelectedIds, updateCustomNames }: Props) => {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>('');
  const [customDraft, setCustomDraft] = useState(() => customNames.join('\n'));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: cat }, { data: cats }] = await Promise.all([
          supabase
            .from('equipment_catalog')
            .select('id, name, name_en, image_url, category_id, brand_id, equipment_categories(name), equipment_brands(name)')
            .eq('is_active', true)
            .order('name'),
          supabase
            .from('equipment_categories')
            .select('id, name')
            .eq('is_active', true)
            .order('name'),
        ]);
        if (!alive) return;
        setCatalog((cat ?? []) as any);
        setCategories((cats ?? []) as any);
      } catch (err) {
        console.error('Step7Equipment: catalog load failed', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Keep parent customNames in sync when the draft text changes (split per line, trim, dedupe)
  useEffect(() => {
    const lines = customDraft
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    // Drop dupes case-insensitively, keep first occurrence
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const l of lines) {
      const key = normalizeArabic(l);
      if (!seen.has(key)) { seen.add(key); deduped.push(l); }
    }
    if (deduped.join('\n') !== customNames.join('\n')) {
      updateCustomNames(deduped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDraft]);

  const selectedNorms = useMemo(() => {
    const set = new Set<string>();
    for (const id of selectedIds) {
      const it = catalog.find(c => c.id === id);
      if (it) set.add(normalizeArabic(it.name));
    }
    return set;
  }, [selectedIds, catalog]);

  const customsClashingWithCatalog = useMemo(() => {
    return customNames.filter(n => selectedNorms.has(normalizeArabic(n)));
  }, [customNames, selectedNorms]);

  const filteredCatalog = useMemo(() => {
    const q = normalizeArabic(search);
    return catalog.filter(it => {
      if (activeCat && it.category_id !== activeCat) return false;
      if (!q) return true;
      const hay = normalizeArabic(`${it.name} ${it.name_en ?? ''}`);
      return hay.includes(q);
    });
  }, [catalog, search, activeCat]);

  const toggleItem = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id];
    updateSelectedIds(next);
  };

  if (loading) {
    return (
      <>
        <h2 className="step-title">🎥 المعدات</h2>
        <p className="step-subtitle">جاري تحميل قائمة المعدات...</p>
        <div className="page-loading-placeholder" />
      </>
    );
  }

  return (
    <>
      <h2 className="step-title">🎥 المعدات</h2>
      <p className="step-subtitle">
        اختر المعدات التي تملكها. إذا كانت عندك معدّات لم تجدها في القائمة،
        اكتب أسماءها في الخانة بالأسفل وسيقوم المسؤول بإضافتها لاحقاً.
      </p>

      <div className="form-section">
        {/* Search */}
        <div className="input-group" style={{ marginBottom: 10 }}>
          <input
            className="input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالعربي أو الإنجليزي..."
          />
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setActiveCat('')}
              className={`subfield-chip ${activeCat === '' ? 'selected' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              الكل
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.id === activeCat ? '' : c.id)}
                className={`subfield-chip ${activeCat === c.id ? 'selected' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Selected count */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderRadius: 10,
          background: 'var(--accent-glow)', border: '1px solid var(--accent-glow-md)',
          fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12,
        }}>
          <span>المعدات المختارة: <strong style={{ color: 'var(--text-primary)' }}>{selectedIds.length}</strong></span>
          {customNames.length > 0 && (
            <span>معدات أخرى: <strong style={{ color: 'var(--text-primary)' }}>{customNames.length}</strong></span>
          )}
        </div>

        {/* Items grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 10,
          maxHeight: 480,
          overflowY: 'auto',
          padding: 4,
        }}>
          {filteredCatalog.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              لا توجد معدات تطابق البحث. اكتبها في خانة "معدات أخرى" بالأسفل.
            </div>
          )}
          {filteredCatalog.map(it => {
            const sel = selectedIds.includes(it.id);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => toggleItem(it.id)}
                className="reg-equip-card"
                aria-pressed={sel}
                style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'stretch',
                  padding: 10, borderRadius: 12,
                  background: sel ? 'rgba(59,130,246,0.10)' : 'var(--bg-surface)',
                  border: `1.5px solid ${sel ? 'rgba(59,130,246,0.65)' : 'var(--border-soft)'}`,
                  cursor: 'pointer',
                  textAlign: 'right',
                  transition: 'border-color 0.18s, background 0.18s, transform 0.18s',
                  fontFamily: 'inherit',
                }}
              >
                {sel && (
                  <span style={{
                    position: 'absolute', top: 6, left: 6,
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#3b82f6', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                  }}>✓</span>
                )}
                <div style={{
                  width: '100%', aspectRatio: '4 / 3',
                  borderRadius: 8, background: 'rgba(148,163,184,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 8, overflow: 'hidden',
                }}>
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: 22, opacity: 0.4 }}>📷</span>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {it.name}
                </div>
                {it.equipment_brands?.name && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {it.equipment_brands.name}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Free-text "other equipment" */}
        <div className="input-group" style={{ marginTop: 18 }}>
          <label className="input-label">📝 معدات أخرى (غير موجودة في القائمة)</label>
          <textarea
            className="input"
            rows={4}
            value={customDraft}
            onChange={e => setCustomDraft(e.target.value)}
            placeholder={'اكتب اسم كل معدة في سطر منفصل\nمثال:\nسوني A7S III\nزووم H6'}
            style={{ resize: 'vertical', minHeight: 96, fontFamily: 'inherit' }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            اكتب اسم كل معدة في سطر مستقل. سيراها المسؤول ويضيفها لكتالوج النظام.
          </div>

          {customNames.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {customNames.map(n => {
                const dup = selectedNorms.has(normalizeArabic(n));
                return (
                  <span
                    key={n}
                    style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: 12,
                      background: dup ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.10)',
                      color: dup ? '#f59e0b' : 'var(--accent-lighter)',
                      border: `1px solid ${dup ? 'rgba(245,158,11,0.35)' : 'rgba(59,130,246,0.35)'}`,
                      fontWeight: 600,
                    }}
                    title={dup ? 'هذه المعدة مختارة مسبقاً من القائمة' : ''}
                  >
                    {dup ? '⚠ ' : '+ '}{n}
                  </span>
                );
              })}
            </div>
          )}

          {customsClashingWithCatalog.length > 0 && (
            <div style={{
              marginTop: 8, padding: '8px 12px', borderRadius: 10,
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
              fontSize: 11.5, color: '#f59e0b',
            }}>
              تنبيه: بعض المعدات التي كتبتها موجودة بالفعل في القائمة وتم اختيارها — لتجنب التكرار، احذفها من النص.
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Step7Equipment;
