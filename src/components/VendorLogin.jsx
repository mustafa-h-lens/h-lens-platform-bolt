import { useState, useRef, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function VendorLogin({ onLogin }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resend, setResend] = useState(0);
  const [theme, setTheme] = useState("light");

  const refs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    if (resend > 0) {
      const t = setTimeout(() => setResend(resend - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resend]);

  const sendOtp = async () => {
    setError("");
    if(!email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }
    setLoading(true);
    try {
      const deviceInfo = navigator.userAgent.includes('Mobile') ? 'جوال' : 'كمبيوتر';
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email, deviceInfo }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء إرسال رمز التحقق');
      }
      setStep("otp");
      setResend(60);
    } catch (err) {
      setError(err.message || 'حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if(code.length < 4) {
      setError("أدخل الرمز المكوّن من 4 أرقام");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email, code }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'رمز التحقق غير صحيح');
      }
      setStep("success");
      if(onLogin) setTimeout(() => onLogin(data), 1800);
    } catch (err) {
      setError(err.message || 'حدث خطأ في التحقق');
      setOtp(["","","",""]);
      refs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if(!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[i] = val.slice(-1);
    setOtp(newOtp);
    setError("");
    if(val && i<3) refs[i+1].current?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if(e.key==="Backspace" && !otp[i] && i>0) {
      refs[i-1].current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,4);
    const newOtp = [...otp];
    for(let i=0; i<pastedData.length; i++){
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    if(pastedData.length===4) {
      refs[3].current?.blur();
    } else if(pastedData.length>0){
      refs[Math.min(pastedData.length,3)].current?.focus();
    }
  };

  const isDark = theme === "dark";

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: isDark
        ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      transition: 'background 0.3s',
      fontFamily: "'Cairo', sans-serif",
      direction: 'rtl'
    },
    card: {
      width: '100%',
      maxWidth: '480px',
      background: isDark ? '#1e293b' : '#ffffff',
      borderRadius: '24px',
      boxShadow: isDark
        ? '0 20px 60px rgba(0,0,0,0.5)'
        : '0 20px 60px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      transition: 'all 0.3s'
    },
    header: {
      background: isDark
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        : 'linear-gradient(135deg, #0a0f1e 0%, #1a2332 100%)',
      padding: '48px 32px',
      textAlign: 'center',
      position: 'relative'
    },
    themeToggle: {
      position: 'absolute',
      top: '16px',
      left: '16px',
      background: 'rgba(255,255,255,0.1)',
      border: 'none',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: '#fff',
      transition: 'all 0.3s',
      backdropFilter: 'blur(10px)'
    },
    logo: {
      width: '140px',
      height: 'auto',
      marginBottom: '24px'
    },
    headerTitle: {
      color: '#ffffff',
      fontSize: '28px',
      fontWeight: '700',
      marginBottom: '8px'
    },
    headerSubtitle: {
      color: '#94a3b8',
      fontSize: '15px'
    },
    content: {
      padding: '40px 32px'
    },
    greeting: {
      fontSize: '22px',
      fontWeight: '700',
      color: isDark ? '#f1f5f9' : '#1e293b',
      marginBottom: '12px',
      textAlign: 'center'
    },
    message: {
      fontSize: '15px',
      color: isDark ? '#94a3b8' : '#64748b',
      lineHeight: '1.7',
      marginBottom: '32px',
      textAlign: 'center'
    },
    inputWrapper: {
      marginBottom: '24px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: isDark ? '#cbd5e1' : '#475569',
      marginBottom: '10px',
      textAlign: 'right'
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      fontSize: '15px',
      borderRadius: '12px',
      border: isDark ? '2px solid #334155' : '2px solid #e2e8f0',
      background: isDark ? '#0f172a' : '#f8fafc',
      color: isDark ? '#f1f5f9' : '#1e293b',
      outline: 'none',
      transition: 'all 0.3s',
      direction: 'ltr',
      textAlign: 'left'
    },
    otpContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: '12px',
      marginBottom: '24px',
      direction: 'ltr'
    },
    otpBox: {
      width: '64px',
      height: '72px',
      fontSize: '32px',
      fontWeight: '700',
      textAlign: 'center',
      borderRadius: '12px',
      border: isDark ? '2px solid #334155' : '2px solid #e2e8f0',
      background: isDark ? '#0f172a' : '#ffffff',
      color: isDark ? '#f1f5f9' : '#1e293b',
      outline: 'none',
      transition: 'all 0.3s'
    },
    button: {
      width: '100%',
      padding: '16px',
      fontSize: '16px',
      fontWeight: '600',
      borderRadius: '12px',
      border: 'none',
      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      color: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
      marginBottom: '16px'
    },
    secondaryButton: {
      width: '100%',
      padding: '14px',
      fontSize: '14px',
      fontWeight: '500',
      borderRadius: '10px',
      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
      background: 'transparent',
      color: isDark ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    error: {
      background: isDark ? '#7f1d1d' : '#fef2f2',
      border: isDark ? '1px solid #991b1b' : '1px solid #fecaca',
      borderRadius: '10px',
      padding: '14px',
      marginBottom: '20px'
    },
    errorText: {
      fontSize: '14px',
      color: isDark ? '#fca5a5' : '#dc2626',
      textAlign: 'right'
    },
    successIcon: {
      width: '80px',
      height: '80px',
      margin: '0 auto 24px',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 32px rgba(16,185,129,0.3)'
    },
    resendText: {
      fontSize: '13px',
      color: isDark ? '#94a3b8' : '#64748b',
      textAlign: 'center',
      marginBottom: '12px'
    },
    resendButton: {
      background: 'none',
      border: 'none',
      color: '#2563eb',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      textDecoration: 'underline'
    },
    footer: {
      textAlign: 'center',
      marginTop: '24px',
      fontSize: '13px',
      color: isDark ? '#64748b' : '#94a3b8'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <button
            style={styles.themeToggle}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <img
            src="/half_lens_logo_-_color.png"
            alt="Half Lens"
            style={styles.logo}
          />
          <h1 style={styles.headerTitle}>
            {step === "email" ? "تسجيل دخول الموردين" : step === "otp" ? "إدخال رمز التحقق" : "تم التحقق بنجاح"}
          </h1>
          <p style={styles.headerSubtitle}>نظام إدارة الموردين - Half Lens</p>
        </div>

        <div style={styles.content}>
          {step === "email" && (
            <>
              <h2 style={styles.greeting}>مرحباً بك</h2>
              <p style={styles.message}>
                أدخل بريدك الإلكتروني وسنرسل لك رمز تحقق للدخول إلى حسابك
              </p>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  style={{
                    ...styles.input,
                    ...(email && { borderColor: '#2563eb', background: isDark ? '#1e293b' : '#eff6ff' })
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = isDark ? '#334155' : '#e2e8f0'}
                  disabled={loading}
                />
              </div>
              {error && (
                <div style={styles.error}>
                  <p style={styles.errorText}>{error}</p>
                </div>
              )}
              <button
                onClick={sendOtp}
                disabled={loading}
                style={{
                  ...styles.button,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
              </button>
            </>
          )}

          {step === "otp" && (
            <>
              <h2 style={styles.greeting}>أدخل رمز التحقق</h2>
              <p style={styles.message}>
                تم إرسال الرمز إلى: {email}
              </p>
              <div style={styles.otpContainer}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={refs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    style={{
                      ...styles.otpBox,
                      ...(digit && { borderColor: '#2563eb', background: isDark ? '#1e3a8a' : '#dbeafe' })
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = isDark ? '#334155' : '#e2e8f0'}
                    disabled={loading}
                  />
                ))}
              </div>
              {error && (
                <div style={styles.error}>
                  <p style={styles.errorText}>{error}</p>
                </div>
              )}
              <button
                onClick={verifyOtp}
                disabled={loading}
                style={{
                  ...styles.button,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {loading ? "جاري التحقق..." : "تحقق"}
              </button>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <p style={styles.resendText}>لم تستلم الرمز؟</p>
                {resend > 0 ? (
                  <p style={styles.resendText}>إعادة الإرسال متاحة بعد {resend} ثانية</p>
                ) : (
                  <button
                    onClick={sendOtp}
                    disabled={loading}
                    style={{
                      ...styles.resendButton,
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    إعادة إرسال الرمز
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setStep("email");
                  setOtp(["","","",""]);
                  setError("");
                }}
                disabled={loading}
                style={{
                  ...styles.secondaryButton,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = isDark ? '#1e293b' : '#f8fafc')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'transparent')}
              >
                العودة لتغيير البريد الإلكتروني
              </button>
            </>
          )}

          {step === "success" && (
            <>
              <div style={styles.successIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h2 style={{...styles.greeting, color: '#10b981'}}>تم التحقق بنجاح!</h2>
              <p style={styles.message}>جاري تحويلك إلى لوحة التحكم...</p>
            </>
          )}
        </div>

        <div style={styles.footer}>
          <p>© 2024 Half Lens. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </div>
  );
}
