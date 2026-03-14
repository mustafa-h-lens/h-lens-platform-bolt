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
        setContent({
          lastUpdated: '28 فبراير 2026',
          sections: [
            {
              id: 'intro',
              icon: '🛡️',
              title: 'مقدمة',
              body: `تلتزم منصة Half Lens بحماية خصوصيتك وصون بياناتك الشخصية. تُوضّح هذه السياسة كيفية جمع معلوماتك واستخدامها وحمايتها عند استخدامك لخدماتنا.`
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error loading privacy:', error);
      setContent({
        lastUpdated: '28 فبراير 2026',
        sections: [
          {
            id: 'intro',
            icon: '🛡️',
            title: 'مقدمة',
            body: `تلتزم منصة Half Lens بحماية خصوصيتك وصون بياناتك الشخصية.`
          }
        ]
      });
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

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      html{scroll-behavior:smooth}
      ::-webkit-scrollbar{width:4px}
      ::-webkit-scrollbar-thumb{background:rgba(59,130,246,0.4);border-radius:2px}
      @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      .sec-card{transition:all .25s ease}
      .sec-card:hover{transform:translateY(-2px)}
      .nav-link{transition:all .2s}
      .nav-link:hover{color:#93c5fd!important}
      .item-row{transition:all .15s}
      .item-row:hover{background:rgba(59,130,246,0.06)!important}
    `}</style>

    <div dir="rtl" style={{minHeight:"100vh",fontFamily:"Cairo,sans-serif",background:"#040c1c",color:"#e2e8f0"}}>
      <header style={{position:"sticky",top:0,zIndex:50,padding:"0 24px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all .3s",background:scrolled?"rgba(4,12,28,0.97)":"transparent",backdropFilter:scrolled?"blur(16px)":"none",borderBottom:scrolled?"1px solid rgba(255,255,255,0.06)":"none"}}>
        <img src={LOGO} alt="Half Lens" style={{height:48,objectFit:"contain"}}/>
        <a href="https://h-lens.co" style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:9,background:"rgba(37,99,235,0.12)",border:"1px solid rgba(59,130,246,0.2)",color:"#93c5fd",textDecoration:"none",fontSize:".78rem",fontWeight:600,transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(37,99,235,0.2)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(37,99,235,0.12)"}>
          🌐 الموقع الإلكتروني
        </a>
      </header>

      <div style={{padding:"52px 24px 40px",textAlign:"center",background:"linear-gradient(180deg,rgba(29,78,216,0.1) 0%,transparent 100%)",animation:"fadeUp .5s ease",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(29,78,216,0.08) 0%,transparent 70%)",filter:"blur(40px)"}}/>
        </div>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"5px 14px",borderRadius:20,background:"rgba(37,99,235,0.1)",border:"1px solid rgba(59,130,246,0.2)",marginBottom:16}}>
            <span style={{fontSize:".95rem"}}>🛡️</span>
            <span style={{fontSize:".75rem",fontWeight:600,color:"#93c5fd",letterSpacing:".06em"}}>PRIVACY POLICY</span>
          </div>
          <h1 style={{fontSize:"2.2rem",fontWeight:900,color:"white",marginBottom:10,lineHeight:1.2}}>سياسة الخصوصية</h1>
          <p style={{fontSize:".88rem",color:"rgba(255,255,255,0.4)",maxWidth:480,margin:"0 auto 14px",lineHeight:1.7}}>نلتزم بشفافية كاملة حول كيفية تعاملنا مع بياناتك الشخصية وحمايتها</p>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:".75rem",color:"rgba(255,255,255,0.3)"}}>
            <span>📅</span>
            <span>آخر تحديث: {content.lastUpdated}</span>
            <span style={{padding:"2px 8px",borderRadius:5,background:"rgba(16,185,129,0.1)",color:"#6ee7b7",border:"1px solid rgba(16,185,129,0.2)",marginRight:6}}>نسخة سارية</span>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1000,margin:"0 auto",padding:"0 20px 60px",display:"grid",gridTemplateColumns:"220px 1fr",gap:28,alignItems:"start"}}>
        <div style={{position:"sticky",top:72,borderRadius:16,background:"rgba(8,18,38,0.8)",border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden",animation:"fadeIn .6s ease .2s both"}}>
          <div style={{padding:"12px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)",fontSize:".72rem",fontWeight:700,color:"rgba(255,255,255,0.25)",letterSpacing:".1em",textTransform:"uppercase"}}>المحتويات</div>
          {content.sections.map((s)=>(
            <a key={s.id} href={`#${s.id}`} className="nav-link"
              style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",textDecoration:"none",borderBottom:"1px solid rgba(255,255,255,0.03)",color:activeSection===s.id?"#93c5fd":"rgba(255,255,255,0.45)",background:activeSection===s.id?"rgba(37,99,235,0.1)":"transparent",borderRight:activeSection===s.id?"2px solid #3b82f6":"2px solid transparent",fontSize:".78rem",fontWeight:activeSection===s.id?700:400}}>
              <span style={{fontSize:".8rem",opacity:.8}}>{s.icon}</span>
              {s.title}
            </a>
          ))}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:16,paddingTop:4}}>
          {content.sections.map((sec,i)=>(
            <div id={sec.id} key={sec.id} className="sec-card"
              style={{borderRadius:16,background:"rgba(8,18,38,0.7)",border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden",animation:`fadeUp .4s ease ${i*.05}s both`}}>
              <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",gap:10,background:"linear-gradient(135deg,rgba(29,78,216,0.05) 0%,transparent 100%)"}}>
                <div style={{width:36,height:36,borderRadius:10,background:"rgba(37,99,235,0.12)",border:"1px solid rgba(59,130,246,0.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",flexShrink:0}}>{sec.icon}</div>
                <div>
                  <div style={{fontSize:".95rem",fontWeight:800,color:"#e2e8f0"}}>{sec.title}</div>
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
                        <div style={{width:6,height:6,borderRadius:"50%",background:"#3b82f6",flexShrink:0,marginTop:7}}/>
                        <div>
                          <div style={{fontSize:".83rem",fontWeight:700,color:"rgba(255,255,255,0.8)",marginBottom:3}}>{item.title}</div>
                          <div style={{fontSize:".79rem",color:"rgba(255,255,255,0.45)",lineHeight:1.6}}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"24px",textAlign:"center"}}>
        <img src={LOGO} alt="Half Lens" style={{height:40,objectFit:"contain",marginBottom:10,opacity:.5}}/>
        <div style={{fontSize:".75rem",color:"rgba(255,255,255,0.2)"}}>
          © 2026 Half Lens Production — جميع الحقوق محفوظة
          <span style={{margin:"0 8px"}}>·</span>
          <a href="/terms" style={{color:"#3b82f6",textDecoration:"none"}}>الشروط والأحكام</a>
        </div>
      </div>
    </div>
  </>);
};
