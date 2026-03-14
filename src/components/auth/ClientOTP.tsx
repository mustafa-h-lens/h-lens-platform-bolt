import { useState, useRef, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { clientTheme as t } from '../../theme/brandColors';

interface ClientOTPProps {
  email: string;
  onBack: () => void;
  onSuccess: (data: any) => void;
}

export default function ClientOTP({ email, onBack, onSuccess }: ClientOTPProps) {
  const [otp, setOtp]         = useState(['','','','']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number|null>(null);
  const inputRefs = useRef<(HTMLInputElement|null)[]>([]);
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp]; newOtp[index] = value.slice(-1); setOtp(newOtp);
    setError(''); setRemainingAttempts(null);
    if (value && index < 3) inputRefs.current[index+1]?.focus();
    if (newOtp.every(d=>d) && newOtp.join('').length===4) verifyOTP(newOtp.join(''));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key==='Backspace' && !otp[index] && index>0) inputRefs.current[index-1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,4);
    const n = [...otp]; for(let i=0;i<p.length;i++) n[i]=p[i]; setOtp(n);
    if(p.length===4) verifyOTP(p);
    else if(p.length>0) inputRefs.current[Math.min(p.length,3)]?.focus();
  };

  const verifyOTP = async (code: string) => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.remainingAttempts !== undefined) setRemainingAttempts(data.remainingAttempts);
        throw new Error(data.error || 'رمز التحقق غير صحيح');
      }
      setSuccess(true); setTimeout(()=>onSuccess(data), 1500);
    } catch(err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ'); setOtp(['','','','']); inputRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setLoading(true); setError(''); setOtp(['','','','']); setRemainingAttempts(null);
    try {
      const deviceInfo = navigator.userAgent.includes('Mobile') ? 'جوال' : 'كمبيوتر';
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ email, deviceInfo }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'حدث خطأ');
      inputRefs.current[0]?.focus();
    } catch(err) { setError(err instanceof Error ? err.message : 'حدث خطأ'); }
    finally { setLoading(false); }
  };

  const logo = isDarkMode ? t.logo.dark : t.logo.light;

  const boxStyle = (digit: string): React.CSSProperties => ({
    width:68, height:76, textAlign:'center', direction:'ltr',
    fontSize:'2.1rem', fontWeight:800, borderRadius:14,
    background: success?'rgba(16,185,129,0.1)': error?'rgba(239,68,68,0.1)': digit?`${t.accent}12`:'rgba(255,255,255,0.05)',
    border: `2px solid ${success?'rgba(16,185,129,0.5)': error?'rgba(239,68,68,0.5)': digit?`${t.accent}77`:'rgba(255,255,255,0.12)'}`,
    color: success?'#6ee7b7': error?'#fca5a5':'white',
    outline:'none', fontFamily:'monospace', transition:'all 0.2s',
  });

  return (
    <div style={{ minHeight:'100vh', background:t.bg, display:'flex', flexDirection:'column', position:'relative', overflow:'hidden', fontFamily:'Tajawal,sans-serif', direction:'rtl' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.016) 1px,transparent 1px)', backgroundSize:'30px 30px', pointerEvents:'none' }} />

      {/* TOP BAR */}
      <div style={{ display:'flex', flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:'20px 28px', position:'relative', zIndex:10, direction:'ltr' }}>
        <button onClick={toggleTheme} style={{ width:46, height:46, borderRadius:13, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          {isDarkMode ? <Sun size={20} color="#f59e0b" /> : <Moon size={20} color="#93c5fd" />}
        </button>
        <img src={logo} alt="Half Lens" style={{ height:54, objectFit:'contain' }} />
      </div>

      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 1rem 3rem', position:'relative', zIndex:1 }}>
        <div style={{ width:'100%', maxWidth:440 }}>
          <div style={{ background:t.cardBg, border:'1px solid rgba(255,255,255,0.07)', borderRadius:22, padding:'2.25rem 2rem 2rem', backdropFilter:'blur(24px)', boxShadow:'0 30px 80px rgba(0,0,0,0.55)' }}>

            <div style={{ textAlign:'center', marginBottom:22 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'7px 14px', borderRadius:9, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', marginBottom:14 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:'#10b981', flexShrink:0 }} />
                <span style={{ fontSize:'0.8rem', color:'rgba(200,220,255,0.85)', direction:'ltr' }}>{email}</span>
              </div>
              <h1 style={{ fontSize:'1.5rem', fontWeight:900, color:'white', marginBottom:7 }}>أدخل رمز التحقق</h1>
              <p style={{ fontSize:'0.86rem', color:'rgba(148,163,184,0.75)', lineHeight:1.6 }}>تم إرسال رمز مكون من 4 أرقام إلى بريدك</p>
            </div>

            <div style={{ display:'flex', justifyContent:'center', gap:12, marginBottom:8, direction:'ltr' }}>
              {otp.map((digit, i) => (
                <input key={i} ref={el=>inputRefs.current[i]=el} type="tel" inputMode="numeric" maxLength={1}
                  value={digit} onChange={e=>handleChange(i,e.target.value)} onKeyDown={e=>handleKeyDown(i,e)} onPaste={handlePaste}
                  disabled={loading||success} style={boxStyle(digit)} />
              ))}
            </div>

            <div style={{ textAlign:'center', margin:'12px 0 18px' }}>
              <p style={{ fontSize:'0.75rem', color:'rgba(100,116,139,0.8)', display:'inline-flex', alignItems:'center', gap:5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                الرمز صالح لمدة 10 دقائق
              </p>
            </div>

            {success && <div style={{ marginBottom:14, padding:'11px 13px', borderRadius:11, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', display:'flex', alignItems:'center', gap:10 }}><CheckCircle2 size={18} color="#10b981" /><p style={{ fontSize:'0.82rem', color:'#6ee7b7', fontWeight:600 }}>تم التحقق بنجاح! جاري تسجيل الدخول...</p></div>}
            {error && <div style={{ marginBottom:14, padding:'11px 13px', borderRadius:11, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)' }}><div style={{ display:'flex', alignItems:'flex-start', gap:9 }}><AlertCircle size={16} color="#f87171" style={{ flexShrink:0, marginTop:2 }} /><div><p style={{ fontSize:'0.8rem', color:'#fca5a5' }}>{error}</p>{remainingAttempts!==null&&remainingAttempts>0&&<p style={{ fontSize:'0.72rem', color:'rgba(252,165,165,0.7)', marginTop:3 }}>المحاولات المتبقية: {remainingAttempts}</p>}</div></div></div>}
            {loading && !success && <div style={{ marginBottom:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><Loader2 size={17} color={t.accent} className="animate-spin" /><span style={{ fontSize:'0.82rem', color:t.accent }}>جاري التحقق...</span></div>}

            <div style={{ textAlign:'center', marginBottom:14 }}>
              <p style={{ fontSize:'0.8rem', color:'rgba(100,116,139,0.75)', marginBottom:7 }}>لم تستلم الرمز؟</p>
              <button onClick={handleResend} disabled={loading||success} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:'0.83rem', fontWeight:700, color:t.accent, background:'none', border:'none', cursor:loading||success?'not-allowed':'pointer', opacity:loading||success?0.5:1, fontFamily:'Tajawal,sans-serif' }}>
                <RefreshCw size={13} /> إعادة إرسال الرمز
              </button>
            </div>

            <button onClick={onBack} disabled={loading||success} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:11, borderRadius:11, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', color:'rgba(160,180,210,0.8)', fontFamily:'Tajawal,sans-serif', fontSize:'0.83rem', cursor:loading||success?'not-allowed':'pointer', opacity:loading||success?0.5:1 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
              العودة لتغيير البريد الإلكتروني
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.animate-spin{animation:spin 1s linear infinite}`}</style>
    </div>
  );
}
