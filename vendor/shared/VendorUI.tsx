import { useTheme } from '../../../contexts/ThemeContext';
import { getTheme } from '../../../theme/tokens';
import { Edit2, X, Save, Loader2, CheckCircle } from 'lucide-react';
import { useState } from 'react';

// ─── Page section card ────────────────────────────────────────
export const VCard = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  return (
    <div style={{
      background: theme.background.card,
      border: `1px solid ${theme.border.default}`,
      borderRadius: 14, padding: '20px', ...style,
    }}>
      {children}
    </div>
  );
};

// ─── Page title (no header duplication) ─────────────────────
export const PageTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: theme.text.primary, margin: 0 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: '0.8rem', color: theme.text.muted, marginTop: 4 }}>{subtitle}</p>}
    </div>
  );
};

// ─── View/Edit toggle header ─────────────────────────────────
interface ViewEditBarProps {
  title: string;
  isEditing: boolean;
  saving?: boolean;
  saved?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}
export const ViewEditBar = ({ title, isEditing, saving, saved, onEdit, onCancel, onSave }: ViewEditBarProps) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: theme.text.primary, margin: 0 }}>{title}</h2>
      <div style={{ display: 'flex', gap: 8 }}>
        {isEditing ? (
          <>
            <button
              onClick={onCancel}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                background: theme.background.filter,
                border: `1px solid ${theme.border.default}`,
                color: theme.text.secondary, fontFamily: 'Tajawal, sans-serif',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <X size={14} /> إلغاء
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                background: saved
                  ? 'linear-gradient(135deg,#059669,#10b981)'
                  : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                border: 'none', color: 'white',
                fontFamily: 'Tajawal, sans-serif', fontSize: '0.8rem',
                fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1, transition: 'all 0.2s',
                boxShadow: '0 2px 10px rgba(37,99,235,0.3)',
              }}
            >
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> جارٍ الحفظ...</>
                : saved
                  ? <><CheckCircle size={14} /> تم الحفظ</>
                  : <><Save size={14} /> حفظ</>
              }
            </button>
          </>
        ) : (
          <button
            onClick={onEdit}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8,
              background: theme.background.filter,
              border: `1px solid ${theme.border.default}`,
              color: theme.text.secondary, fontFamily: 'Tajawal, sans-serif',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as any).style.borderColor = '#3b82f6'; (e.currentTarget as any).style.color = '#2563eb'; }}
            onMouseLeave={e => { (e.currentTarget as any).style.borderColor = theme.border.default; (e.currentTarget as any).style.color = theme.text.secondary; }}
          >
            <Edit2 size={14} /> تعديل
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Tab bar ─────────────────────────────────────────────────
interface TabBarProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}
export const TabBar = ({ tabs, active, onChange }: TabBarProps) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${theme.border.default}`, marginBottom: 20 }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer',
            fontFamily: 'Tajawal, sans-serif', fontSize: '0.84rem',
            fontWeight: active === tab.id ? 700 : 400,
            color: active === tab.id ? theme.primary.main : theme.text.muted,
            background: 'transparent',
            borderBottom: active === tab.id ? `2px solid ${theme.primary.main}` : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// ─── Field label + value (view mode) ─────────────────────────
export const FieldView = ({ label, value, dir = 'rtl' }: { label: string; value?: string | null; dir?: string }) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  return (
    <div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: theme.text.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '0.88rem', color: theme.text.primary, direction: dir as any }}>
        {value || <span style={{ color: theme.text.muted, fontStyle: 'italic' }}>—</span>}
      </div>
    </div>
  );
};

// ─── Field label + input (edit mode) ─────────────────────────
export const FieldInput = ({ label, value, onChange, placeholder, dir = 'rtl', type = 'text', disabled = false }: any) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: theme.text.muted, marginBottom: 5 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        dir={dir}
        disabled={disabled}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 9,
          background: theme.background.input,
          border: `1px solid ${focused ? theme.primary.main : theme.border.default}`,
          boxShadow: focused ? `0 0 0 3px ${theme.primary.light}22` : 'none',
          color: theme.text.primary, fontFamily: 'Tajawal, sans-serif',
          fontSize: '0.85rem', outline: 'none', transition: 'all 0.2s',
          opacity: disabled ? 0.6 : 1,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
};

// ─── Select input ─────────────────────────────────────────────
export const FieldSelect = ({ label, value, onChange, children, disabled = false }: any) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: theme.text.muted, marginBottom: 5 }}>
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        dir="rtl"
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 9,
          background: theme.background.input,
          border: `1px solid ${theme.border.default}`,
          color: theme.text.primary, fontFamily: 'Tajawal, sans-serif',
          fontSize: '0.85rem', outline: 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {children}
      </select>
    </div>
  );
};

// ─── Status badge ─────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active:      { label: 'نشط',           color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  in_progress: { label: 'قيد التنفيذ',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  completed:   { label: 'مكتمل',          color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  cancelled:   { label: 'ملغي',           color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  pending:     { label: 'قيد الانتظار',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  paid:        { label: 'مدفوعة',         color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  partial:     { label: 'جزئية',          color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  overdue:     { label: 'متأخرة',         color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  request:     { label: 'طلب جديد',       color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  quoted:      { label: 'عرض سعر',        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  invoiced:    { label: 'فاتورة',         color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
};

export const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_MAP[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 6,
      background: s.bg, color: s.color,
      fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
};

// ─── Skeleton loader ─────────────────────────────────────────
export const Skeleton = ({ h = 20, w = '100%', radius = 6 }: { h?: number; w?: number | string; radius?: number }) => (
  <div style={{
    height: h, width: w, borderRadius: radius,
    background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
  }} />
);

// ─── Empty state ─────────────────────────────────────────────
export const EmptyState = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.text.muted }}>
      <div style={{ opacity: 0.3, marginBottom: 12, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: theme.text.secondary, marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: '0.78rem' }}>{subtitle}</div>}
    </div>
  );
};

// ─── Primary button ───────────────────────────────────────────
export const PrimaryBtn = ({ onClick, children, disabled, loading: isLoading, variant = 'blue', style = {} }: any) => {
  const bg = variant === 'green'
    ? 'linear-gradient(135deg,#059669,#10b981)'
    : variant === 'red'
      ? 'linear-gradient(135deg,#dc2626,#ef4444)'
      : 'linear-gradient(135deg,#1d4ed8,#2563eb)';
  const shadow = variant === 'green'
    ? '0 3px 12px rgba(16,185,129,0.3)'
    : variant === 'red'
      ? '0 3px 12px rgba(239,68,68,0.3)'
      : '0 3px 12px rgba(37,99,235,0.3)';

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '8px 16px', borderRadius: 9,
        background: bg, border: 'none', color: 'white',
        fontFamily: 'Tajawal, sans-serif', fontSize: '0.83rem', fontWeight: 700,
        cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || isLoading) ? 0.7 : 1,
        boxShadow: shadow, transition: 'all 0.2s', ...style,
      }}
    >
      {isLoading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
};

// ─── Global shimmer style (inject once) ──────────────────────
if (typeof document !== 'undefined' && !document.getElementById('vp-shimmer')) {
  const s = document.createElement('style');
  s.id = 'vp-shimmer';
  s.textContent = `
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    .animate-spin { animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(s);
}
