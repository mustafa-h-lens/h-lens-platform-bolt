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
}

interface Category { id: string; name: string; }
interface Brand    { id: string; name: string; }

interface Props {
  selectedIds: string[];
  customNames: string[];
  updateSelectedIds: (ids: string[]) => void;
  updateCustomNames: (names: string[]) => void;
}

const Step7Equipment = ({ selectedIds, customNames, updateSelectedIds, updateCustomNames }: Props) => {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Cascading picker state
  const [selCategory, setSelCategory] = useState('');
  const [selBrand, setSelBrand] = useState('');
  const [selItem, setSelItem] = useState('');

  // Free-text textarea
  const [customDraft, setCustomDraft] = useState(() => customNames.join('\n'));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: cat }, { data: cats }, { data: brs }] = await Promise.all([
          supabase
            .from('equipment_catalog')
            .select('id, name, name_en, image_url, category_id, brand_id')
            .eq('is_active', true)
            .order('name'),
          supabase.from('equipment_categories').select('id, name').eq('is_active', true).order('name'),
          supabase.from('equipment_brands').select('id, name').eq('is_active', true).order('name'),
        ]);
        if (!alive) return;
        setCatalog((cat ?? []) as any);
        setCategories((cats ?? []) as any);
        setBrands((brs ?? []) as any);
      } catch (err) {
        console.error('Step7Equipment: catalog load failed', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Sync free-text textarea → parent customNames
  useEffect(() => {
    const lines = customDraft.split('\n').map(s => s.trim()).filter(Boolean);
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const l of lines) {
      const key = normalizeArabic(l);
      if (!seen.has(key)) { seen.add(key); deduped.push(l); }
    }
    if (deduped.join('\n') !== customNames.join('\n')) updateCustomNames(deduped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDraft]);

  // Brands available for the chosen category (only brands that actually have items in that category)
  const filteredBrands = useMemo(() => {
    if (!selCategory) return brands;
    const idsWithCat = new Set(catalog.filter(c => c.category_id === selCategory).map(c => c.brand_id).filter(Boolean) as string[]);
    return brands.filter(b => idsWithCat.has(b.id));
  }, [selCategory, brands, catalog]);

  // Items in chosen category + brand, excluding ones already selected
  const filteredItems = useMemo(() => {
    return catalog.filter(c => {
      if (selCategory && c.category_id !== selCategory) return false;
      if (selBrand && c.brand_id !== selBrand) return false;
      if (selectedIds.includes(c.id)) return false;
      return true;
    });
  }, [catalog, selCategory, selBrand, selectedIds]);

  // The currently-selected items, hydrated for the chips list
  const selectedItems = useMemo(() => {
    return selectedIds.map(id => catalog.find(c => c.id === id)).filter(Boolean) as CatalogItem[];
  }, [selectedIds, catalog]);

  const selectedNorms = useMemo(() => {
    const set = new Set<string>();
    for (const it of selectedItems) set.add(normalizeArabic(it.name));
    return set;
  }, [selectedItems]);

  const addItem = () => {
    if (!selItem) return;
    if (!selectedIds.includes(selItem)) {
      updateSelectedIds([...selectedIds, selItem]);
    }
    setSelItem('');
  };

  const removeItem = (id: string) => {
    updateSelectedIds(selectedIds.filter(x => x !== id));
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

  const catName = (id: string | null | undefined) => categories.find(c => c.id === id)?.name ?? '';
  const brandName = (id: string | null | undefined) => brands.find(b => b.id === id)?.name ?? '';

  return (
    <>
      <h2 className="step-title">🎥 المعدات</h2>
      <p className="step-subtitle">
        اختر المعدات التي تملكها من القائمة. إذا كانت عندك معدّات لم تجدها،
        اكتب أسماءها في الخانة بالأسفل وسيقوم المسؤول بإضافتها لاحقاً.
      </p>

      <div className="form-section">
        {/* Selected counter */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderRadius: 12, marginBottom: 16,
          background: 'var(--accent-glow)', border: '1px solid var(--accent-glow-md)',
          fontSize: 13, color: 'var(--text-secondary)',
        }}>
          <span>المعدات المختارة: <strong style={{ color: 'var(--text-primary)' }}>{selectedItems.length}</strong></span>
          {customNames.length > 0 && (
            <span>معدات أخرى: <strong style={{ color: 'var(--text-primary)' }}>{customNames.length}</strong></span>
          )}
        </div>

        {/* Cascading picker */}
        <div style={{
          padding: 16, borderRadius: 14,
          background: 'var(--bg-surface)', border: '1px solid var(--border-soft)',
          marginBottom: 18,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
            اختر من كتالوج المعدات
          </div>

          {/* Step 1: Category */}
          <div className="input-group" style={{ marginBottom: 12 }}>
            <label className="input-label">1. التصنيف <span className="req">*</span></label>
            <select
              className="input"
              value={selCategory}
              onChange={e => { setSelCategory(e.target.value); setSelBrand(''); setSelItem(''); }}
            >
              <option value="">اختر التصنيف</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Step 2: Brand — only after category */}
          {selCategory && (
            <div className="input-group" style={{ marginBottom: 12 }}>
              <label className="input-label">2. العلامة التجارية</label>
              <select
                className="input"
                value={selBrand}
                onChange={e => { setSelBrand(e.target.value); setSelItem(''); }}
              >
                <option value="">اختر العلامة التجارية</option>
                {filteredBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {filteredBrands.length === 0 && (
                <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                  لا توجد علامات تجارية متاحة في هذا التصنيف
                </div>
              )}
            </div>
          )}

          {/* Step 3: Item — only after brand */}
          {selBrand && (
            <div className="input-group" style={{ marginBottom: 12 }}>
              <label className="input-label">3. المعدة ({filteredItems.length} متاح)</label>
              <select
                className="input"
                value={selItem}
                onChange={e => setSelItem(e.target.value)}
              >
                <option value="">اختر المعدة</option>
                {filteredItems.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {filteredItems.length === 0 && (
                <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                  لا توجد معدات متاحة في هذا التصنيف والعلامة التجارية. اكتبها بالأسفل.
                </div>
              )}
            </div>
          )}

          {/* Add button */}
          {selItem && (
            <button
              type="button"
              onClick={addItem}
              className="btn"
              style={{
                width: '100%', padding: '10px 16px', borderRadius: 10,
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: '#fff', border: 'none',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ✓ إضافة المعدة إلى قائمتي
            </button>
          )}
        </div>

        {/* Selected items list */}
        {selectedItems.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
              قائمتك ({selectedItems.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedItems.map(it => (
                <div
                  key={it.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    background: 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.30)',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'rgba(148,163,184,0.10)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0,
                  }}>
                    {it.image_url ? (
                      <img src={it.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : <span style={{ fontSize: 16, opacity: 0.4 }}>📷</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 6 }}>
                      {catName(it.category_id) && <span>{catName(it.category_id)}</span>}
                      {brandName(it.brand_id) && <span>· {brandName(it.brand_id)}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'rgba(239,68,68,0.10)', color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.25)',
                      cursor: 'pointer', fontSize: 14, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    aria-label="حذف"
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Free-text "other equipment" */}
        <div className="input-group" style={{ marginTop: 8 }}>
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
        </div>
      </div>
    </>
  );
};

export default Step7Equipment;
