import { useState, useEffect, useRef } from 'react';
import { Camera, Users, Briefcase, Shield, ChevronDown, ArrowLeft, Zap, Globe, BarChart3, Clock, Star, CheckCircle2, Sun, Moon, Bell } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

/** Counts up to the numeric portion of a value when scrolled into view. */
function AnimatedStat({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const m = value.match(/^([^\d]*)(\d+(?:\.\d+)?)([^\d]*)$/);
  const [display, setDisplay] = useState(() => m ? `${m[1]}0${m[3]}` : value);

  useEffect(() => {
    if (!m) return;
    const node = ref.current;
    if (!node) return;
    const [, prefix, numStr, suffix] = m;
    const target = parseFloat(numStr);
    const decimals = (numStr.split('.')[1] || '').length;
    let raf = 0;
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      const dur = 1500;
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const cur = target * eased;
        setDisplay(`${prefix}${cur.toFixed(decimals)}${suffix}`);
        if (t < 1) raf = requestAnimationFrame(tick);
        else setDisplay(value);
      };
      raf = requestAnimationFrame(tick);
    };
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { run(); obs.disconnect(); }
    }, { threshold: 0.4 });
    obs.observe(node);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);

  return <span ref={ref}>{display}</span>;
}

export const LandingPage = ({ onNavigate }: LandingPageProps) => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return document.documentElement.getAttribute('data-theme') !== 'light';
    }
    return true;
  });
  const [scrollY, setScrollY] = useState(0);
  const [visible, setVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsGridRef = useRef<HTMLDivElement>(null);
  const [rolesVisible, setRolesVisible] = useState(false);
  const rolesGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Temporarily hidden — flip to `true` to bring the stats ribbon back.
  // Trigger phrase for Claude: "show the landing stats" (or "bring back the stats section").
  const SHOW_STATS_SECTION = false;

  useEffect(() => {
    if (!SHOW_STATS_SECTION) return;
    const node = statsGridRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStatsVisible(true); obs.disconnect(); } },
      { threshold: 0.25 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  // Role cards: reveal on scroll into viewport (staggered + 3D rise).
  // Three redundant triggers because preview iframes / mobile webviews are
  // notoriously inconsistent about firing scroll events and IntersectionObserver
  // callbacks. In any real browser, the first signal that arrives wins.
  useEffect(() => {
    const node = rolesGridRef.current;
    if (!node) return;
    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setRolesVisible(true);
    };
    const checkInView = () => {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.85 && rect.bottom > 0) trigger();
    };

    // 1. IntersectionObserver — primary path in real browsers.
    let obs: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) trigger();
      }, { threshold: 0.15 });
      obs.observe(node);
    }
    // 2. Scroll event — catches user scrolls if IO is flaky.
    window.addEventListener('scroll', checkInView, { passive: true });
    // 3. Initial synchronous check — catches "grid already in view on page load".
    checkInView();
    // 4. Last-resort timer — guarantees the cards eventually appear.
    const fallback = window.setTimeout(trigger, 3500);

    return () => {
      obs?.disconnect();
      window.removeEventListener('scroll', checkInView);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const stats = [
    { value: '+200', label: 'مورد موثّق', icon: Users, color: '#3b82f6' },
    { value: '+500', label: 'مشروع', icon: Briefcase, color: '#8b5cf6' },
    { value: '4.9★', label: 'متوسط التقييم', icon: Star, color: '#f59e0b' },
    { value: '24/7', label: 'دعم سريع', icon: Clock, color: '#10b981' },
  ];

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Cairo', 'Tajawal', sans-serif", direction: 'rtl', background: 'var(--bg-base)', color: 'var(--text-primary)', overflowX: 'hidden' }}>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-right { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes border-glow { 0%, 100% { border-color: rgba(37,99,235,0.2); } 50% { border-color: rgba(37,99,235,0.5); } }
        @keyframes scroll-bounce { 0%, 100% { transform: translate(-50%, 0); opacity: 0.45; } 50% { transform: translate(-50%, 8px); opacity: 0.85; } }
        @keyframes card-fade-in { from { opacity: 0; transform: translateY(20px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes mockup-float { 0%, 100% { transform: rotateY(8deg) rotateX(4deg) rotateZ(-2deg) translateY(0); } 50% { transform: rotateY(8deg) rotateX(4deg) rotateZ(-2deg) translateY(-10px); } }
        @keyframes bar-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes stat-ring-spin { to { transform: rotate(360deg); } }
        @keyframes stat-shimmer { 0% { transform: translateX(-150%) skewX(-12deg); } 100% { transform: translateX(250%) skewX(-12deg); } }
        @keyframes stat-aura-pulse { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.08); } }
        @keyframes border-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes float-y {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .landing-card { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .landing-card:hover { transform: translateY(-6px); box-shadow: 0 20px 50px rgba(0,0,0,0.2); border-color: rgba(59,130,246,0.35) !important; }
        .landing-feature { opacity: 0; animation: slide-up 0.6s ease forwards; }

        /* ── Stats redesign — editorial ribbon ── */
        .landing-stats-section {
          position: relative;
          padding: 48px 32px 80px;
          background: var(--bg-base);
          z-index: 2;
        }
        .landing-stats-panel {
          position: relative;
          max-width: 1080px;
          margin: 0 auto;
          padding: 32px 24px;
          border-radius: 24px;
          background:
            radial-gradient(900px 300px at 50% -10%, rgba(37,99,235,0.12), transparent 60%),
            radial-gradient(700px 240px at 100% 110%, rgba(236,72,153,0.08), transparent 60%),
            linear-gradient(180deg, rgba(8,15,32,0.85), rgba(8,15,32,0.55));
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          overflow: hidden;
          isolation: isolate;
        }
        /* animated conic-gradient border */
        .landing-stats-panel::before {
          content: ''; position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(59,130,246,0.65) 60deg,
            rgba(139,92,246,0.65) 130deg,
            transparent 200deg,
            rgba(236,72,153,0.55) 270deg,
            transparent 360deg
          );
          animation: border-rotate 12s linear infinite;
          z-index: -2;
          opacity: 0.55;
        }
        /* mask the conic into a thin ring (only the border visible) */
        .landing-stats-panel::after {
          content: ''; position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(8,15,32,0.95), rgba(8,15,32,0.92));
          z-index: -1;
        }
        .landing-stats-panel-glow {
          position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(rgba(148,163,184,0.07) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: radial-gradient(ellipse at center, black 0%, transparent 80%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 80%);
          opacity: 0.45;
        }
        .landing-stats-grid { position: relative; z-index: 1; }
        .landing-section-divider {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          gap: 14px;
          padding: 8px 0 56px;
          color: var(--text-muted);
        }
        .landing-section-divider .line {
          flex: 1; height: 1px;
          background: linear-gradient(90deg, transparent, var(--border-soft), transparent);
          max-width: 220px;
        }
        .landing-section-divider .dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          box-shadow: 0 0 12px rgba(59,130,246,0.55);
        }
        .landing-features-section {
          position: relative;
          padding: 0 32px 110px;
          background:
            radial-gradient(1100px 500px at 50% 0%, rgba(37,99,235,0.06), transparent 60%),
            radial-gradient(900px 400px at 100% 100%, rgba(124,58,237,0.05), transparent 60%),
            var(--bg-overlay);
          scroll-margin-top: 80px;
          overflow: hidden;
        }
        .landing-features-section::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(rgba(148,163,184,0.06) 1px, transparent 1px);
          background-size: 36px 36px;
          mask-image: radial-gradient(ellipse at top, black 0%, transparent 80%);
          -webkit-mask-image: radial-gradient(ellipse at top, black 0%, transparent 80%);
          opacity: 0.4;
        }
        .landing-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 6px 16px; border-radius: 99px;
          background: var(--accent-glow);
          border: 1px solid var(--accent-glow-md);
          color: var(--accent-lighter);
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.04em;
          margin-bottom: 18px;
          text-transform: uppercase;
        }
        .landing-section-accent {
          width: 64px; height: 4px; border-radius: 4px;
          background: linear-gradient(90deg, #2563eb, #7c3aed, #ec4899);
          margin: 22px auto 0;
          box-shadow: 0 0 20px rgba(124,58,237,0.4);
        }
        .landing-stat-card {
          --c: #3b82f6;
          position: relative;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 12px 14px;
          opacity: 0; transform: translateY(28px);
          transition:
            opacity 0.8s cubic-bezier(0.22,1,0.36,1),
            transform 0.8s cubic-bezier(0.22,1,0.36,1);
          transition-delay: calc(var(--i, 0) * 110ms);
          cursor: default;
        }
        .landing-stats-grid.is-visible .landing-stat-card {
          opacity: 1; transform: translateY(0);
        }
        /* gradient vertical divider between cells (RTL-friendly: insert before each cell except the first) */
        .landing-stat-card:not(:first-child)::before {
          content: ''; position: absolute;
          right: -1px; top: 18%; bottom: 18%;
          width: 1px;
          background: linear-gradient(180deg,
            transparent,
            color-mix(in srgb, var(--c) 35%, transparent),
            color-mix(in srgb, var(--c) 8%, transparent),
            transparent);
        }
        /* icon as glowing chip floating above the number */
        .landing-stat-icon-wrap {
          position: relative;
          width: 44px; height: 44px;
          margin-bottom: 14px;
          display: flex; align-items: center; justify-content: center;
          animation: float-y 5s ease-in-out infinite;
          animation-delay: calc(var(--i, 0) * 0.4s);
        }
        .landing-stat-icon-aura {
          position: absolute; inset: -14px;
          border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--c) 38%, transparent), transparent 60%);
          filter: blur(14px);
          animation: stat-aura-pulse 4s ease-in-out infinite;
        }
        .landing-stat-icon-ring {
          position: absolute; inset: -2px;
          border-radius: 16px;
          background: conic-gradient(from 0deg, var(--c), transparent 30%, var(--c) 65%, transparent 100%);
          opacity: 0; transition: opacity 0.4s ease;
        }
        .landing-stat-card:hover .landing-stat-icon-ring {
          opacity: 0.9;
          animation: stat-ring-spin 3s linear infinite;
        }
        .landing-stat-icon {
          position: relative; z-index: 1;
          width: 100%; height: 100%; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(160deg,
            color-mix(in srgb, var(--c) 26%, transparent),
            color-mix(in srgb, var(--c) 6%, transparent));
          border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
          color: var(--c);
          box-shadow:
            0 8px 24px -10px color-mix(in srgb, var(--c) 70%, transparent),
            inset 0 1px 0 color-mix(in srgb, var(--c) 30%, transparent);
          transition: transform 0.5s cubic-bezier(0.22,1,0.36,1);
        }
        .landing-stat-card:hover .landing-stat-icon {
          transform: scale(1.08) rotate(-6deg);
        }
        /* editorial number */
        .landing-stat-num {
          position: relative;
          font-size: clamp(28px, 3vw, 38px); font-weight: 900;
          direction: ltr; letter-spacing: -0.03em;
          background-clip: text; -webkit-background-clip: text;
          color: transparent; -webkit-text-fill-color: transparent;
          margin-bottom: 8px; line-height: 1;
          font-variant-numeric: tabular-nums;
          text-shadow: 0 0 30px color-mix(in srgb, var(--c) 20%, transparent);
          transition: transform 0.5s cubic-bezier(0.22,1,0.36,1);
        }
        .landing-stat-card:hover .landing-stat-num { transform: scale(1.05); }
        /* tiny color accent dot under number */
        .landing-stat-divider {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--c);
          box-shadow: 0 0 10px color-mix(in srgb, var(--c) 80%, transparent);
          margin: 0 auto 10px;
          transition: transform 0.4s ease, box-shadow 0.4s ease;
        }
        .landing-stat-card:hover .landing-stat-divider {
          transform: scale(1.6);
          box-shadow: 0 0 18px color-mix(in srgb, var(--c) 95%, transparent);
        }
        .landing-stat-label {
          font-size: 12px; color: var(--text-muted); font-weight: 600;
          letter-spacing: 0.05em;
        }
        .landing-blob { position: absolute; border-radius: 50%; filter: blur(100px); pointer-events: none; animation: pulse-glow 8s ease-in-out infinite; }
        .landing-grid-pattern {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
          background-image: radial-gradient(rgba(148,163,184,0.12) 1px, transparent 1px);
          background-size: 28px 28px;
          mask-image: radial-gradient(ellipse at center, black 35%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 35%, transparent 75%);
        }
        .landing-hero-grid {
          position: relative; z-index: 1;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 64px; max-width: 1240px; width: 100%;
          margin: 0 auto; align-items: center;
        }
        .landing-hero-text { text-align: right; opacity: 0; animation: slide-up 0.8s cubic-bezier(0.4,0,0.2,1) 0.1s forwards; }
        .landing-mockup-wrap {
          perspective: 1600px; transform-style: preserve-3d;
          opacity: 0; animation: card-fade-in 0.9s cubic-bezier(0.4,0,0.2,1) 0.4s forwards;
        }
        .landing-mockup {
          border-radius: 18px; overflow: hidden;
          border: 1px solid var(--border-soft);
          box-shadow: 0 50px 90px -20px rgba(0,0,0,0.55), 0 24px 48px -12px rgba(37,99,235,0.22);
          animation: mockup-float 8s ease-in-out 1.4s infinite;
        }
        .landing-bar { transform-origin: bottom; animation: bar-grow 0.9s cubic-bezier(0.4,0,0.2,1) forwards; }
        .landing-trust-row { display: flex; justify-content: flex-start; gap: 28px; flex-wrap: wrap; margin-top: 28px; }
        .landing-trust-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); font-weight: 600; }
        .landing-scroll-cue {
          position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          color: var(--text-muted); font-size: 11px; font-weight: 600;
          animation: scroll-bounce 2.4s ease-in-out infinite;
          pointer-events: none;
        }

        /* ── Role cards (3 perspectives side-by-side) ── */
        .landing-roles-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 22px;
          perspective: 1200px;
        }
        .landing-role-card {
          --c: #2563eb;
          position: relative;
          padding: 32px 28px;
          border-radius: 22px;
          background: var(--bg-surface);
          border: 1.5px solid var(--border-soft);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          isolation: isolate;
          cursor: default;
          /* Resting (off-viewport) state — rise from below with subtle 3D tilt + blur */
          opacity: 0;
          transform: translateY(70px) scale(0.94) rotateX(8deg);
          filter: blur(2px);
          transform-origin: 50% 100%;
          transition:
            transform 0.85s cubic-bezier(0.16, 1, 0.3, 1),
            opacity 0.7s ease,
            filter 0.6s ease,
            border-color 0.3s ease,
            box-shadow 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .landing-roles-grid.is-visible .landing-role-card {
          opacity: 1;
          transform: translateY(0) scale(1) rotateX(0);
          filter: blur(0);
        }
        .landing-role-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(140% 110% at 50% 0%, color-mix(in srgb, var(--c) 12%, transparent), transparent 65%);
          opacity: 0;
          transition: opacity 0.4s;
          z-index: -1;
          pointer-events: none;
        }
        .landing-role-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--c), color-mix(in srgb, var(--c) 45%, #ffffff));
          transform: scaleX(0);
          transition: transform 0.5s cubic-bezier(0.4,0,0.2,1);
        }
        .landing-role-card:hover {
          transform: translateY(-8px);
          border-color: var(--c);
          box-shadow: 0 18px 44px -14px color-mix(in srgb, var(--c) 38%, transparent);
        }
        .landing-role-card:hover::before { opacity: 1; }
        .landing-role-card:hover::after { transform: scaleX(1); }
        .landing-role-icon {
          width: 56px; height: 56px;
          border-radius: 16px;
          background: color-mix(in srgb, var(--c) 14%, transparent);
          color: var(--c);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px;
          transition: transform 0.4s cubic-bezier(0.4,0,0.2,1),
                      background 0.3s, color 0.3s, box-shadow 0.3s;
          box-shadow: 0 6px 18px color-mix(in srgb, var(--c) 20%, transparent);
        }
        .landing-role-card:hover .landing-role-icon {
          transform: scale(1.08) rotate(-4deg);
          background: var(--c);
          color: #ffffff;
        }
        .landing-role-title {
          font-size: 22px;
          font-weight: 900;
          color: var(--text-primary);
          margin-bottom: 10px;
          line-height: 1.2;
        }
        .landing-role-tagline {
          font-size: 13.5px;
          color: var(--text-muted);
          line-height: 1.7;
          margin-bottom: 20px;
        }
        .landing-role-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--border-soft), transparent);
          margin: 0 -4px 18px;
        }
        .landing-role-features {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 12px;
        }
        .landing-role-features li {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.55;
        }
        .landing-role-check {
          flex-shrink: 0;
          width: 22px; height: 22px;
          border-radius: 7px;
          background: color-mix(in srgb, var(--c) 14%, transparent);
          color: var(--c);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.3s, color 0.3s, transform 0.3s;
          margin-top: 1px;
        }
        .landing-role-card:hover .landing-role-check {
          background: var(--c);
          color: #ffffff;
        }
        .landing-role-features li:hover .landing-role-check {
          transform: scale(1.15);
        }

        /* ── Mockup interactivity (cursor-tracked glow, soft hover lift, micro-animations) ── */
        /* NOTE: the parent .landing-mockup already runs the mockup-float keyframe
           (rotateY/rotateX/rotateZ + translateY). Touching transform on :hover
           fights that animation and causes a visible jerk on mouse enter, so the
           hover state only enhances filter/box-shadow, which compose cleanly with
           the running float. */
        .landing-mockup {
          position: relative;
          transition: filter 0.55s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.55s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .landing-mockup::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%),
            rgba(96, 165, 250, 0.22), transparent 55%);
          opacity: 0;
          transition: opacity 0.45s ease;
          pointer-events: none;
          z-index: 5;
        }
        @media (hover: hover) {
          .landing-mockup:hover {
            filter: brightness(1.04) saturate(1.05);
            box-shadow:
              0 60px 110px -20px rgba(0,0,0,0.65),
              0 32px 64px -12px rgba(37,99,235,0.42);
          }
          .landing-mockup:hover::before { opacity: 1; }
        }

        /* Stat cards inside mockup — color-aware lift */
        .landing-mockup-stat {
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.3s,
                      box-shadow 0.35s,
                      background 0.3s;
          cursor: pointer;
        }
        .landing-mockup-stat:hover {
          transform: translateY(-3px);
          border-color: var(--c) !important;
          box-shadow: 0 12px 26px color-mix(in srgb, var(--c) 32%, transparent);
          background: color-mix(in srgb, var(--c) 6%, var(--bg-surface)) !important;
        }
        .landing-mockup-stat-icon {
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .landing-mockup-stat:hover .landing-mockup-stat-icon {
          transform: scale(1.18) rotate(-6deg);
        }

        /* Activity rows inside mockup */
        .landing-mockup-activity {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s;
          border-radius: 9px;
          margin-inline: -6px;
          padding-inline: 6px !important;
          cursor: pointer;
        }
        .landing-mockup-activity:hover {
          background: rgba(148, 163, 184, 0.09);
          transform: translateX(-5px);
        }

        /* Notification badge — gentle pulse to signal new items */
        @keyframes mockup-notif-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(96, 165, 250, 0.45); }
          50%      { box-shadow: 0 0 0 7px rgba(96, 165, 250, 0); }
        }
        .landing-mockup-notif {
          animation: mockup-notif-pulse 2.4s ease-in-out infinite;
        }

        /* Progress bar — shimmer sweep */
        .landing-mockup-progress-track { position: relative; overflow: hidden; }
        .landing-mockup-progress-track::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.32) 50%, transparent 100%);
          transform: translateX(-100%);
          animation: mockup-progress-shimmer 3.6s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes mockup-progress-shimmer {
          0%, 55%, 100% { transform: translateX(-100%); }
          28%           { transform: translateX(100%); }
        }

        /* Completion chips — micro feedback on hover */
        .landing-mockup-chip {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s;
          cursor: pointer;
        }
        .landing-mockup-chip:hover {
          transform: translateY(-1px) scale(1.05);
          filter: brightness(1.15);
        }

        /* Traffic-light dots — macOS-style hover reveal */
        .landing-mockup-traffic { display: flex; gap: 6px; }
        .landing-mockup-traffic-dot {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 900;
          line-height: 1;
          font-family: ui-monospace, SFMono-Regular, monospace;
          color: rgba(0, 0, 0, 0);
          user-select: none;
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.25s ease;
        }
        .landing-mockup-traffic:hover .landing-mockup-traffic-dot {
          color: rgba(0, 0, 0, 0.65);
        }
        .landing-mockup-traffic-dot:hover {
          transform: scale(1.22);
          filter: brightness(1.12) saturate(1.15);
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.08), 0 4px 10px rgba(0, 0, 0, 0.35);
        }
        .landing-mockup-traffic-dot:active {
          transform: scale(0.92);
        }

        /* ── Tablet ── */
        @media (max-width: 1024px) {
          .landing-hero-grid { grid-template-columns: 1fr; gap: 48px; }
          .landing-hero-text { text-align: center; }
          .landing-mockup { animation: none !important; transform: none !important; }
          .landing-trust-row { justify-content: center !important; }
          .landing-grid-pattern { opacity: 0.25; }
          .landing-roles-grid { gap: 16px; }
        }

        /* ── Mobile responsive ── */
        @media (max-width: 768px) {
          .landing-stats-section { padding: 40px 16px 70px !important; }
          .landing-stats-panel { padding: 32px 14px !important; border-radius: 24px !important; }
          .landing-stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px 0 !important; }
          .landing-stat-card { padding: 16px 10px !important; }
          .landing-stat-card:nth-child(2)::before,
          .landing-stat-card:nth-child(4)::before { display: none; }
          .landing-stat-card:nth-child(3)::before,
          .landing-stat-card:nth-child(4)::before {
            content: '' !important; position: absolute !important;
            top: -1px !important; right: 10% !important; left: 10% !important;
            width: auto !important; height: 1px !important; bottom: auto !important;
            background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--c) 30%, transparent), transparent) !important;
          }
          .landing-stat-icon-wrap { width: 48px !important; height: 48px !important; margin-bottom: 14px !important; }
          .landing-stat-num { font-size: clamp(32px, 9vw, 44px) !important; }
          .landing-features-section { padding: 0 16px 70px !important; }
          .landing-section-divider { padding-bottom: 36px !important; }
          .landing-section-divider .line { max-width: 80px !important; }
          .landing-portals-grid { grid-template-columns: 1fr !important; }
          .landing-features-grid { grid-template-columns: 1fr !important; }
          .landing-roles-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .landing-role-card { padding: 26px 22px !important; }
          .landing-hero-section { padding: 100px 20px 60px !important; }
          .landing-section-pad { padding-left: 20px !important; padding-right: 20px !important; }
          .landing-cta-inner { padding: 40px 24px !important; }
          .landing-nav { padding: 12px 16px !important; }
          .landing-trust-row { gap: 16px !important; margin-top: 22px !important; justify-content: center !important; }
          .landing-scroll-cue { display: none !important; }
          .landing-mockup-cta-row { justify-content: center !important; }
        }
      `}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav className="landing-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '16px 32px',
        background: scrollY > 50
          ? (isDark ? 'rgba(5,13,30,0.9)' : 'rgba(255,255,255,0.92)')
          : 'transparent',
        backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
        borderBottom: scrollY > 50 ? '1px solid var(--border-soft)' : 'none',
        transition: 'all 0.3s',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/assets/logo-white.png" alt="Half Lens" style={{ height: 40, objectFit: 'contain', display: isDark ? 'block' : 'none' }} />
          <img src="/assets/logo-blue.png" alt="Half Lens" style={{ height: 40, objectFit: 'contain', display: isDark ? 'none' : 'block' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setIsDark(!isDark)}
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--bg-overlay)', border: '1px solid var(--border-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s',
            }}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section className="landing-hero-section" style={{
        position: 'relative', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '120px 32px 80px',
      }}>
        {/* Animated blobs */}
        <div className="landing-blob" style={{ width: 500, height: 500, top: '-10%', right: '-5%', background: 'rgba(37,99,235,0.12)', animationDelay: '0s' }} />
        <div className="landing-blob" style={{ width: 400, height: 400, bottom: '0%', left: '-5%', background: 'rgba(124,58,237,0.1)', animationDelay: '2s' }} />

        {/* Subtle dot grid */}
        <div className="landing-grid-pattern" />

        <div className="landing-hero-grid">

          {/* ── TEXT COLUMN (right in RTL) ── */}
          <div className="landing-hero-text">
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 99,
              background: 'var(--accent-glow)', border: '1px solid var(--accent-glow-md)',
              fontSize: 13, fontWeight: 600, color: 'var(--accent-lighter)',
              marginBottom: 24,
            }}>
              <Users size={14} /> منصة هاف لينس المتكاملة
            </div>

            <h1 style={{
              fontSize: 'clamp(32px, 4.4vw, 56px)', fontWeight: 900, lineHeight: 1.15,
              color: 'var(--text-primary)', marginBottom: 22,
            }}>
              منصة واحدة
              <br />
              <span style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                تجمع الموردين والعملاء والإدارة
              </span>
            </h1>

            <p style={{
              fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.75,
              marginBottom: 36, maxWidth: 540,
            }}>
              بوابة Half Lens الموحّدة — للموردين، العملاء، وفريق الإدارة. استقبل المهام، تابع مشاريعك،
              وأدر العمل بسلاسة. سجّل دخولك وادخل إلى تجربتك المخصّصة.
            </p>

            <div className="landing-mockup-cta-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => onNavigate('/vendor/login')}
                style={{
                  padding: '14px 32px', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                  color: '#fff', fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 8px 30px rgba(37,99,235,0.35)',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(37,99,235,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(37,99,235,0.35)'; }}
              >
                ابدأ الآن <ArrowLeft size={18} />
              </button>
            </div>

            {/* Trust badges */}
            <div className="landing-trust-row">
              <div className="landing-trust-item">
                <Shield size={13} style={{ color: '#10b981' }} /> تشفير وحماية كاملة
              </div>
              <div className="landing-trust-item">
                <Globe size={13} style={{ color: 'var(--accent-lighter)' }} /> دعم RTL متكامل
              </div>
              <div className="landing-trust-item">
                <Clock size={13} style={{ color: '#f59e0b' }} /> دعم 24/7
              </div>
              <div className="landing-trust-item">
                <Star size={13} style={{ color: '#8b5cf6' }} /> صنع في السعودية
              </div>
            </div>
          </div>

          {/* ── DASHBOARD MOCKUP COLUMN (left in RTL) ── */}
          <div className="landing-mockup-wrap">
            <div
              className="landing-mockup"
              style={{ background: isDark ? 'rgba(15,23,42,0.92)' : '#fff' }}
              onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                e.currentTarget.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
              }}
            >

              {/* Browser chrome */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px',
                background: isDark ? 'rgba(8,15,32,0.6)' : 'rgba(248,250,252,1)',
                borderBottom: `1px solid ${isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)'}`,
                direction: 'ltr',
              }}>
                <div className="landing-mockup-traffic">
                  <div className="landing-mockup-traffic-dot" style={{ background: '#ef4444' }}>×</div>
                  <div className="landing-mockup-traffic-dot" style={{ background: '#f59e0b' }}>−</div>
                  <div className="landing-mockup-traffic-dot" style={{ background: '#10b981' }}>+</div>
                </div>
                <div style={{
                  flex: 1, marginInline: 12, padding: '5px 14px', borderRadius: 8,
                  background: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)',
                  fontSize: 11, color: 'var(--text-muted)', textAlign: 'center',
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}>half-lens.app</div>
              </div>

              {/* Dashboard body */}
              <div style={{ padding: 22, direction: 'rtl' }}>

                {/* Welcome row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>أهلاً، أحمد 👋</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>مساحتك في Half Lens</div>
                  </div>
                  <div className="landing-mockup-notif" style={{ padding: '5px 11px', borderRadius: 8, background: 'rgba(37,99,235,0.14)', color: 'var(--accent-lighter)', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Bell size={11} /> 2 إشعارات جديدة
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                  {[
                    { label: 'مشاريع نشطة', value: '5', color: '#3b82f6', icon: Briefcase, trend: '+2' },
                    { label: 'مشاريع مكتملة', value: '47', color: '#8b5cf6', icon: CheckCircle2, trend: '+9%' },
                    { label: 'التقييم', value: '4.9', color: '#f59e0b', icon: Star, trend: '★★★★★' },
                  ].map((s, i) => {
                    const I = s.icon;
                    return (
                      <div key={i} className="landing-mockup-stat" style={{
                        padding: 11, borderRadius: 11,
                        background: isDark ? 'rgba(148,163,184,0.05)' : 'rgba(15,23,42,0.025)',
                        border: `1px solid ${isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)'}`,
                        ['--c' as string]: s.color,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div className="landing-mockup-stat-icon" style={{ width: 24, height: 24, borderRadius: 7, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <I size={12} color={s.color} />
                          </div>
                          <div style={{ fontSize: 9.5, color: '#10b981', fontWeight: 800, direction: 'ltr' }}>{s.trend}</div>
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, direction: 'ltr', textAlign: 'right' }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Profile completeness */}
                <div style={{
                  padding: '12px 14px', borderRadius: 12, marginBottom: 14,
                  background: isDark ? 'rgba(148,163,184,0.04)' : 'rgba(15,23,42,0.02)',
                  border: `1px solid ${isDark ? 'rgba(148,163,184,0.06)' : 'rgba(15,23,42,0.03)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text-primary)' }}>اكتمال الملف الشخصي</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', direction: 'ltr' }}>92%</span>
                  </div>
                  <div className="landing-mockup-progress-track" style={{
                    height: 7, borderRadius: 4, overflow: 'hidden',
                    background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)',
                    marginBottom: 10,
                  }}>
                    <div className="landing-bar" style={{
                      height: '100%', width: '92%',
                      background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                      transformOrigin: 'right',
                      animationDelay: '0.6s',
                    }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { l: 'الهوية', ok: true },
                      { l: 'البيانات الأساسية', ok: true },
                      { l: 'وسائل التواصل', ok: true },
                      { l: 'الإشعارات', ok: false },
                    ].map((p, i) => (
                      <div key={i} className="landing-mockup-chip" style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 6,
                        background: p.ok ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                        color: p.ok ? '#10b981' : '#f59e0b',
                        fontSize: 9.5, fontWeight: 700,
                      }}>
                        <CheckCircle2 size={9} /> {p.l}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity rows */}
                <div>
                  {[
                    { icon: CheckCircle2, color: '#10b981', t: 'تحديث جديد على مشروع "الرياض ٢٠٢٦"', s: 'منذ 5 دقائق' },
                    { icon: BarChart3, color: '#06b6d4', t: 'دفعة جديدة بانتظار المراجعة', s: 'منذ 22 دقيقة' },
                  ].map((a, i) => {
                    const I = a.icon;
                    return (
                      <div key={i} className="landing-mockup-activity" style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 0',
                        borderBottom: i < 1 ? `1px solid ${isDark ? 'rgba(148,163,184,0.06)' : 'rgba(15,23,42,0.04)'}` : 'none',
                      }}>
                        <div style={{ width: 26, height: 26, borderRadius: 8, background: `${a.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <I size={12} color={a.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.t}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{a.s}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Scroll cue */}
        <div className="landing-scroll-cue">
          <span>اكتشف المزيد</span>
          <ChevronDown size={18} />
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      {SHOW_STATS_SECTION && (
        <section className="landing-stats-section landing-section-pad">
          <div className="landing-stats-panel">
            <span className="landing-stats-panel-glow" />
            <div
              ref={statsGridRef}
              className={`landing-stats-grid${statsVisible ? ' is-visible' : ''}`}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}
            >
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={i}
                    className="landing-stat-card"
                    style={{ ['--c' as string]: stat.color, ['--i' as string]: i }}
                  >
                    <div className="landing-stat-icon-wrap">
                      <span className="landing-stat-icon-aura" />
                      <span className="landing-stat-icon-ring" />
                      <div className="landing-stat-icon">
                        <Icon size={20} strokeWidth={2.2} />
                      </div>
                    </div>
                    <div className="landing-stat-num" style={{
                      backgroundImage: `linear-gradient(135deg, ${stat.color}, color-mix(in srgb, ${stat.color} 50%, #ffffff))`,
                    }}>
                      <AnimatedStat value={stat.value} />
                    </div>
                    <div className="landing-stat-divider" />
                    <div className="landing-stat-label">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ FEATURES SECTION ═══ */}
      <section id="features-section" className="landing-features-section landing-section-pad">
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="landing-section-divider">
            <span className="line" />
            <span className="dot" />
            <span className="line" />
          </div>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="landing-eyebrow">
              <Users size={13} /> ثلاث تجارب، منصة واحدة
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.4vw, 40px)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.2 }}>
              تجربة مصمّمة{' '}
              <span style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>لكل دور</span>
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
              كل دور في Half Lens له مساحته الخاصة — مع تكامل سلس بين الجميع
            </p>
            <div className="landing-section-accent" />
          </div>

          <div
            ref={rolesGridRef}
            className={`landing-roles-grid${rolesVisible ? ' is-visible' : ''}`}
          >
            {[
              {
                icon: Briefcase,
                title: 'للموردين',
                tagline: 'منصة احترافية تجمع كل ما يحتاجه المورد لينمو مع Half Lens',
                color: '#2563eb',
                features: [
                  'ملف احترافي يعرض معداتك ومهاراتك',
                  'استقبال المهام مباشرة من فريق Half Lens',
                  'متابعة الفواتير والمدفوعات بدقّة',
                  'إدارة المستندات والمعدات بسهولة',
                  'إشعارات فورية لكل تحديث',
                ],
              },
              {
                icon: Users,
                title: 'للعملاء',
                tagline: 'تابع مشاريعك مع Half Lens من بوابة شفّافة ومنظمة',
                color: '#06b6d4',
                features: [
                  'متابعة المشاريع لحظة بلحظة',
                  'الاطّلاع على الفواتير وحالة المدفوعات',
                  'الوصول لوثائق ومخرجات المشاريع',
                  'تواصل مباشر مع فريق Half Lens',
                  'تاريخ كامل لمشاريعك السابقة',
                ],
              },
              {
                icon: BarChart3,
                title: 'لفريق الإدارة',
                tagline: 'لوحة تحكم موحّدة تُدير دورة العمل بالكامل داخل Half Lens',
                color: '#7c3aed',
                features: [
                  'إدارة المشاريع والموردين والعملاء',
                  'متابعة المدفوعات والمصروفات',
                  'تقارير ربحية وأداء لحظية',
                  'سجل نشاطات شامل وقابل للتصفية',
                  'تخصيص الأدوار والصلاحيات',
                ],
              },
            ].map((role, i) => {
              const Icon = role.icon;
              return (
                <div
                  key={i}
                  className="landing-role-card"
                  style={{
                    ['--c' as string]: role.color,
                    transitionDelay: `${i * 0.14}s`,
                  }}
                >
                  <div className="landing-role-icon">
                    <Icon size={26} strokeWidth={2.2} />
                  </div>
                  <h3 className="landing-role-title">{role.title}</h3>
                  <p className="landing-role-tagline">{role.tagline}</p>
                  <div className="landing-role-divider" />
                  <ul className="landing-role-features">
                    {role.features.map((f, j) => (
                      <li key={j}>
                        <span className="landing-role-check">
                          <CheckCircle2 size={13} strokeWidth={2.6} />
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        padding: '32px',
        borderTop: '1px solid var(--border-soft)',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <img src="/assets/logo-white.png" alt="Half Lens" style={{ height: 28, objectFit: 'contain', display: isDark ? 'block' : 'none' }} />
          <img src="/assets/logo-blue.png" alt="Half Lens" style={{ height: 28, objectFit: 'contain', display: isDark ? 'none' : 'block' }} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} Half Lens Production. جميع الحقوق محفوظة.
        </p>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 12 }}>
          <a onClick={() => onNavigate('/terms')} style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'none' }}>الشروط والأحكام</a>
          <a onClick={() => onNavigate('/privacy')} style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'none' }}>سياسة السرّية</a>
        </div>
      </footer>
    </div>
  );
};
