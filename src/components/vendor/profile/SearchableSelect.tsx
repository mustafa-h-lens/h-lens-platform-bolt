import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string; prefix?: string }[];
  placeholder: string;
  disabled?: boolean;
  compact?: boolean;
}

export function SearchableSelect({ value, onChange, items, placeholder, disabled, compact }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = items.filter(i => i.label.includes(search) || i.value.includes(search));
  const selected = items.find(i => i.value === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(!open)} className={`vp-inp${compact ? ' vp-inp-compact' : ''}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'right',
          padding: compact ? '9px 10px' : '9px 14px',
          width: compact ? 'auto' : '100%',
          borderRadius: compact ? '9px 0 0 9px' : 9,
          whiteSpace: 'nowrap', gap: 4, flexShrink: 0,
        }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: compact ? '.78rem' : undefined }}>
          {selected ? (
            compact ? (<>{selected.prefix && <span>{selected.prefix}</span>} <span style={{ direction: 'ltr' }}>{selected.value}</span></>) : (<>{selected.prefix && <span>{selected.prefix}</span>} {selected.label}</>)
          ) : (<span style={{ color: 'var(--textMut)' }}>{placeholder}</span>)}
        </span>
        {!disabled && <ChevronDown size={compact ? 12 : 14} style={{ color: 'var(--textMut)', flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', zIndex: 50, marginTop: 4, borderRadius: 10, background: 'var(--cardSolid, var(--card))', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.3)', maxHeight: 240, overflow: 'hidden', display: 'flex', flexDirection: 'column', ...(compact ? { left: 0, width: 'min(240px, 80vw)' } : { right: 0, left: 0 }) }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={14} style={{ color: 'var(--textMut)', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." autoFocus
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--textPri)', fontFamily: 'Cairo, sans-serif', fontSize: '.82rem' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 12, textAlign: 'center', fontSize: '.78rem', color: 'var(--textMut)' }}>لا توجد نتائج</div>
            ) : filtered.map(item => (
              <button key={item.value} onClick={() => { onChange(item.value); setOpen(false); setSearch(''); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: value === item.value ? 'var(--tagBg)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: '.82rem', color: value === item.value ? 'var(--tagC)' : 'var(--textPri)', fontWeight: value === item.value ? 700 : 400, textAlign: 'right', transition: 'background .12s' }}
                onMouseEnter={e => { if (value !== item.value) e.currentTarget.style.background = 'var(--rowHover)'; }}
                onMouseLeave={e => { if (value !== item.value) e.currentTarget.style.background = 'transparent'; }}>
                {item.prefix && <span style={{ fontSize: '1rem' }}>{item.prefix}</span>}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
