import { useState, useEffect } from 'react';
import { Camera, Users, Briefcase, Shield, ChevronLeft, ArrowLeft, Zap, Globe, BarChart3, Clock, Star, CheckCircle2, Sun, Moon } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage = ({ onNavigate }: LandingPageProps) => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
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
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
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
    { value: '+500', label: 'مشروع مكتمل', icon: Briefcase },
    { value: '+200', label: 'مورد موثق', icon: Users },
    { value: '24/7', label: 'دعم متواصل', icon: Clock },
    { value: '99.9%', label: 'وقت التشغيل', icon: Zap },
  ];

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Cairo', 'Tajawal', sans-serif", direction: 'rtl', background: 'var(--bg-base)', color: 'var(--text-primary)', overflow: 'hidden' }}>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-right { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes border-glow { 0%, 100% { border-color: rgba(37,99,235,0.2); } 50% { border-color: rgba(37,99,235,0.5); } }
        .landing-card { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .landing-card:hover { transform: translateY(-8px); box-shadow: 0 25px 60px rgba(0,0,0,0.15); }
        .landing-feature { opacity: 0; animation: slide-up 0.6s ease forwards; }
        .landing-stat { opacity: 0; animation: slide-up 0.5s ease forwards; }
        .landing-blob { position: absolute; border-radius: 50%; filter: blur(100px); pointer-events: none; animation: pulse-glow 8s ease-in-out infinite; }

        /* ── Mobile responsive ── */
        @media (max-width: 768px) {
          .landing-stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 16px !important; }
          .landing-portals-grid { grid-template-columns: 1fr !important; }
          .landing-features-grid { grid-template-columns: 1fr !important; }
          .landing-hero-section { padding: 100px 20px 60px !important; }
          .landing-section-pad { padding-left: 20px !important; padding-right: 20px !important; }
          .landing-cta-inner { padding: 40px 24px !important; }
          .landing-nav { padding: 12px 16px !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .landing-portals-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .landing-features-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav className="landing-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '16px 32px',
        background: scrollY > 50 ? 'rgba(var(--bg-surface-rgb, 255,255,255), 0.85)' : 'transparent',
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
          <button
            onClick={() => onNavigate('/admin')}
            style={{
              padding: '10px 24px', borderRadius: 12, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(37,99,235,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            تسجيل الدخول
          </button>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section className="landing-hero-section" style={{
        position: 'relative', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '120px 32px 80px', textAlign: 'center',
      }}>
        {/* Animated blobs */}
        <div className="landing-blob" style={{ width: 500, height: 500, top: '-10%', right: '-5%', background: 'rgba(37,99,235,0.12)', animationDelay: '0s' }} />
        <div className="landing-blob" style={{ width: 400, height: 400, bottom: '0%', left: '-5%', background: 'rgba(124,58,237,0.1)', animationDelay: '2s' }} />
        <div className="landing-blob" style={{ width: 350, height: 350, top: '30%', left: '20%', background: 'rgba(16,185,129,0.08)', animationDelay: '4s' }} />

        <div style={{
          position: 'relative', zIndex: 1, maxWidth: 800,
          opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
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
            fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, lineHeight: 1.2,
            color: 'var(--text-primary)', marginBottom: 20,
          }}>
            أدر مشاريعك الإنتاجية
            <br />
            <span style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              بكفاءة واحترافية
            </span>
          </h1>

          <p style={{
            fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.8,
            maxWidth: 600, margin: '0 auto 40px',
          }}>
            منصة Half Lens تجمع فريقك وعملاءك ومورديك في مكان واحد.
            تتبع المشاريع، أدر الفواتير، وحلل الأداء — كل ذلك بتصميم عربي متكامل.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('/admin')}
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
            <button
              onClick={() => onNavigate('/join')}
              style={{
                padding: '14px 32px', borderRadius: 14,
                border: '2px solid var(--border-soft)',
                background: 'var(--bg-surface)', color: 'var(--text-primary)',
                fontSize: 16, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.3s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Users size={18} /> سجّل كمورد
            </button>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="landing-section-pad" style={{
        padding: '40px 32px',
        background: 'var(--bg-overlay)',
        borderTop: '1px solid var(--border-soft)',
        borderBottom: '1px solid var(--border-soft)',
      }}>
        <div className="landing-stats-grid" style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="landing-stat" style={{
                textAlign: 'center', animationDelay: `${i * 0.15}s`,
              }}>
                <Icon size={24} style={{ color: 'var(--accent-lighter)', marginBottom: 8 }} />
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', direction: 'ltr' }}>{stat.value}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{stat.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ PORTALS SECTION ═══ */}
      <section className="landing-section-pad" style={{ padding: '80px 32px', position: 'relative' }}>
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
                    cursor: 'pointer', animationDelay: `${i * 0.2}s`,
                  }}
                  onClick={() => onNavigate(portal.path)}
                >
                  {/* Card header gradient */}
                  <div style={{
                    background: portal.gradient, padding: '32px 28px 24px',
                    position: 'relative', overflow: 'hidden',
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
                      marginBottom: 16, backdropFilter: 'blur(10px)',
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
                    <div style={{
                      marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '12px', borderRadius: 12,
                      background: `${portal.color}10`, color: portal.color,
                      fontSize: 14, fontWeight: 700, transition: 'all 0.2s',
                    }}>
                      الدخول <ChevronLeft size={16} />
                    </div>
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
                  transition: 'all 0.3s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = feature.color; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${feature.color}15`, color: feature.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16,
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

      {/* ═══ CTA SECTION ═══ */}
      <section className="landing-section-pad" style={{ padding: '80px 32px', textAlign: 'center' }}>
        <div className="landing-cta-inner" style={{
          maxWidth: 700, margin: '0 auto',
          background: 'linear-gradient(135deg, #1e40af, #3b82f6, #7c3aed)',
          borderRadius: 24, padding: '60px 40px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 12 }}>
              جاهز لإدارة مشاريعك باحترافية؟
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', marginBottom: 32, lineHeight: 1.7 }}>
              انضم إلى مئات شركات الإنتاج التي تدير مشاريعها عبر Half Lens
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => onNavigate('/join')}
                style={{
                  padding: '14px 32px', borderRadius: 14,
                  background: '#fff', color: '#1e40af',
                  fontSize: 15, fontWeight: 800, border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                سجّل كمورد الآن <ArrowLeft size={16} />
              </button>
              <button
                onClick={() => onNavigate('/admin')}
                style={{
                  padding: '14px 32px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.15)', color: '#fff',
                  fontSize: 15, fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              >
                تسجيل دخول الإدارة
              </button>
            </div>
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
