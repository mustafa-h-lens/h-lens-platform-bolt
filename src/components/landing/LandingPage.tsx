import { useState, useEffect, useRef } from 'react';
import { Camera, Users, Briefcase, Shield, ChevronLeft, ChevronDown, ArrowLeft, Zap, Globe, BarChart3, Clock, Star, CheckCircle2, Sun, Moon, TrendingUp, Bell } from 'lucide-react';

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

  useEffect(() => {
    setVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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

  const portals = [
    {
      id: 'admin',
      title: 'لوحة التحكم',
      subtitle: 'إدارة المشاريع والفرق والتقارير',
      icon: Shield,
      color: '#2563eb',
      gradient: 'linear-gradient(135deg, #1e40af, #3b82f6)',
      path: '/admin',
      features: ['إدارة المشاريع والعقود', 'متابعة الفواتير والمصروفات', 'تقارير الأداء والإيرادات', 'إدارة الموردين والعملاء'],
    },
    {
      id: 'vendor',
      title: 'بوابة الموردين',
      subtitle: 'إدارة ملفك ومشاريعك ومعداتك',
      icon: Camera,
      color: '#059669',
      gradient: 'linear-gradient(135deg, #047857, #10b981)',
      path: '/vendor/login',
      features: ['إدارة الملف الشخصي والمعدات', 'متابعة المشاريع والفواتير', 'رفع المستندات والشهادات', 'تحديث بيانات السفر والهوية'],
    },
    {
      id: 'client',
      title: 'بوابة العملاء',
      subtitle: 'تتبع مشاريعك وفواتيرك بسهولة',
      icon: Briefcase,
      color: '#7c3aed',
      gradient: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
      path: '/client',
      features: ['عرض حالة المشاريع', 'متابعة الفواتير والمدفوعات', 'التواصل مع فريق العمل', 'تحميل ملفات المشروع'],
    },
  ];

  const stats = [
    { value: '+500', label: 'مشروع مكتمل', icon: Briefcase, color: '#3b82f6' },
    { value: '+200', label: 'مورد موثق', icon: Users, color: '#8b5cf6' },
    { value: '24/7', label: 'دعم متواصل', icon: Clock, color: '#10b981' },
    { value: '99.9%', label: 'وقت التشغيل', icon: Zap, color: '#f59e0b' },
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
        .landing-card { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .landing-card:hover { transform: translateY(-6px); box-shadow: 0 20px 50px rgba(0,0,0,0.2); border-color: rgba(59,130,246,0.35) !important; }
        .landing-feature { opacity: 0; animation: slide-up 0.6s ease forwards; }
        .landing-stat { opacity: 0; animation: slide-up 0.5s ease forwards; }
        .landing-stat-card {
          position: relative;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 20px 14px; border-radius: 16px;
          transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
          cursor: default;
        }
        .landing-stat-card:hover { transform: translateY(-6px); }
        .landing-stat-icon {
          width: 54px; height: 54px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
          transition: transform 0.35s cubic-bezier(0.4,0,0.2,1), box-shadow 0.35s ease;
        }
        .landing-stat-card:hover .landing-stat-icon {
          transform: scale(1.1) rotate(-4deg);
          box-shadow: 0 10px 28px -6px currentColor;
        }
        .landing-stat-num {
          font-size: clamp(26px, 3vw, 34px); font-weight: 900;
          direction: ltr; letter-spacing: -0.02em;
          background-clip: text; -webkit-background-clip: text;
          color: transparent; -webkit-text-fill-color: transparent;
          margin-bottom: 6px; line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .landing-stat-label {
          font-size: 13px; color: var(--text-muted); font-weight: 500;
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

        /* ── Tablet ── */
        @media (max-width: 1024px) {
          .landing-hero-grid { grid-template-columns: 1fr; gap: 48px; }
          .landing-hero-text { text-align: center; }
          .landing-mockup { animation: none !important; transform: none !important; }
          .landing-trust-row { justify-content: center !important; }
          .landing-grid-pattern { opacity: 0.25; }
        }

        /* ── Mobile responsive ── */
        @media (max-width: 768px) {
          .landing-stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 16px !important; }
          .landing-portals-grid { grid-template-columns: 1fr !important; }
          .landing-features-grid { grid-template-columns: 1fr !important; }
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
              <Star size={14} /> منصة إدارة الإنتاج المتكاملة
            </div>

            <h1 style={{
              fontSize: 'clamp(32px, 4.4vw, 56px)', fontWeight: 900, lineHeight: 1.15,
              color: 'var(--text-primary)', marginBottom: 22,
            }}>
              أدر مشاريعك الإنتاجية
              <br />
              <span style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                بكفاءة واحترافية
              </span>
            </h1>

            <p style={{
              fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.75,
              marginBottom: 36, maxWidth: 540,
            }}>
              منصة Half Lens تجمع فريقك وعملاءك ومورديك في مكان واحد.
              تتبع المشاريع، أدر الفواتير، وحلل الأداء — كل ذلك بتصميم عربي متكامل.
            </p>

            <div className="landing-mockup-cta-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  document.getElementById('portals-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
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
            <div className="landing-mockup" style={{ background: isDark ? 'rgba(15,23,42,0.92)' : '#fff' }}>

              {/* Browser chrome */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px',
                background: isDark ? 'rgba(8,15,32,0.6)' : 'rgba(248,250,252,1)',
                borderBottom: `1px solid ${isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)'}`,
                direction: 'ltr',
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#f59e0b' }} />
                  <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#10b981' }} />
                </div>
                <div style={{
                  flex: 1, marginInline: 12, padding: '5px 14px', borderRadius: 8,
                  background: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)',
                  fontSize: 11, color: 'var(--text-muted)', textAlign: 'center',
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}>half-lens.app/admin</div>
              </div>

              {/* Dashboard body */}
              <div style={{ padding: 22, direction: 'rtl' }}>

                {/* Welcome row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>أهلاً، أحمد 👋</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>ملخص آخر 30 يوم</div>
                  </div>
                  <div style={{ padding: '5px 11px', borderRadius: 8, background: 'rgba(37,99,235,0.14)', color: 'var(--accent-lighter)', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Bell size={11} /> 3 جديد
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                  {[
                    { label: 'مشاريع نشطة', value: '24', color: '#3b82f6', icon: Briefcase, trend: '+8.2%' },
                    { label: 'الموردين', value: '208', color: '#8b5cf6', icon: Users, trend: '+12%' },
                    { label: 'الإيرادات', value: '842K', color: '#10b981', icon: TrendingUp, trend: '+18%' },
                  ].map((s, i) => {
                    const I = s.icon;
                    return (
                      <div key={i} style={{
                        padding: 11, borderRadius: 11,
                        background: isDark ? 'rgba(148,163,184,0.05)' : 'rgba(15,23,42,0.025)',
                        border: `1px solid ${isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 7, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <I size={12} color={s.color} />
                          </div>
                          <div style={{ fontSize: 9.5, color: '#10b981', fontWeight: 800, direction: 'ltr' }}>↑ {s.trend}</div>
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, direction: 'ltr', textAlign: 'right' }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Chart */}
                <div style={{
                  padding: '12px 14px', borderRadius: 12, marginBottom: 14,
                  background: isDark ? 'rgba(148,163,184,0.04)' : 'rgba(15,23,42,0.02)',
                  border: `1px solid ${isDark ? 'rgba(148,163,184,0.06)' : 'rgba(15,23,42,0.03)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text-primary)' }}>الإيرادات الشهرية</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>آخر 6 أشهر</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64, direction: 'ltr' }}>
                    {[42, 65, 50, 80, 70, 95].map((h, i) => (
                      <div key={i} className="landing-bar" style={{
                        flex: 1,
                        height: `${h}%`,
                        background: i === 5
                          ? 'linear-gradient(180deg, #3b82f6, #1e40af)'
                          : 'linear-gradient(180deg, rgba(59,130,246,0.45), rgba(59,130,246,0.18))',
                        borderRadius: '5px 5px 2px 2px',
                        animationDelay: `${0.6 + i * 0.07}s`,
                      }} />
                    ))}
                  </div>
                </div>

                {/* Activity rows */}
                <div>
                  {[
                    { icon: CheckCircle2, color: '#10b981', t: 'تمت الموافقة على فاتورة #1284', s: 'منذ 5 دقائق' },
                    { icon: Camera, color: '#06b6d4', t: 'مورد جديد بانتظار المراجعة', s: 'منذ 22 دقيقة' },
                  ].map((a, i) => {
                    const I = a.icon;
                    return (
                      <div key={i} style={{
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
      <section className="landing-section-pad" style={{
        padding: '40px 32px',
        background: 'var(--bg-overlay)',
        borderTop: '1px solid var(--border-soft)',
        borderBottom: '1px solid var(--border-soft)',
      }}>
        <div className="landing-stats-grid" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="landing-stat landing-stat-card"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="landing-stat-icon" style={{
                  background: `${stat.color}1a`,
                  border: `1px solid ${stat.color}40`,
                  color: stat.color,
                  boxShadow: `0 0 0 0 ${stat.color}00`,
                }}>
                  <Icon size={22} />
                </div>
                <div className="landing-stat-num" style={{
                  backgroundImage: `linear-gradient(135deg, ${stat.color}, ${stat.color}b3)`,
                }}>
                  <AnimatedStat value={stat.value} />
                </div>
                <div className="landing-stat-label">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ PORTALS SECTION ═══ */}
      <section id="portals-section" className="landing-section-pad" style={{ padding: '80px 32px', position: 'relative', scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 12 }}>
              بوابة لكل مستخدم
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>
              كل فريق لديه بوابته الخاصة مصممة لتلبية احتياجاته
            </p>
          </div>

          <div className="landing-portals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {portals.map((portal, i) => {
              const Icon = portal.icon;
              return (
                <div
                  key={portal.id}
                  className="landing-card landing-feature"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: 20, padding: 0, overflow: 'hidden',
                    animationDelay: `${i * 0.2}s`,
                  }}
                >
                  {/* Card header gradient */}
                  <div style={{
                    background: portal.gradient, padding: '32px 28px 24px',
                    position: 'relative', overflow: 'hidden', textAlign: 'center',
                  }}>
                    <div style={{
                      position: 'absolute', top: -20, left: -20,
                      width: 100, height: 100, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)',
                    }} />
                    <div style={{
                      width: 52, height: 52, borderRadius: 16,
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 16px', backdropFilter: 'blur(10px)',
                    }}>
                      <Icon size={24} color="#fff" />
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{portal.title}</h3>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{portal.subtitle}</p>
                  </div>

                  {/* Features list */}
                  <div style={{ padding: '24px 28px' }}>
                    {portal.features.map((feature, fi) => (
                      <div key={fi} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 0',
                        borderBottom: fi < portal.features.length - 1 ? '1px solid var(--border-soft)' : 'none',
                      }}>
                        <CheckCircle2 size={16} style={{ color: portal.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{feature}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => onNavigate(portal.path)}
                      style={{
                        marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '12px', borderRadius: 12, width: '100%',
                        background: `${portal.color}15`, color: portal.color,
                        fontSize: 14, fontWeight: 700, transition: 'all 0.25s',
                        border: `1px solid ${portal.color}30`, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = portal.color; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = `0 4px 20px ${portal.color}40`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${portal.color}15`; e.currentTarget.style.color = portal.color; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      الدخول <ChevronLeft size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES SECTION ═══ */}
      <section className="landing-section-pad" style={{ padding: '80px 32px', background: 'var(--bg-overlay)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 12 }}>
              لماذا Half Lens؟
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
              أدوات متكاملة مصممة خصيصاً لشركات الإنتاج
            </p>
          </div>

          <div className="landing-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { icon: BarChart3, title: 'تقارير متقدمة', desc: 'تحليلات مالية وتقارير أداء تفصيلية لمشاريعك', color: '#2563eb' },
              { icon: Globe, title: 'دعم كامل للعربية', desc: 'واجهة عربية متكاملة مع دعم RTL بالكامل', color: '#059669' },
              { icon: Shield, title: 'أمان متقدم', desc: 'تسجيل دخول آمن مع OTP وصلاحيات مخصصة', color: '#7c3aed' },
              { icon: Zap, title: 'أداء فائق', desc: 'واجهة سريعة ومتجاوبة تعمل على جميع الأجهزة', color: '#f59e0b' },
              { icon: Users, title: 'إدارة الفريق', desc: 'أدوار وصلاحيات مخصصة لكل عضو في الفريق', color: '#ec4899' },
              { icon: Camera, title: 'كتالوج المعدات', desc: 'إدارة كاملة لمعدات التصوير والإنتاج', color: '#06b6d4' },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="landing-feature" style={{
                  padding: 24, borderRadius: 16,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-soft)',
                  animationDelay: `${i * 0.1}s`,
                  transition: 'all 0.3s', textAlign: 'center',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = feature.color; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${feature.color}15`, color: feature.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <Icon size={22} />
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{feature.title}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>{feature.desc}</p>
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
          <a onClick={() => onNavigate('/privacy')} style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'none' }}>سياسة الخصوصية</a>
        </div>
      </footer>
    </div>
  );
};
