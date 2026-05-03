import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Check, Plus } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useNotification } from '../../../../contexts/NotificationContext';
import { Modal } from '../../../shared/Modal';

interface CatalogRow {
  id: string;
  name: string;
  name_en: string | null;
  category_id: string | null;
  equipment_categories?: { name: string } | null;
}

interface ChipState {
  raw: string;
  normalized: string;
  matched: CatalogRow | null;
}

interface Props {
  vendorId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[ً-ْ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\s\-_/]+/g, ' ');
}

export const SmartEquipmentPaste = ({ vendorId, isOpen, onClose, onSaved }: Props) => {
  const { showSuccess, showError } = useNotification();
  const [text, setText] = useState('');
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setText('');
    (async () => {
      const { data, error } = await supabase
        .from('equipment_catalog')
        .select('id, name, name_en, category_id, equipment_categories(name)')
        .eq('is_active', true);
      if (error) {
        console.error('Smart paste catalog load failed', error);
        return;
      }
      setCatalog(((data || []) as unknown) as CatalogRow[]);
    })();
  }, [isOpen]);

  const catalogIndex = useMemo(() => {
    const m = new Map<string, CatalogRow>();
    catalog.forEach(c => {
      const a = normalize(c.name);
      if (a) m.set(a, c);
      if (c.name_en) {
        const b = normalize(c.name_en);
        if (b && !m.has(b)) m.set(b, c);
      }
    });
    return m;
  }, [catalog]);

  const chips: ChipState[] = useMemo(() => {
    const lines = text
      .split(/[\n,،;]/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
    const seen = new Set<string>();
    const out: ChipState[] = [];
    for (const raw of lines) {
      const n = normalize(raw);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push({ raw, normalized: n, matched: catalogIndex.get(n) || null });
    }
    return out;
  }, [text, catalogIndex]);

  const matchedCount = chips.filter(c => c.matched).length;
  const newCount = chips.length - matchedCount;

  const handleSave = async () => {
    if (chips.length === 0) {
      showError('أدخل أسماء المعدات أولاً');
      return;
    }
    setBusy(true);
    try {
      const newChips = chips.filter(c => !c.matched);
      const createdByNormalized: Record<string, CatalogRow> = {};

      if (newChips.length > 0) {
        const rows = newChips.map(c => ({
          name: c.raw.trim(),
          is_active: true,
        }));
        const { data: created, error: cErr } = await supabase
          .from('equipment_catalog')
          .insert(rows)
          .select('id, name, name_en, category_id');
        if (cErr) throw cErr;
        (created || []).forEach((c: any) => {
          createdByNormalized[normalize(c.name)] = c as CatalogRow;
        });
      }

      const veRows = chips.map(c => {
        const cat = c.matched || createdByNormalized[c.normalized] || null;
        return {
          vendor_id: vendorId,
          catalog_item_id: cat?.id || null,
          name: cat?.name || c.raw.trim(),
          type: cat?.equipment_categories?.name || '',
          quantity: 1,
          condition: 'good',
        };
      });

      const { error: veErr } = await supabase.from('vendor_equipment').insert(veRows);
      if (veErr) throw veErr;

      showSuccess(
        newCount > 0
          ? `تم إضافة ${chips.length} معدة (${newCount} جديدة في الكتالوج)`
          : `تم إضافة ${chips.length} معدة`,
      );
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Smart paste save failed', err);
      showError(err?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="اللصق الذكي للمعدات">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div style={{
          background: 'var(--bg-overlay)',
          border: '1px solid var(--border-soft)',
          borderRadius: 12,
          padding: 12,
          fontSize: 12,
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <Sparkles size={16} style={{ color: 'var(--accent-lighter)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ lineHeight: 1.7 }}>
            ضع اسم كل معدة في سطر منفصل (أو افصل بينها بفواصل). نطابق الأسماء مع الكتالوج تلقائياً،
            والأسماء غير الموجودة تُضاف للكتالوج وتُربط بالمورد مباشرة.
          </div>
        </div>

        <textarea
          className="input"
          rows={8}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={'Sony A7 IV\nCanon EOS R5\nAputure 600D\nDJI RS3 Pro'}
          dir="auto"
          style={{ fontFamily: 'monospace', resize: 'vertical', minHeight: 160, lineHeight: 1.6 }}
          disabled={busy}
        />

        {chips.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              {chips.length} معدة — {matchedCount} في الكتالوج، {newCount} ستُضاف
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 180, overflowY: 'auto', paddingBottom: 4 }}>
              {chips.map((c, i) => {
                const isMatch = !!c.matched;
                return (
                  <span
                    key={i}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: isMatch ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                      border: `1px solid ${isMatch ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}`,
                      color: isMatch ? '#34d399' : '#fbbf24',
                    }}
                    title={isMatch ? `مطابقة: ${c.matched!.name}` : 'سيُضاف للكتالوج'}
                  >
                    {isMatch ? <Check size={11} /> : <Plus size={11} />}
                    {isMatch ? c.matched!.name : c.raw}
                    {!isMatch && <span style={{ fontSize: 10, opacity: 0.85, marginInlineStart: 2 }}>جديد</span>}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            إلغاء
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleSave}
            disabled={busy || chips.length === 0}
            style={{ gap: 6 }}
          >
            <Sparkles size={13} />
            {busy ? 'جاري الحفظ…' : `حفظ ${chips.length || ''}`}
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default SmartEquipmentPaste;
