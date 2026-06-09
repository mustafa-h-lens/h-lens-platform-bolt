import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabaseClient';
import { clearNavTransition } from '../../lib/navTransition';

const SPARKLE_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#a78bfa', '#34d399', '#60a5fa', '#fbbf24', '#fb7185',
];

interface SuccessScreenProps {
  email?: string;
}

const REDIRECT_SECONDS = 10;

export const SuccessScreen = ({ email }: SuccessScreenProps = {}) => {
  const [show, setShow] = useState(false);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  // If the registration flow created an auto-session, send the user straight
  // to the vendor portal. Otherwise fall back to the login page.
  // After registration the post-reg flow may have established a native Supabase
  // session — if so, land the vendor straight in the portal.
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  // Clear any stuck nav-transition overlay so the dark veil can't cover the
  // success page (the overlay is z-index 99999, far above this screen).
  useEffect(() => { clearNavTransition(); }, []);

  const redirectUrl = hasSession
    ? '/vendor'
    : email && email.includes('@')
      ? `/vendor/login?email=${encodeURIComponent(email)}&firstVisit=1`
      : '/vendor/login?firstVisit=1';

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Countdown + auto-redirect after REDIRECT_SECONDS
  useEffect(() => {
    if (countdown <= 0) {
      window.location.href = redirectUrl;
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, redirectUrl]);

  // Generate particles spread across the full viewport
  const particles = Array.from({ length: 120 }, (_, i) => {
    const color = SPARKLE_COLORS[i % SPARKLE_COLORS.length];
    const left = Math.random() * 100;
    const duration = 3 + Math.random() * 5;
    const delay = Math.random() * 6;
    const size = 3 + Math.random() * 7;
    const drift = (Math.random() - 0.5) * 120;
    const rotate = Math.random() * 720 - 360;
    const isCircle = Math.random() > 0.5;
    const opacity = 0.5 + Math.random() * 0.5;
    return { id: i, color, left, duration, delay, size, drift, rotate, isCircle, opacity };
  });

  // Portal to <body> so position:fixed is relative to the viewport, NOT to the
  // PullToRefresh content wrapper (which has transform: translate3d + will-change:
  // transform, making it a containing block for fixed descendants). Without this,
  // .success-fullscreen collapses to the wrapper's height (~32px) and the card
  // renders off-screen, leaving only the dark <body> background visible.
  return createPortal(
    <div className="success-fullscreen" style={{ display: show ? 'flex' : 'none' }}>
      {/* Animated gradient background */}
      <div className="success-bg-gradient" />

      {/* Floating particles — full page, infinite */}
      <div className="sparkle-field">
        {particles.map(p => (
          <div
            key={p.id}
            className="sparkle-particle"
            style={{
              '--sp-color': p.color,
              '--sp-left': `${p.left}%`,
              '--sp-size': `${p.size}px`,
              '--sp-duration': `${p.duration}s`,
              '--sp-delay': `${p.delay}s`,
              '--sp-drift': `${p.drift}px`,
              '--sp-rotate': `${p.rotate}deg`,
              '--sp-br': p.isCircle ? '50%' : '2px',
              '--sp-opacity': p.opacity,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Glow orbs */}
      <div className="success-orb orb-1" />
      <div className="success-orb orb-2" />
      <div className="success-orb orb-3" />

      {/* Glass card */}
      <div className="success-glass-card">
        {/* Green circle */}
        <div className="success-circle">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 className="success-title">تم استلام طلبك بنجاح!</h2>
        <p className="success-sub">
          <span className="sparkle">✨</span>
          مرحباً بك في عائلة Half Lens
          <span className="sparkle">✨</span>
        </p>

        {/* Info card */}
        <div className="success-info-card">
          <div className="success-info-header">
            <span className="success-info-icon">📋</span>
            الخطوات القادمة
          </div>
          <ul className="success-steps">
            <li>
              <span className="success-check">✓</span>
              <span>سيتم مراجعة طلبك خلال 24–48 ساعة عمل</span>
            </li>
            <li>
              <span className="success-check">✓</span>
              <span>سيتم إشعارك عبر البريد الإلكتروني عند قبول الطلب</span>
            </li>
            <li>
              <span className="success-check">✓</span>
              <span>بعد تفعيل حسابك، يمكنك الدخول إلى لوحة التحكم ومتابعة مشاريعك</span>
            </li>
          </ul>
        </div>

        {/* Note card */}
        <div className="success-note-card">
          <span className="success-note-icon">💡</span>
          <span>يمكنك تسجيل الدخول لاحقاً عبر ايميلك لمتابعة حالة طلبك وتحديث بياناتك.</span>
        </div>

        {/* CTA — also auto-redirects after 10 seconds */}
        <button
          className="success-btn"
          onClick={() => { window.location.href = redirectUrl; }}
          type="button"
        >
          الذهاب إلى لوحة التحكم ({countdown})
        </button>
      </div>
    </div>,
    document.body,
  );
};
