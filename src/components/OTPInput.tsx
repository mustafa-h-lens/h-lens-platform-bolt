import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface OTPInputProps {
  email: string;
  onBack: () => void;
  onSuccess: (vendorData: any) => void;
  devOTP?: string | null;
}

export default function OTPInput({ email, onBack, onSuccess, devOTP }: OTPInputProps) {
  const [otp, setOtp]         = useState(['','','','']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number|null>(null);
  const inputRefs = useRef<(HTMLInputElement|null)[]>([]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError(''); setRemainingAttempts(null);
    if (value && index < 3) inputRefs.current[index+1]?.focus();
    if (newOtp.every(d => d) && newOtp.join('').length === 4) verifyOTP(newOtp.join(''));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index-1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,4);
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) newOtp[i] = pasted[i];
    setOtp(newOtp);
    if (pasted.length === 4) verifyOTP(pasted);
    else if (pasted.length > 0) inputRefs.current[Math.min(pasted.length,3)]?.focus();
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
      setSuccess(true);
      setTimeout(() => onSuccess(data), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في التحقق');
      setOtp(['','','','']);
      inputRefs.current[0]?.focus();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally { setLoading(false); }
  };

  const boxColor = (digit: string) => {
    if (success) return { border:'rgba(16,185,129,0.6)', bg:'rgba(16,185,129,0.1)', color:'#6ee7b7' };
    if (error)   return { border:'rgba(239,68,68,0.6)',  bg:'rgba(239,68,68,0.1)',  color:'#fca5a5' };
    if (digit)   return { border:'rgba(59,130,246,0.6)', bg:'rgba(59,130,246,0.1)', color:'#93c5fd' };
    return { border:'rgba(255,255,255,0.12)', bg:'rgba(255,255,255,0.05)', color:'white' };
  };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#020b18 0%,#051A3A 50%,#0a2d5e 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', fontFamily:'Tajawal,sans-serif', direction:'rtl', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'-10%', right:'-5%', width:500, height:500, background:'radial-gradient(circle,rgba(37,99,235,0.12) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:400, height:400, background:'radial-gradient(circle,rgba(124,58,237,0.1) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize:'28px 28px', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <img src="/half_lens_logo_-_color.png" alt="Half Lens" style={{ height:52, margin:'0 auto 14px' }} />
          <div style={{ fontSize:'0.75rem', color:'rgba(148,163,184,0.7)', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:500 }}>رمز التحقق</div>
        </div>

        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:20, padding:'2rem', backdropFilter:'blur(20px)', boxShadow:'0 25px 60px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.06)' }}>

          {/* Email indicator */}
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'7px 14px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#10b981' }} />
              <span style={{ fontSize:'0.8rem', color:'rgba(203,213,225,0.85)', direction:'ltr' }}>{email}</span>
            </div>
            <p style={{ fontSize:'0.8rem', color:'rgba(148,163,184,0.7)', marginTop:12, lineHeight:1.6 }}>
              أدخل رمز التحقق المكون من 4 أرقام
            </p>
          </div>

          {/* Dev OTP */}
          {devOTP && (
            <div style={{ marginBottom:20, padding:'11px', borderRadius:11, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.35)', textAlign:'center' }}>
              <p style={{ fontSize:'0.7rem', fontWeight:700, color:'#93c5fd', marginBottom:5 }}>🔐 DEV MODE</p>
              <p style={{ fontSize:'1.6rem', fontWeight:900, color:'#60a5fa', letterSpacing:'0.25em', direction:'ltr' }}>{devOTP}</p>
            </div>
          )}

          {/* OTP boxes */}
          <div style={{ display:'flex', justifyContent:'center', gap:12, marginBottom:20, direction:'ltr' }}>
            {otp.map((digit, index) => {
              const c = boxColor(digit);
              return (
                <input key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={1}
                  value={digit}
                  onChange={e => handleChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={loading || success}
                  style={{
                    width:64, height:72, textAlign:'center', direction:'ltr',
                    fontSize:'2rem', fontWeight:800, borderRadius:14,
                    background:c.bg, border:`2px solid ${c.border}`,
                    color:c.color, outline:'none', fontFamily:'monospace',
                    transition:'all 0.2s',
                    boxShadow: digit ? `0 0 0 3px ${c.border}33` : 'none',
                  }}
                />
              );
            })}
          </div>

          {/* Timer */}
          <div style={{ textAlign:'center', marginBottom:18 }}>
            <p style={{ fontSize:'0.74rem', color:'rgba(100,116,139,0.8)', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              الرمز صالح لمدة 10 دقائق
            </p>
          </div>

          {/* Success */}
          {success && (
            <div style={{ marginBottom:16, padding:'11px 13px', borderRadius:11, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', display:'flex', alignItems:'center', gap:10 }}>
              <CheckCircle2 size={20} color="#10b981" />
              <p style={{ fontSize:'0.82rem', color:'#6ee7b7', fontWeight:600 }}>تم التحقق بنجاح! جاري تسجيل الدخول...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginBottom:16, padding:'11px 13px', borderRadius:11, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:9 }}>
                <AlertCircle size={18} color="#f87171" style={{ flexShrink:0, marginTop:1 }} />
                <div>
                  <p style={{ fontSize:'0.8rem', color:'#fca5a5' }}>{error}</p>
                  {remainingAttempts !== null && remainingAttempts > 0 && (
                    <p style={{ fontSize:'0.72rem', color:'rgba(252,165,165,0.7)', marginTop:3 }}>المحاولات المتبقية: {remainingAttempts}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && !success && (
            <div style={{ marginBottom:16, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <Loader2 size={18} color="#60a5fa" className="animate-spin" />
              <span style={{ fontSize:'0.82rem', color:'#93c5fd' }}>جاري التحقق...</span>
            </div>
          )}

          {/* Resend */}
          <div style={{ textAlign:'center', marginBottom:16 }}>
            <p style={{ fontSize:'0.78rem', color:'rgba(100,116,139,0.8)', marginBottom:8 }}>لم تستلم الرمز؟</p>
            <button onClick={handleResend} disabled={loading || success}
              style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:'0.82rem', fontWeight:600, color:'#60a5fa', background:'none', border:'none', cursor:loading||success?'not-allowed':'pointer', opacity:loading||success?0.5:1, fontFamily:'Tajawal,sans-serif' }}>
              <RefreshCw size={14} />
              إعادة إرسال الرمز
            </button>
          </div>

          {/* Back */}
          <button onClick={onBack} disabled={loading || success}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'10px', borderRadius:11, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', color:'rgba(148,163,184,0.8)', fontFamily:'Tajawal,sans-serif', fontSize:'0.82rem', cursor:loading||success?'not-allowed':'pointer', opacity:loading||success?0.5:1, transition:'all 0.2s' }}>
            <ArrowRight size={16} />
            العودة لتغيير البريد الإلكتروني
          </button>
        </div>

        <div style={{ textAlign:'center', marginTop:20 }}>
          <p style={{ fontSize:'0.74rem', color:'rgba(100,116,139,0.7)' }}>© 2025 Half Lens. جميع الحقوق محفوظة.</p>
        </div>
      </div>

      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}10%,30%,50%,70%,90%{transform:translateX(-4px)}20%,40%,60%,80%{transform:translateX(4px)}}.animate-shake{animation:shake 0.5s}`}</style>
    </div>
  );
}
