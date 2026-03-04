import { useState } from 'react';
import { Mail, Loader2, ArrowLeft, Shield } from 'lucide-react';

interface SupplierLoginProps {
  onOTPSent: (email: string, otpCode?: string) => void;
}

export default function SupplierLogin({ onOTPSent }: SupplierLoginProps) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [devOTP, setDevOTP]   = useState<string | null>(null);

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
      if (data.otp) setDevOTP(data.otp);
      onOTPSent(email, data.otp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#020b18 0%,#051A3A 50%,#0a2d5e 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', fontFamily:'Tajawal,sans-serif', direction:'rtl', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'-10%', right:'-5%', width:500, height:500, background:'radial-gradient(circle,rgba(37,99,235,0.12) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:400, height:400, background:'radial-gradient(circle,rgba(124,58,237,0.1) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize:'28px 28px', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <img src="/half_lens_logo_-_color.png" alt="Half Lens" style={{ height:52, margin:'0 auto 14px' }} />
          <div style={{ fontSize:'0.75rem', color:'rgba(148,163,184,0.7)', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:500 }}>نظام إدارة الموردين</div>
        </div>

        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:20, padding:'2rem', backdropFilter:'blur(20px)', boxShadow:'0 25px 60px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          <div style={{ textAlign:'center', marginBottom:22 }}>
            <div style={{ width:54, height:54, borderRadius:14, background:'linear-gradient(135deg,rgba(37,99,235,0.25),rgba(124,58,237,0.2))', border:'1px solid rgba(59,130,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <Shield size={24} color="#60a5fa" />
            </div>
            <h1 style={{ fontSize:'1.2rem', fontWeight:800, color:'white', marginBottom:6 }}>تسجيل دخول الموردين</h1>
            <p style={{ fontSize:'0.82rem', color:'rgba(148,163,184,0.8)', lineHeight:1.6 }}>أدخل بريدك الإلكتروني وسنرسل لك رمز تحقق</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:'0.78rem', fontWeight:600, color:'rgba(203,213,225,0.9)', marginBottom:8 }}>البريد الإلكتروني</label>
              <div style={{ position:'relative' }}>
                <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'rgba(148,163,184,0.6)' }}><Mail size={17} /></div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" disabled={loading} dir="ltr"
                  style={{ width:'100%', padding:'11px 14px 11px 40px', borderRadius:11, background:'rgba(255,255,255,0.06)', border:`1px solid ${error?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.1)'}`, color:'white', fontFamily:'Tajawal,sans-serif', fontSize:'0.88rem', outline:'none', transition:'all 0.2s', boxSizing:'border-box' }}
                  onFocus={e => { e.target.style.borderColor='rgba(59,130,246,0.6)'; e.target.style.background='rgba(59,130,246,0.07)'; }}
                  onBlur={e => { e.target.style.borderColor=error?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.1)'; e.target.style.background='rgba(255,255,255,0.06)'; }}
                />
              </div>
            </div>

            {error && (
              <div style={{ marginBottom:14, padding:'10px 13px', borderRadius:9, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)' }}>
                <p style={{ fontSize:'0.8rem', color:'#fca5a5' }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'12px', borderRadius:11, border:'none', background:loading?'rgba(37,99,235,0.4)':'linear-gradient(135deg,#1d4ed8,#2563eb)', color:'white', fontFamily:'Tajawal,sans-serif', fontSize:'0.9rem', fontWeight:700, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:loading?'none':'0 4px 20px rgba(37,99,235,0.35)', transition:'all 0.2s', marginTop:6 }}>
              {loading ? <><Loader2 size={18} className="animate-spin" /><span>جاري الإرسال...</span></> : <><span>إرسال رمز التحقق</span><ArrowLeft size={17} /></>}
            </button>
          </form>

          {devOTP && (
            <div style={{ marginTop:16, padding:'12px', borderRadius:11, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.35)', textAlign:'center' }}>
              <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#93c5fd', marginBottom:6 }}>🔐 DEV MODE — OTP</p>
              <p style={{ fontSize:'1.8rem', fontWeight:900, color:'#60a5fa', letterSpacing:'0.25em', direction:'ltr' }}>{devOTP}</p>
            </div>
          )}

          <div style={{ marginTop:18, padding:'11px 13px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize:'0.75rem', color:'rgba(148,163,184,0.7)', lineHeight:1.7 }}>💡 سيتم إرسال رمز التحقق إلى بريدك المسجل في النظام. الرمز صالح لمدة 10 دقائق.</p>
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:20 }}>
          <p style={{ fontSize:'0.74rem', color:'rgba(100,116,139,0.7)' }}>© 2025 Half Lens. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </div>
  );
}
