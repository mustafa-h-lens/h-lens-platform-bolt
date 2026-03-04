import { useTheme } from '../../contexts/ThemeContext';
import { getTheme } from '../../theme/tokens';
import { Loader2, CheckCircle, Save, Edit2, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// useVendorTheme hook
// ─────────────────────────────────────────────────────────────
export const useVT = () => {
  const { isDarkMode } = useTheme();
  return getTheme(isDarkMode);
};

// ─────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────
export function VCard({ children, style = {}, className = '' }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  const t = useVT();
  return (
    <div style={{ borderRadius: 14, background: t.background.card, border: `1px solid ${t.border.default}`, padding: '1.125rem', ...style }} className={className}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section title
// ─────────────────────────────────────────────────────────────
export function SectionTitle({ children }: { children: React.ReactNode }) {
  const t = useVT();
  return <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: t.text.primary, marginBottom: 14 }}>{children}</h3>;
}

// ─────────────────────────────────────────────────────────────
// Field label
// ─────────────────────────────────────────────────────────────
export function FL({ children, required }: { children: React.ReactNode; required?: boolean }) {
  const t = useVT();
  return (
    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: t.text.muted, marginBottom: 5 }}>
      {children}{required && <span style={{ color: t.status.error.main, marginRight: 3 }}>*</span>}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────
// Text input
// ─────────────────────────────────────────────────────────────
export function TInput({ value, onChange, placeholder, dir = 'rtl', type = 'text', disabled = false, error }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  dir?: 'rtl' | 'ltr'; type?: string; disabled?: boolean; error?: string;
}) {
  const t = useVT();
  return (
    <div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        type={type}
        disabled={disabled}
        style={{
          width: '100%', padding: '0.5625rem 0.75rem',
          borderRadius: 9, background: t.background.input,
          border: `1px solid ${error ? t.status.error.main : t.border.default}`,
          color: t.text.primary, fontFamily: 'Tajawal, sans-serif',
          fontSize: '0.83rem', outline: 'none', transition: 'border 0.2s',
          opacity: disabled ? 0.6 : 1, boxSizing: 'border-box',
        }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = t.primary.main; }}
        onBlur={e => { e.target.style.borderColor = error ? t.status.error.main : t.border.default; }}
      />
      {error && <div style={{ fontSize: '0.7rem', color: t.status.error.main, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Select
// ─────────────────────────────────────────────────────────────
export function TSelect({ value, onChange, children, disabled = false, error }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
  disabled?: boolean; error?: string;
}) {
  const t = useVT();
  return (
    <div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        dir="rtl"
        style={{
          width: '100%', padding: '0.5625rem 0.75rem',
          borderRadius: 9, background: t.background.input,
          border: `1px solid ${error ? t.status.error.main : t.border.default}`,
          color: t.text.primary, fontFamily: 'Tajawal, sans-serif',
          fontSize: '0.83rem', outline: 'none',
          opacity: disabled ? 0.6 : 1, boxSizing: 'border-box',
        }}
      >
        {children}
      </select>
      {error && <div style={{ fontSize: '0.7rem', color: t.status.error.main, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// View field (read-only display)
// ─────────────────────────────────────────────────────────────
export function VField({ label, value, dir = 'rtl' }: { label: string; value?: string | null; dir?: 'rtl' | 'ltr' }) {
  const t = useVT();
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: t.text.muted, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '0.875rem', color: value ? t.text.primary : t.text.muted, fontWeight: value ? 500 : 400 }} dir={dir}>
        {value || '—'}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Save button
// ─────────────────────────────────────────────────────────────
export function SaveBtn({ loading, saved, onClick, label = 'حفظ التغييرات' }: {
  loading: boolean; saved: boolean; onClick: () => void; label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '0.5625rem 1.25rem', borderRadius: 9,
        background: saved ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
        border: 'none', color: 'white',
        fontFamily: 'Tajawal, sans-serif', fontSize: '0.83rem',
        fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1, transition: 'all 0.25s',
        boxShadow: saved ? '0 3px 14px rgba(16,185,129,0.3)' : '0 3px 14px rgba(37,99,235,0.3)',
      }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : <Save size={16} />}
      {loading ? 'جارٍ الحفظ...' : saved ? 'تم الحفظ' : label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Edit / Cancel buttons
// ─────────────────────────────────────────────────────────────
export function EditBtn({ onClick, label = 'تعديل' }: { onClick: () => void; label?: string }) {
  const t = useVT();
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '7px 14px', borderRadius: 9,
      background: t.background.filter, border: `1px solid ${t.border.default}`,
      color: t.text.secondary, fontFamily: 'Tajawal, sans-serif',
      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
    }}>
      <Edit2 size={15} /> {label}
    </button>
  );
}

export function CancelBtn({ onClick }: { onClick: () => void }) {
  const t = useVT();
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '7px 14px', borderRadius: 9,
      background: 'transparent', border: `1px solid ${t.border.default}`,
      color: t.text.muted, fontFamily: 'Tajawal, sans-serif',
      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
    }}>
      <X size={15} /> إلغاء
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active:      { label: 'نشط',              color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  inactive:    { label: 'غير نشط',          color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  blocked:     { label: 'محظور',            color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  in_progress: { label: 'جارٍ',            color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  completed:   { label: 'مكتمل',           color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  cancelled:   { label: 'ملغي',            color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  pending:     { label: 'قيد الانتظار',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  paid:        { label: 'مدفوعة',          color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  partial:     { label: 'مدفوعة جزئياً',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  overdue:     { label: 'متأخرة',          color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  valid:       { label: 'سارية',           color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  expired:     { label: 'منتهية',          color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  expiring_soon:{ label: 'تنتهي قريباً',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 6,
      background: s.bg, color: s.color,
      fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────
export function Skeleton({ width = '100%', height = 18, style = {} }: { width?: string | number; height?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="animate-pulse"
      style={{ width, height, borderRadius: 6, background: 'rgba(148,163,184,0.15)', ...style }}
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  const t = useVT();
  return (
    <div style={{ borderRadius: 14, background: t.background.card, border: `1px solid ${t.border.default}`, padding: '1.125rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={16} width={i === 0 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  const t = useVT();
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ opacity: 0.25, color: t.text.muted }}>{icon}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: t.text.secondary }}>{title}</div>
      {subtitle && <div style={{ fontSize: '0.78rem', color: t.text.muted }}>{subtitle}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────
export function VModal({ open, onClose, title, children, width = 520 }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number;
}) {
  const t = useVT();
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: Math.min(width, window.innerWidth - 32),
        background: t.background.card, borderRadius: 16,
        border: `1px solid ${t.border.default}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        zIndex: 101, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: `1px solid ${t.border.default}`, flexShrink: 0 }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: t.text.primary }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.text.muted, display: 'flex', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '1.125rem', overflowY: 'auto' }}>{children}</div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab button
// ─────────────────────────────────────────────────────────────
export function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const t = useVT();
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
      fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem',
      fontWeight: active ? 700 : 400, transition: 'all 0.15s',
      background: active ? 'rgba(37,99,235,0.1)' : 'transparent',
      color: active ? t.primary.main : t.text.muted,
      borderBottom: active ? `2px solid ${t.primary.main}` : '2px solid transparent',
    }}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Grid helpers
// ─────────────────────────────────────────────────────────────
export function Grid2({ children, gap = 12 }: { children: React.ReactNode; gap?: number }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap }}>{children}</div>;
}

export function FormRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>;
}
