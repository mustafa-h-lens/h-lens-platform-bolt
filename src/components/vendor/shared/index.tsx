import React from 'react';
import { Save, Loader2, CheckCircle } from 'lucide-react';
import { STATUS_LABELS } from './types';
export { Pagination } from './Pagination';

export function PageCard({ children, style = {}, className = '' }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={`vp-card ${className}`} style={{ padding: '18px 20px', ...style }}>
      {children}
    </div>
  );
}

export function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`vp-tab${active ? ' active' : ''}`}>
      {children}
    </button>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
  return (
    <span className="vp-badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export function FieldLabel({ icon: Icon, children }: { icon?: React.ComponentType<{ size?: number }>; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.77rem', fontWeight: 600, color: 'var(--textSec)', marginBottom: 5 }}>
      {Icon && <Icon size={13} />}
      {children}
    </label>
  );
}

export function TextInput({ value, onChange, placeholder, dir = 'rtl', type = 'text', disabled = false, style = {} }: any) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      dir={dir}
      type={type}
      disabled={disabled}
      className="vp-inp"
      style={style}
    />
  );
}

export function SelectInput({ value, onChange, children, disabled = false }: any) {
  return (
    <select value={value} onChange={onChange} disabled={disabled} dir="rtl" className="vp-select">
      {children}
    </select>
  );
}

export function SaveButton({ loading, saved, onClick, label = 'حفظ التغييرات' }: any) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="vp-btn-primary"
      style={{
        background: saved ? 'linear-gradient(135deg,#059669,#10b981)' : undefined,
        boxShadow: saved ? '0 2px 12px rgba(16,185,129,0.35)' : undefined,
        opacity: loading ? 0.7 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
        minWidth: 140,
      }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : <Save size={16} />}
      {loading ? 'جارٍ الحفظ...' : saved ? 'تم الحفظ' : label}
    </button>
  );
}

export function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; message: string }) {
  return (
    <div className="vp-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
      <Icon size={40} style={{ margin: '0 auto 10px', opacity: 0.15, color: 'var(--textMut)' }} />
      <div style={{ fontSize: '.88rem', color: 'var(--textMut)' }}>{message}</div>
    </div>
  );
}

export function LoadingSpinner({ text = 'جارٍ التحميل...' }: { text?: string }) {
  return (
    <div className="vp-loading-soft" style={{ textAlign: 'center', padding: '3rem', color: 'var(--textMut)' }}>
      <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 8px' }} />
      <div style={{ fontSize: '.85rem' }}>{text}</div>
    </div>
  );
}
