// Small visual "عينة" ribbon + sticky preview banner reused by every demo
// page the restricted vendor sees. Clearly signals "this is not real data".

import { Lock, Info } from 'lucide-react';

export const PreviewRibbon = () => (
  <div
    aria-hidden
    style={{
      position: 'absolute',
      top: 12,
      // Pinned to the start of the inline axis (visually the RIGHT corner in
      // RTL layouts) so it doesn't overlap the status pill that lives on the
      // end side. Rotation flipped to -30deg to fold into this opposite corner.
      insetInlineStart: -28,
      transform: 'rotate(-30deg)',
      padding: '4px 32px',
      background: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)',
      color: '#fff',
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '.1em',
      boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
      pointerEvents: 'none',
      zIndex: 2,
    }}
  >
    عينة
  </div>
);

export const PreviewBanner = ({ message }: { message?: string }) => (
  <div
    role="note"
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '12px 16px',
      borderRadius: 12,
      background: 'linear-gradient(135deg,rgba(245,158,11,0.14) 0%,rgba(245,158,11,0.06) 100%)',
      border: '1px solid rgba(245,158,11,0.35)',
      marginBottom: 16,
      fontSize: 13,
      lineHeight: 1.7,
    }}
  >
    <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: '#d97706' }} />
    <div>
      <div style={{ fontWeight: 700, marginBottom: 2, color: '#b45309' }}>أنت تستعرض نسخة تعريفية</div>
      <div style={{ color: 'var(--color-text-secondary)' }}>
        {message ?? 'هذه بيانات تجريبية لتساعدك على فهم المنصة. ستصبح بياناتك الفعلية متاحة بعد الموافقة على حسابك.'}
      </div>
    </div>
  </div>
);

export const LockedActionHint = ({ label = 'متاح بعد الموافقة' }: { label?: string }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 999,
      background: 'var(--color-background-hover, rgba(148,163,184,0.15))',
      border: '1px solid var(--color-border)',
      color: 'var(--color-text-secondary)',
      fontSize: 11,
      fontWeight: 600,
    }}
  >
    <Lock size={11} />
    {label}
  </span>
);
