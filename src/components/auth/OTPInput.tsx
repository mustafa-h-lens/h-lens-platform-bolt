import { useState, useRef, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { isDarkMode, toggleTheme } = useTheme();

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

  const logo = isDarkMode ? '/assets/logo-white.png' : '/assets/logo-blue.png';

  const boxStyle = (digit: string): React.CSSProperties => ({
    width: 68, height: 76, textAlign: 'center', direction: 'ltr',
    fontSize: '2.1rem', fontWeight: 800, borderRadius: 14,
    background: success
      ? (isDarkMode ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)')
      : error
      ? (isDarkMode ? 'rgba(239,68,68,0.1)' : 'rgba(254,202,202,0.3)')
      : digit
      ? (isDarkMode ? 'rgba(37,99,235,0.08)' : 'rgba(59,130,246,0.08)')
      : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'),
    border: `2px solid ${success ? 'rgba(16,185,129,0.5)' : error ? 'rgba(239,68,68,0.5)' : digit ? 'rgba(59,130,246,0.45)' : (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)')}`,
    color: success
      ? (isDarkMode ? '#6ee7b7' : '#059669')
      : error
      ? (isDarkMode ? '#fca5a5' : '#dc2626')
      : (isDarkMode ? 'white' : '#0f172a'),
    outline: 'none', fontFamily: 'monospace', transition: 'all 0.2s',
  });

  return (
    <div style={{
      minHeight:'100vh',
      background: isDarkMode
        ? 'linear-gradient(170deg,#060f1e 0%,#081628 55%,#0a1c36 100%)'
        : 'linear-gradient(170deg,#f8fafc 0%,#e0e7ff 55%,#dbeafe 100%)',
      display:'flex',
      flexDirection:'column',
      position:'relative',
      overflow:'hidden',
      fontFamily:'Tajawal,sans-serif',
      direction:'rtl'
    }}>

      <div style={{
        position:'absolute',
        inset:0,
        backgroundImage: isDarkMode
          ? 'radial-gradient(rgba(255,255,255,0.016) 1px,transparent 1px)'
          : 'radial-gradient(rgba(0,0,0,0.02) 1px,transparent 1px)',
        backgroundSize:'30px 30px',
        pointerEvents:'none'
      }} />

      {/* TOP BAR */}
      <div style={{ display:'flex', flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:'20px 28px', position:'relative', zIndex:10, direction:'ltr' }}>
        <button onClick={toggleTheme}
          style={{
            width:46,
            height:46,
            borderRadius:13,
            background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            cursor:'pointer',
            flexShrink:0,
            boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.04)'
          }}>
          {isDarkMode ? <Sun size={20} color="#f59e0b" /> : <Moon size={20} color="#3b82f6" />}
        </button>
        <img src={logo} alt="Half Lens" style={{ height:54, objectFit:'contain' }} />
      </div>

      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 1rem 3rem', position:'relative', zIndex:1 }}>
        <div style={{ width:'100%', maxWidth:440 }}>
          <div style={{
            background: isDarkMode ? 'rgba(8,18,48,0.65)' : 'rgba(255,255,255,0.95)',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)',
            borderRadius:22,
            padding:'2.25rem 2rem 2rem',
            backdropFilter:'blur(24px)',
            boxShadow: isDarkMode ? '0 30px 80px rgba(0,0,0,0.55)' : '0 20px 60px rgba(0,0,0,0.08)'
          }}>

            {/* email indicator */}
            <div style={{ textAlign:'center', marginBottom:22 }}>
              <div style={{
                display:'inline-flex',
                alignItems:'center',
                gap:8,
                padding:'7px 14px',
                borderRadius:9,
                background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.08)',
                border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(59,130,246,0.15)',
                marginBottom:14
              }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:'#10b981', flexShrink:0 }} />
                <span style={{
                  fontSize:'0.8rem',
                  color: isDarkMode ? 'rgba(200,220,255,0.85)' : 'rgba(30,58,138,0.8)',
                  direction:'ltr'
                }}>{email}</span>
              </div>
              <h1 style={{
                fontSize:'1.5rem',
                fontWeight:900,
                color: isDarkMode ? 'white' : '#0f172a',
                marginBottom:7
              }}>أدخل رمز التحقق</h1>
              <p style={{
                fontSize:'0.86rem',
                color: isDarkMode ? 'rgba(148,163,184,0.75)' : 'rgba(51,65,85,0.7)',
                lineHeight:1.6
              }}>تم إرسال رمز مكون من 4 أرقام إلى بريدك</p>
            </div>

            {/* DEV MODE: Show OTP Code */}
            {devOTP && (
              <div style={{
                marginBottom:16,
                padding:'12px 14px',
                borderRadius:11,
                background: isDarkMode ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
                border: isDarkMode ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(16,185,129,0.2)',
                textAlign:'center'
              }}>
                <p style={{
                  fontSize:'0.75rem',
                  color: isDarkMode ? 'rgba(16,185,129,0.6)' : 'rgba(5,150,105,0.7)',
                  marginBottom:4,
                  fontWeight:600
                }}>🔧 وضع التطوير - رمز التحقق:</p>
                <p style={{
                  fontSize:'1.5rem',
                  fontWeight:900,
                  color: isDarkMode ? '#6ee7b7' : '#059669',
                  fontFamily:'monospace',
                  letterSpacing:'0.3em',
                  direction:'ltr'
                }}>{devOTP}</p>
              </div>
            )}

            {/* OTP inputs */}
            <div style={{ display:'flex', justifyContent:'center', gap:12, marginBottom:8, direction:'ltr' }}>
              {otp.map((digit, index) => (
                <input key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="tel" inputMode="numeric" maxLength={1}
                  value={digit}
                  onChange={e => handleChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={loading || success}
                  style={boxStyle(digit)}
                />
              ))}
            </div>

            {/* timer */}
            <div style={{ textAlign:'center', margin:'12px 0 18px' }}>
              <p style={{
                fontSize:'0.75rem',
                color: isDarkMode ? 'rgba(100,116,139,0.8)' : 'rgba(71,85,105,0.65)',
                display:'inline-flex',
                alignItems:'center',
                gap:5
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                الرمز صالح لمدة 10 دقائق
              </p>
            </div>

            {/* success */}
            {success && (
              <div style={{
                marginBottom:14,
                padding:'11px 13px',
                borderRadius:11,
                background: isDarkMode ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)',
                border: isDarkMode ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(16,185,129,0.25)',
                display:'flex',
                alignItems:'center',
                gap:10
              }}>
                <CheckCircle2 size={18} color="#10b981" />
                <p style={{
                  fontSize:'0.82rem',
                  color: isDarkMode ? '#6ee7b7' : '#059669',
                  fontWeight:600
                }}>تم التحقق بنجاح! جاري تسجيل الدخول...</p>
              </div>
            )}

            {/* error */}
            {error && (
              <div style={{
                marginBottom:14,
                padding:'11px 13px',
                borderRadius:11,
                background: isDarkMode ? 'rgba(239,68,68,0.1)' : 'rgba(254,202,202,0.3)',
                border: isDarkMode ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(239,68,68,0.4)'
              }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:9 }}>
                  <AlertCircle size={16} color="#f87171" style={{ flexShrink:0, marginTop:2 }} />
                  <div>
                    <p style={{
                      fontSize:'0.8rem',
                      color: isDarkMode ? '#fca5a5' : '#dc2626'
                    }}>{error}</p>
                    {remainingAttempts !== null && remainingAttempts > 0 && (
                      <p style={{
                        fontSize:'0.72rem',
                        color: isDarkMode ? 'rgba(252,165,165,0.7)' : 'rgba(220,38,38,0.7)',
                        marginTop:3
                      }}>المحاولات المتبقية: {remainingAttempts}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* loading */}
            {loading && !success && (
              <div style={{ marginBottom:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <Loader2 size={17} color={isDarkMode ? '#60a5fa' : '#3b82f6'} className="animate-spin" />
                <span style={{
                  fontSize:'0.82rem',
                  color: isDarkMode ? '#93c5fd' : '#2563eb'
                }}>جاري التحقق...</span>
              </div>
            )}

            {/* resend */}
            <div style={{ textAlign:'center', marginBottom:14 }}>
              <p style={{
                fontSize:'0.8rem',
                color: isDarkMode ? 'rgba(100,116,139,0.75)' : 'rgba(71,85,105,0.65)',
                marginBottom:7
              }}>لم تستلم الرمز؟</p>
              <button onClick={handleResend} disabled={loading || success}
                style={{
                  display:'inline-flex',
                  alignItems:'center',
                  gap:6,
                  fontSize:'0.83rem',
                  fontWeight:700,
                  color: isDarkMode ? '#60a5fa' : '#2563eb',
                  background:'none',
                  border:'none',
                  cursor: loading || success ? 'not-allowed' : 'pointer',
                  opacity: loading || success ? 0.5 : 1,
                  fontFamily:'Tajawal,sans-serif'
                }}>
                <RefreshCw size={13} />
                إعادة إرسال الرمز
              </button>
            </div>

            {/* back */}
            <button onClick={onBack} disabled={loading || success}
              style={{
                width:'100%',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                gap:7,
                padding:11,
                borderRadius:11,
                border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                color: isDarkMode ? 'rgba(160,180,210,0.8)' : 'rgba(71,85,105,0.7)',
                fontFamily:'Tajawal,sans-serif',
                fontSize:'0.83rem',
                cursor: loading || success ? 'not-allowed' : 'pointer',
                opacity: loading || success ? 0.5 : 1
              }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
              العودة لتغيير البريد الإلكتروني
            </button>
          </div>

          <div style={{ textAlign:'center', marginTop:20 }}>
            <p style={{
              fontSize:'0.84rem',
              color: isDarkMode ? 'rgba(100,116,139,0.8)' : 'rgba(71,85,105,0.75)'
            }}>
              لست موّرداً بعد؟{' '}
              <a href="/vendor-registration" style={{
                color: isDarkMode ? '#60a5fa' : '#2563eb',
                fontWeight:700,
                textDecoration:'none'
              }}>سجّل حسابك</a>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
