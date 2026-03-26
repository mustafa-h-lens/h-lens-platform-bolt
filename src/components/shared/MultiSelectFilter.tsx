import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface MultiSelectFilterProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function MultiSelectFilter({ label, options, selected, onToggle }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        type="button"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 12px', borderRadius: 'var(--radius-md, 8px)',
          border: `1px solid ${selected.length > 0 ? 'var(--accent, #2563eb)' : 'var(--border-soft, #334155)'}`,
          background: selected.length > 0 ? 'var(--accent, #2563eb)' : 'var(--bg-surface, #0f172a)',
          color: selected.length > 0 ? '#fff' : 'var(--text-primary, #e2e8f0)',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          transition: 'all 0.15s', fontFamily: 'inherit',
        }}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 20, height: 20, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)', color: '#fff',
            fontSize: 11, fontWeight: 700,
          }}>
            {selected.length}
          </span>
        )}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          minWidth: 200, maxHeight: 280, zIndex: 60,
          background: 'var(--bg-elevated, #1e293b)',
          border: '1px solid var(--border-soft, #334155)',
          borderRadius: 'var(--radius-md, 8px)',
          boxShadow: 'var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.3))',
          overflow: 'hidden',
        }}>
          {options.length > 0 && (
            <div style={{ padding: 8, borderBottom: '1px solid var(--border-subtle, #1e293b)' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث..."
                style={{
                  width: '100%', padding: '6px 10px', borderRadius: 6,
                  border: '1px solid var(--border-soft, #334155)',
                  background: 'var(--bg-surface, #0f172a)',
                  color: 'var(--text-primary, #e2e8f0)',
                  fontSize: 12, outline: 'none', fontFamily: 'inherit',
                }}
                autoFocus
              />
            </div>
          )}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => onToggle(opt.value)}
                  type="button"
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', fontSize: 13, textAlign: 'right',
                    color: 'var(--text-primary, #e2e8f0)',
                    background: isSelected ? 'rgba(37,99,235,0.08)' : 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover, rgba(255,255,255,0.03))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'rgba(37,99,235,0.08)' : 'transparent'; }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    border: `1.5px solid ${isSelected ? 'var(--accent, #2563eb)' : 'var(--border-soft, #475569)'}`,
                    background: isSelected ? 'var(--accent, #2563eb)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ flex: 1 }}>{opt.label}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
                لا توجد نتائج
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
