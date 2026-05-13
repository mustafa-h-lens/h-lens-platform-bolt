import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface Section {
  id: string;
  icon: string;
  title: string;
  body?: string;
  items?: Array<{ title: string; desc: string }>;
}

interface PrivacyContent {
  lastUpdated: string;
  sections: Section[];
}

const LOGO = "/assets/logo-white.png";

// Phone-themed section icons get a green tint (contact / call us); everything else stays cyan.
const iconPalette = (icon: string): { bg: string; border: string; bar: string } => {
  if (icon && /[📞☎📱📲]/.test(icon)) {
    return {
      bg: 'rgba(16,185,129,0.14)',
      border: 'rgba(16,185,129,0.28)',
      bar: 'linear-gradient(135deg,rgba(16,185,129,0.07) 0%,transparent 100%)',
    };
  }
  return {
    bg: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.18)',
    bar: 'linear-gradient(135deg,rgba(6,182,212,0.05) 0%,transparent 100%)',
  };
};

const DEFAULT_CONFIDENTIALITY_CONTENT: PrivacyContent = {
  lastUpdated: '4 مايو 2026',
  sections: [
    {
      id: 'intro',
      icon: '🔐',
      title: 'مقدمة',
      body: 'اتفاقية عدم إفصاح وسرّية المعلومات تنظّم العلاقة بين Half Lens والطرف المتعاون أثناء العمل والتعاون. الهدف: حماية كل معلومة سرّية يتم الاطلاع عليها أو تبادلها بين الطرفين.'
    },
    {
      id: 'definitions',
      icon: '📖',
      title: 'أولاً: التعريفات',
      body: 'يُقصد بالمعلومات السرّية كل ما يخص Half Lens من بيانات أو مواد، سواء كانت مرئية أو سمعية أو مكتوبة أو رقمية، وتشمل على سبيل المثال لا الحصر:',
      items: [
        { title: 'المواد البصرية', desc: 'مقاطع الفيديو، الصور، التصاميم، الرسوم، العروض التقديمية، والهويات السمعية والبصرية.' },
        { title: 'التسجيلات والاجتماعات', desc: 'التسجيلات الصوتية، المكالمات، الاجتماعات، والمقابلات.' },
        { title: 'المحتوى الإبداعي والإعلامي', desc: 'أي مواد إعلامية أو إعلانية أو إبداعية يتم الاطلاع عليها أو سماعها أثناء العمل أو التعاون.' }
      ]
    },
    {
      id: 'confidentiality',
      icon: '🤐',
      title: 'ثانياً: السرّية',
      body: 'يلتزم الطرف المتعاون بالمحافظة التامة على سرّية جميع المعلومات المرئية والسمعية، وعدم إفشائها أو مشاركتها أو نشرها أو استخدامها بأي شكل، سواء بشكل مباشر أو غير مباشر، إلا بموافقة خطية مسبقة من Half Lens.'
    },
    {
      id: 'use',
      icon: '🎯',
      title: 'ثالثاً: استخدام المعلومات',
      body: 'تُستخدم المعلومات حصراً لغرض العمل والتعاون المتفق عليه بين الطرفين، ويُمنع منعاً تاماً استخدامها لأي غرض شخصي أو تجاري أو إعلامي خارج هذا النطاق.'
    },
    {
      id: 'restrictions',
      icon: '⛔',
      title: 'رابعاً: الحظر',
      body: 'يُحظر على الطرف المتعاون ما يلي:',
      items: [
        { title: 'النسخ وإعادة الإنتاج', desc: 'نسخ أو تسجيل أو إعادة إنتاج أي مواد مرئية أو مسموعة.' },
        { title: 'النشر العلني', desc: 'نشر أو مشاركة المحتوى عبر وسائل التواصل الاجتماعي أو أي منصات أخرى.' },
        { title: 'تمكين طرف ثالث', desc: 'تمكين أي طرف ثالث من الاطلاع على المحتوى أو الاستماع إليه.' }
      ]
    },
    {
      id: 'breach',
      icon: '⚖️',
      title: 'خامساً: الإخلال بالاتفاقية',
      body: 'في حال الإخلال بأي بند من بنود هذه السياسة، يحق لـ Half Lens المطالبة بالتعويض عن كافة الأضرار المادية والمعنوية، مع الاحتفاظ بحقها الكامل في اتخاذ الإجراءات النظامية وفق أنظمة المملكة العربية السعودية.'
    },
    {
      id: 'general',
      icon: '🇸🇦',
      title: 'سادساً: أحكام عامة',
      body: 'تخضع هذه السياسة وتُفسَّر وفق الأنظمة المعمول بها داخل المملكة العربية السعودية، وهي ملزمة للطرفين. أي تعديل لا يكون نافذاً إلا بموافقة خطية من الطرفين.'
    }
  ]
};

export const PrivacyPolicy: React.FC = () => {
  const [content, setContent] = useState<PrivacyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    loadPrivacy();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      if (content?.sections) {
        for (const sec of [...content.sections].reverse()) {
          const el = document.getElementById(sec.id);
          if (el && el.getBoundingClientRect().top <= 100) {
            setActiveSection(sec.id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [content]);

  async function loadPrivacy() {
    try {
      const { data, error } = await supabase
        .from('legal_pages')
        .select('*')
        .eq('type', 'privacy')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setContent(data.content as PrivacyContent);
      } else {
        setContent(DEFAULT_CONFIDENTIALITY_CONTENT);
      }
    } catch (error) {
      console.error('Error loading privacy:', error);
      setContent(DEFAULT_CONFIDENTIALITY_CONTENT);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#040c1c',
        color: 'white'
      }}>
        جاري التحميل...
      </div>
    );
  }

  if (!content) return null;

  const handleBack = () => {
    // The TOC links on this page push a #hash for each section, so a single
    // history.back() often just removes the hash and keeps the user on the
    // privacy page (especially on iOS Safari). Detect that and fall back to
    // a hard navigation. We still try history.back() first because in the
    // registration flow it preserves wizard state.
    const before = window.location.pathname + window.location.search;
    const isPrivacyPath = (p: string) => p.includes('/privacy');
    if (window.history.length > 1) {
      try { window.history.back(); } catch { /* fall through */ }
      // If we're still on /privacy after a tick, force-navigate home.
      window.setTimeout(() => {
        const after = window.location.pathname + window.location.search;
        if (after === before || isPrivacyPath(after)) {
          window.location.href = '/';
        }
      }, 250);
      return;
    }
    // Fresh tab (target="_blank") — close it so the original tab is preserved.
    // If the browser refuses, navigate home as a last resort.
    try {
      window.close();
      window.setTimeout(() => { if (!window.closed) window.location.href = '/'; }, 100);
    } catch { window.location.href = '/'; }
  };

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      html{scroll-behavior:smooth}
      ::-webkit-scrollbar{width:4px}
      ::-webkit-scrollbar-thumb{background:rgba(6,182,212,0.4);border-radius:2px}
      @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      .sec-card{transition:all .25s ease}
      .sec-card:hover{transform:translateY(-2px)}
      .nav-link{transition:all .2s}
      .nav-link:hover{color:#67e8f9!important}
      .item-row{transition:all .15s}
      .item-row:hover{background:rgba(6,182,212,0.06)!important}

      .legal-page{overflow-x:hidden}
      .legal-header{padding:0 24px}
      .legal-hero{padding:52px 24px 40px}
      .legal-hero h1{font-size:2.2rem}
      .legal-hero .hero-sub{font-size:.88rem;max-width:480px}
      .legal-hero .hero-meta{font-size:.75rem}
      .legal-grid{max-width:1000px;margin:0 auto;padding:0 20px 60px;display:grid;grid-template-columns:220px 1fr;gap:28px;align-items:start}
      .legal-toc{position:sticky;top:72px;border-radius:16px;background:rgba(5,20,35,0.8);border:1px solid rgba(6,182,212,0.08);overflow:hidden;animation:fadeIn .6s ease .2s both}
      .legal-toc-title{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:.72rem;font-weight:700;color:rgba(255,255,255,0.25);letter-spacing:.1em;text-transform:uppercase}
      .legal-toc-list{display:flex;flex-direction:column}
      .legal-toc .nav-link{display:flex;align-items:center;gap:8px;padding:9px 14px;text-decoration:none;border-bottom:1px solid rgba(255,255,255,0.03);font-size:.78rem;border-right:2px solid transparent}
      .legal-content{display:flex;flex-direction:column;gap:16px;padding-top:4px;min-width:0}

      @media(max-width:900px){
        .legal-grid{grid-template-columns:180px 1fr;gap:20px}
      }

      @media(max-width:700px){
        .legal-header{padding:0 16px;height:56px!important}
        .legal-header img{height:38px!important}
        .legal-header .site-btn{padding:6px 10px!important;font-size:.72rem!important}
        .legal-hero{padding:28px 16px 24px}
        .legal-hero h1{font-size:1.5rem;margin-bottom:8px}
        .legal-hero .hero-badge{padding:4px 12px!important;margin-bottom:12px!important}
        .legal-hero .hero-badge span:last-child{font-size:.68rem!important}
        .legal-hero .hero-sub{font-size:.82rem;max-width:100%;line-height:1.6;margin-bottom:10px!important}
        .legal-hero .hero-meta{font-size:.7rem;flex-wrap:wrap;justify-content:center;gap:4px!important;row-gap:6px!important}
        .legal-hero .hero-meta .status-pill{margin-right:0!important}

        .legal-grid{grid-template-columns:1fr;gap:16px;padding:0 14px 40px}
        .legal-toc{position:static;top:auto}
        .legal-toc-title{padding:10px 12px;font-size:.68rem}
        .legal-toc-list{flex-direction:row;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:8px 10px;gap:6px}
        .legal-toc-list::-webkit-scrollbar{display:none}
        .legal-toc .nav-link{flex-shrink:0;white-space:nowrap;padding:7px 12px;border-bottom:none;border-right:none;border-radius:999px;background:rgba(255,255,255,0.04)!important;border:1px solid rgba(255,255,255,0.06)}
        .legal-toc .nav-link.is-active{background:rgba(6,182,212,0.18)!important;border-color:rgba(6,182,212,0.35);color:#67e8f9!important}

        .sec-card{border-radius:14px!important}
        .sec-card > div:first-child{padding:14px 14px!important;gap:10px!important}
        .sec-card > div:first-child > div:first-child{width:32px!important;height:32px!important;border-radius:9px!important;font-size:.95rem!important}
        .sec-card > div:first-child .sec-title{font-size:.88rem!important}
        .sec-card > div:last-child{padding:14px 14px!important}
        .sec-card p{font-size:.82rem!important;line-height:1.75!important}
        .sec-card .item-row{padding:8px 6px!important;gap:10px!important}
        .sec-card .item-title{font-size:.8rem!important}
        .sec-card .item-desc{font-size:.76rem!important}

        .legal-footer{padding:20px 16px!important;font-size:.7rem!important}
        .legal-footer img{height:32px!important}
      }

      .legal-back{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.72);cursor:pointer;font-family:inherit;font-size:.78rem;font-weight:600;transition:all .2s}
      .legal-back:hover{background:rgba(255,255,255,0.1);color:#fff}
      @media(max-width:700px){.legal-back{padding:6px 10px;font-size:.72rem}}
    `}</style>

    <div className="legal-page" dir="rtl" style={{minHeight:"100vh",fontFamily:"Cairo,sans-serif",background:"#03111e",color:"#e2e8f0"}}>
      <header className="legal-header" style={{position:"sticky",top:0,zIndex:50,height:60,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,transition:"all .3s",background:scrolled?"rgba(3,17,30,0.97)":"transparent",backdropFilter:scrolled?"blur(16px)":"none",borderBottom:scrolled?"1px solid rgba(255,255,255,0.06)":"none"}}>
        <a href="/" aria-label="الصفحة الرئيسية" style={{display:"flex",alignItems:"center",minWidth:0,cursor:"pointer",transition:"opacity .2s"}} onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          <img src={LOGO} alt="Half Lens" style={{height:42,objectFit:"contain"}}/>
        </a>
        <button type="button" onClick={handleBack} className="legal-back" aria-label="رجوع">
          <span aria-hidden>←</span>
          <span>رجوع</span>
        </button>
      </header>

      <div className="legal-hero" style={{textAlign:"center",background:"linear-gradient(180deg,rgba(6,182,212,0.08) 0%,transparent 100%)",animation:"fadeUp .5s ease",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(6,182,212,0.08) 0%,transparent 70%)",filter:"blur(40px)"}}/>
        </div>
        <div style={{position:"relative",zIndex:1}}>
          <div className="hero-badge" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"5px 14px",borderRadius:20,background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.2)",marginBottom:16}}>
            <span style={{fontSize:".95rem"}}>🔐</span>
            <span style={{fontSize:".75rem",fontWeight:600,color:"#67e8f9",letterSpacing:".06em"}}>CONFIDENTIALITY</span>
          </div>
          <h1 style={{fontWeight:900,color:"white",marginBottom:10,lineHeight:1.2}}>سياسة السرّية</h1>
          <p className="hero-sub" style={{color:"rgba(255,255,255,0.4)",margin:"0 auto 14px",lineHeight:1.7}}>اتفاقية عدم الإفصاح وسرّية المعلومات بين Half Lens والطرف المتعاون</p>
          <div className="hero-meta" style={{display:"inline-flex",alignItems:"center",gap:6,color:"rgba(255,255,255,0.3)"}}>
            <span>📅</span>
            <span>آخر تحديث: {content.lastUpdated}</span>
            <span className="status-pill" style={{padding:"2px 8px",borderRadius:5,background:"rgba(16,185,129,0.1)",color:"#6ee7b7",border:"1px solid rgba(16,185,129,0.2)",marginRight:6}}>نسخة سارية</span>
          </div>
        </div>
      </div>

      <div className="legal-grid">
        <div className="legal-toc">
          <div className="legal-toc-title">المحتويات</div>
          <div className="legal-toc-list">
            {content.sections.map((s)=>{
              const active = activeSection===s.id;
              return (
                <a key={s.id} href={`#${s.id}`} className={`nav-link${active?' is-active':''}`}
                  style={{color:active?"#67e8f9":"rgba(255,255,255,0.45)",background:active?"rgba(6,182,212,0.1)":"transparent",borderRight:active?"2px solid #06b6d4":"2px solid transparent",fontWeight:active?700:400}}>
                  <span style={{fontSize:".8rem",opacity:.8}}>{s.icon}</span>
                  {s.title}
                </a>
              );
            })}
          </div>
        </div>

        <div className="legal-content">
          {content.sections.map((sec,i)=>{
            const pal = iconPalette(sec.icon);
            return (
            <div id={sec.id} key={sec.id} className="sec-card"
              style={{borderRadius:16,background:"rgba(5,20,35,0.7)",border:"1px solid rgba(6,182,212,0.08)",overflow:"hidden",animation:`fadeUp .4s ease ${i*.05}s both`}}>
              <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",gap:10,background:pal.bar}}>
                <div style={{width:36,height:36,borderRadius:10,background:pal.bg,border:`1px solid ${pal.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",flexShrink:0}}>{sec.icon}</div>
                <div style={{minWidth:0}}>
                  <div className="sec-title" style={{fontSize:".95rem",fontWeight:800,color:"#e2e8f0"}}>{sec.title}</div>
                </div>
              </div>
              <div style={{padding:"18px 20px"}}>
                {sec.body&&(
                  <p style={{fontSize:".84rem",color:"rgba(255,255,255,0.55)",lineHeight:1.85,whiteSpace:"pre-line"}}>{sec.body}</p>
                )}
                {sec.items&&(
                  <div style={{display:"flex",flexDirection:"column",gap:0}}>
                    {sec.items.map((item,j)=>(
                      <div key={j} className="item-row" style={{display:"flex",gap:12,padding:"10px 10px",borderRadius:10,margin:"2px 0"}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:"#06b6d4",flexShrink:0,marginTop:7}}/>
                        <div style={{minWidth:0}}>
                          <div className="item-title" style={{fontSize:".83rem",fontWeight:700,color:"rgba(255,255,255,0.8)",marginBottom:3}}>{item.title}</div>
                          <div className="item-desc" style={{fontSize:".79rem",color:"rgba(255,255,255,0.45)",lineHeight:1.6}}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <div className="legal-footer" style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"24px",textAlign:"center"}}>
        <img src={LOGO} alt="Half Lens" style={{height:40,objectFit:"contain",marginBottom:10,opacity:.5}}/>
        <div style={{fontSize:".75rem",color:"rgba(255,255,255,0.2)"}}>
          © 2026 Half Lens Production — جميع الحقوق محفوظة
          <span style={{margin:"0 8px"}}>·</span>
          <a href="/terms-and-conditions" style={{color:"#06b6d4",textDecoration:"none"}}>الشروط والأحكام</a>
        </div>
      </div>
    </div>
  </>);
};
