import { useState } from 'react';
import { Loader2, ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SupplierLoginProps {
  onOTPSent: (email: string, otpCode?: string) => void;
}

export default function SupplierLogin({ onOTPSent }: SupplierLoginProps) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const { isDarkMode, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !email.includes('@')) { setError('يرجى إدخال بريد إلكتروني صالح'); return; }
    setLoading(true);
    try {
      const deviceInfo = navigator.userAgent.includes('Mobile') ? 'جوال' : 'كمبيوتر';
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ email, deviceInfo }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'حدث خطأ أثناء إرسال رمز التحقق');
      onOTPSent(email, data.otp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في الاتصال');
    } finally { setLoading(false); }
  };

  const logo = isDarkMode ? '/Logo_White.png' : '/Logo_Blue.png';

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(170deg,#060f1e 0%,#081628 55%,#0a1c36 100%)', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden', fontFamily:'Tajawal,sans-serif', direction:'rtl' }}>

      {/* bg glow */}
      <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:900, height:600, background:'radial-gradient(ellipse,rgba(8,40,120,0.28) 0%,transparent 65%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.016) 1px,transparent 1px)', backgroundSize:'30px 30px', pointerEvents:'none' }} />

      {/* TOP BAR — direction:ltr to fix physical positions */}
      <div style={{ display:'flex', flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:'20px 28px', position:'relative', zIndex:10, direction:'ltr' }}>
        {/* theme toggle — physical left */}
        <button onClick={toggleTheme}
          style={{ width:46, height:46, borderRadius:13, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          {isDarkMode ? <Sun size={20} color="#f59e0b" /> : <Moon size={20} color="#93c5fd" />}
        </button>
        {/* logo — physical right */}
        <img src={logo} alt="Half Lens" style={{ height:54, objectFit:'contain' }} />
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 1rem 3rem' }}>
        <div style={{ width:'100%', maxWidth:440, position:'relative', zIndex:1 }}>

          {/* CARD */}
          <div style={{ background:'rgba(8,18,48,0.65)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:22, padding:'2.25rem 2rem 2rem', backdropFilter:'blur(24px)', boxShadow:'0 30px 80px rgba(0,0,0,0.55)' }}>

            {/* MAIL ICON + PULSE */}
            <div style={{ display:'flex', justifyContent:'center', marginBottom:22 }}>
              <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center', width:100, height:100 }}>
                {/* pulse ring 1 */}
                <div style={{ position:'absolute', inset:0, borderRadius:20, background:'rgba(59,130,246,0.2)', animation:'pulse1 2.2s ease-out infinite' }} />
                {/* pulse ring 2 */}
                <div style={{ position:'absolute', inset:-8, borderRadius:24, background:'rgba(59,130,246,0.1)', animation:'pulse2 2.2s ease-out 0.7s infinite' }} />
                {/* icon box */}
                <div style={{ width:68, height:68, borderRadius:17, background:'linear-gradient(145deg,#1e3fa0,#2150e8)', border:'1px solid rgba(120,160,255,0.4)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 30px rgba(37,99,235,0.45)', position:'relative', zIndex:2 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(210,225,255,0.92)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* TITLE */}
            <div style={{ textAlign:'center', marginBottom:22 }}>
              <h1 style={{ fontSize:'1.7rem', fontWeight:900, color:'white', marginBottom:8 }}>تسجيل الدخول</h1>
              <p style={{ fontSize:'0.88rem', color:'rgba(148,163,184,0.78)', lineHeight:1.7 }}>أدخل بريدك الإلكتروني وسنرسل إليك رمز تحقق</p>
            </div>

            {/* EMAIL FIELD */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:'0.82rem', fontWeight:700, color:'rgba(185,205,235,0.85)', marginBottom:8, textAlign:'right' }}>البريد الإلكتروني</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com" disabled={loading} dir="ltr"
                  style={{ width:'100%', padding:'12px 14px', borderRadius:11, background:'rgba(255,255,255,0.055)', border:`1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, color:'white', fontFamily:'Tajawal,sans-serif', fontSize:'0.92rem', outline:'none', transition:'border 0.2s,box-shadow 0.2s', boxSizing:'border-box' }}
                  onFocus={e => { e.target.style.borderColor='rgba(59,130,246,0.6)'; e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor=error?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.1)'; e.target.style.boxShadow='none'; }}
                />
              </div>

              {error && (
                <div style={{ marginBottom:12, padding:'10px 13px', borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)' }}>
                  <p style={{ fontSize:'0.8rem', color:'#fca5a5', textAlign:'right' }}>{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:13, borderRadius:11, border:'none', background:loading?'rgba(37,99,235,0.4)':'linear-gradient(135deg,#1d4ed8,#2563eb)', color:'white', fontFamily:'Tajawal,sans-serif', fontSize:'0.92rem', fontWeight:800, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:9, boxShadow:loading?'none':'0 4px 20px rgba(37,99,235,0.4)', transition:'all 0.2s', marginBottom:16 }}>
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /><span>جاري الإرسال...</span></>
                  : <><span>إرسال رمز التحقق</span><ArrowLeft size={17} /></>
                }
              </button>
            </form>

            {/* INFO NOTE */}
            <div style={{ padding:'11px 13px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize:'0.75rem', color:'rgba(148,163,184,0.7)', lineHeight:1.7, textAlign:'right' }}>
                💡 سيتم إرسال رمز التحقق إلى بريدك المسجل في النظام. الرمز صالح لمدة 10 دقائق.
              </p>
            </div>
          </div>

          {/* REGISTER LINK */}
          <div style={{ textAlign:'center', marginTop:20 }}>
            <p style={{ fontSize:'0.84rem', color:'rgba(100,116,139,0.8)' }}>
              لست موّرداً بعد؟{' '}
              <a href="/vendor-registration" style={{ color:'#60a5fa', fontWeight:700, textDecoration:'none' }}>سجّل حسابك</a>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse1 {
          0%   { transform: scale(1);    opacity: 0.7; }
          70%  { transform: scale(1.5);  opacity: 0;   }
          100% { transform: scale(1.5);  opacity: 0;   }
        }
        @keyframes pulse2 {
          0%   { transform: scale(1);    opacity: 0.45; }
          70%  { transform: scale(1.75); opacity: 0;    }
          100% { transform: scale(1.75); opacity: 0;    }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
