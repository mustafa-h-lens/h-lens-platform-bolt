import { useState, useRef, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface OTPInputProps {
  email?: string;
  phone?: string;
  onBack: () => void;
  onSuccess: (vendorData: any) => void;
  devOTP?: string | null;
  portalType?: 'vendor' | 'client';
}

export default function OTPInput({ email, phone, onBack, onSuccess, portalType = 'vendor' }: OTPInputProps) {
  // NOTE: devOTP is intentionally ignored — the verification code must never be
  // rendered in the UI. The prop remains on the interface for call-site compat.
  const [otp, setOtp]         = useState(['','','','','','']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number|null>(null);
  const inputRefs = useRef<(HTMLInputElement|null)[]>([]);
  const { isDarkMode, toggleTheme } = useTheme();

  // Phone path is preferred when both are provided.
  const usingSms = !!phone;
  const identifierDisplay = phone || email || '';

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  // Shared digit-fan-out: used by iOS one-time-code autofill, paste, and WebOTP.
  const fanOutDigits = (raw: string) => {
    const digits = (raw || '').replace(/\D/g, '').slice(0, 6);
    if (digits.length === 0) return;
    const newOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < digits.length; i++) newOtp[i] = digits[i];
    setOtp(newOtp);
    setError(''); setRemainingAttempts(null);
    if (digits.length === 6) verifyOTP(digits);
    else inputRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  // Android Chrome WebOTP API — listens for the SMS that ends with
  // `@<origin> #<otp>` and dispatches the code into our inputs.
  useEffect(() => {
    if (!('OTPCredential' in window)) return;
    const ac = new AbortController();
    // WebOTP options aren't in lib.dom yet; cast through unknown.
    const opts = { otp: { transport: ['sms'] }, signal: ac.signal } as unknown as CredentialRequestOptions;
    navigator.credentials
      .get(opts)
      .then((cred) => {
        const code = (cred as unknown as { code?: string } | null)?.code;
        if (code) fanOutDigits(code);
      })
      .catch(() => { /* user denied or unsupported — silent */ });
    return () => ac.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (index: number, value: string) => {
    // iOS Safari autofill drops the full 6-digit code into one box as a single
    // change event — fan it out instead of treating it as one character.
    if (value.length > 1) { fanOutDigits(value); return; }
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError(''); setRemainingAttempts(null);
    if (value && index < 5) inputRefs.current[index+1]?.focus();
    if (newOtp.every(d => d) && newOtp.join('').length === 6) verifyOTP(newOtp.join(''));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index-1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    fanOutDigits(e.clipboardData.getData('text'));
  };

  const verifyOTP = async (code: string) => {
    setLoading(true); setError('');
    try {
      const body = usingSms
        ? { phone, code, portal_type: portalType }
        : { email, code, portal_type: portalType };
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify(body),
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
      setOtp(['','','','','','']);
      inputRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setLoading(true); setError(''); setOtp(['','','','','','']); setRemainingAttempts(null);
    try {
      const deviceInfo = navigator.userAgent.includes('Mobile') ? 'جوال' : 'كمبيوتر';
      const endpoint = usingSms ? 'send-otp-sms' : 'send-otp-email';
      const body = usingSms
        ? { phone, deviceInfo, portal_type: portalType }
        : { email, deviceInfo, portal_type: portalType };
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'حدث خطأ');
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally { setLoading(false); }
  };

  const logo = isDarkMode ? '/assets/logo-white.png' : '/assets/logo-blue.png';
  const d = isDarkMode;

  const otpBoxClass = (digit: string) => {
    let cls = 'otp-box';
    if (success) cls += ' otp-success';
    else if (error) cls += ' otp-error';
    else if (digit) cls += ' otp-filled';
    return cls;
  };

  return (
    <div className="sl-page" data-dark={d ? '' : undefined}>

      {/* ── Animated gradient blobs ── */}
      <div className="sl-blob sl-blob-1" />
      <div className="sl-blob sl-blob-2" />
      <div className="sl-blob sl-blob-3" />
      <div className="sl-blob sl-blob-4" />
      <div className="sl-blob sl-blob-5" />

      {/* ── Dot grid ── */}
      <div className="sl-grid" />

      {/* ── Top bar ── */}
      <div className="sl-topbar">
        <button className="sl-theme-btn" onClick={toggleTheme}>
          {d ? <Sun size={20} color="#f59e0b" /> : <Moon size={20} color="#3b82f6" />}
        </button>
        <a href="/" aria-label="الانتقال إلى الصفحة الرئيسية" className="sl-logo-link">
          <img src={logo} alt="Half Lens" className="sl-logo" />
        </a>
      </div>

      {/* ── Main ── */}
      <div className="sl-main">
        <div className="sl-card-wrap">
          <div className="sl-card">
            <div className="sl-card-shine" />

            {/* Identifier indicator (email or phone) */}
            <div className="otp-header">
              <div className="otp-email-badge">
                <div className="otp-email-dot" />
                <span dir="ltr">{identifierDisplay}</span>
              </div>
              <h1 className="sl-title">أدخل رمز التحقق</h1>
              <p className="sl-subtitle">
                {usingSms
                  ? 'تم إرسال رمز مكون من 6 أرقام إلى جوالك'
                  : 'تم إرسال رمز مكون من 6 أرقام إلى بريدك'}
              </p>
            </div>

            {/* OTP Inputs */}
            <div className="otp-inputs" dir="ltr">
              {otp.map((digit, index) => (
                <input key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="tel" inputMode="numeric" maxLength={1} autoComplete="one-time-code"
                  value={digit}
                  onChange={e => handleChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={loading || success}
                  className={otpBoxClass(digit)}
                />
              ))}
            </div>

            {/* Timer */}
            <div className="otp-timer">
              <p>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                الرمز صالح لمدة 10 دقائق
              </p>
            </div>

            {/* Success */}
            {success && (
              <div className="otp-status otp-status-success">
                <CheckCircle2 size={18} color="#10b981" />
                <p>تم التحقق بنجاح! جاري تسجيل الدخول...</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="otp-status otp-status-error">
                <AlertCircle size={16} style={{ flexShrink:0, marginTop:2 }} />
                <div>
                  <p>{error}</p>
                  {remainingAttempts !== null && remainingAttempts > 0 && (
                    <p className="otp-attempts">المحاولات المتبقية: {remainingAttempts}</p>
                  )}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && !success && (
              <div className="otp-loading">
                <Loader2 size={17} className="animate-spin" />
                <span>جاري التحقق...</span>
              </div>
            )}

            {/* Resend */}
            <div className="otp-resend">
              <p>لم تستلم الرمز؟</p>
              <button onClick={handleResend} disabled={loading || success} className="otp-resend-btn">
                <RefreshCw size={13} />
                إعادة إرسال الرمز
              </button>
            </div>

            {/* Back */}
            <button onClick={onBack} disabled={loading || success} className="otp-back">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
              {usingSms ? 'العودة لتغيير رقم الجوال' : 'العودة لتغيير البريد الإلكتروني'}
            </button>
          </div>

          {/* Register link */}
          <div className="sl-register">
            <p>
              لست موّرداً بعد؟{' '}
              <a href="/join">سجّل حسابك</a>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        /* ══════════ PAGE (shared with SupplierLogin) ══════════ */
        .sl-page {
          --sl-bg: #f8f9fc;
          --sl-card-bg: rgba(255,255,255,0.55);
          --sl-card-border: rgba(255,255,255,0.6);
          --sl-card-shadow: 0 20px 70px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.5) inset;
          --sl-text: #0f172a;
          --sl-text-sub: rgba(51,65,85,0.7);
          --sl-text-muted: rgba(71,85,105,0.65);
          --sl-input-bg: rgba(255,255,255,0.6);
          --sl-input-border: rgba(0,0,0,0.1);
          --sl-theme-bg: rgba(255,255,255,0.7);
          --sl-theme-border: rgba(0,0,0,0.08);
          --sl-link: #2563eb;
          --sl-accent: #3b82f6;
          --sl-shine: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          --sl-success-bg: rgba(16,185,129,0.08);
          --sl-success-border: rgba(16,185,129,0.25);
          --sl-success-text: #059669;
          --sl-error-bg: rgba(254,202,202,0.3);
          --sl-error-border: rgba(239,68,68,0.4);
          --sl-error-text: #dc2626;
          --sl-error-sub: rgba(220,38,38,0.7);

          min-height: 100vh;
          background: var(--sl-bg);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          font-family: 'Cairo', 'Tajawal', sans-serif;
          direction: rtl;
        }
        .sl-page[data-dark] {
          --sl-bg: #050d1e;
          --sl-card-bg: rgba(8,18,48,0.45);
          --sl-card-border: rgba(255,255,255,0.08);
          --sl-card-shadow: 0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05) inset;
          --sl-text: #f0f4ff;
          --sl-text-sub: rgba(148,163,184,0.78);
          --sl-text-muted: rgba(148,163,184,0.7);
          --sl-input-bg: rgba(255,255,255,0.05);
          --sl-input-border: rgba(255,255,255,0.12);
          --sl-theme-bg: rgba(255,255,255,0.08);
          --sl-theme-border: rgba(255,255,255,0.12);
          --sl-link: #60a5fa;
          --sl-accent: #60a5fa;
          --sl-shine: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
          --sl-success-bg: rgba(16,185,129,0.1);
          --sl-success-border: rgba(16,185,129,0.3);
          --sl-success-text: #6ee7b7;
          --sl-error-bg: rgba(239,68,68,0.1);
          --sl-error-border: rgba(239,68,68,0.25);
          --sl-error-text: #fca5a5;
          --sl-error-sub: rgba(252,165,165,0.7);
        }

        /* ══════════ BLOBS ══════════ */
        .sl-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          opacity: 0.7;
        }
        .sl-blob-1 {
          width: 500px; height: 500px;
          top: -10%; right: -8%;
          background: rgba(37,99,235,0.18);
          animation: blobFloat1 14s ease-in-out infinite;
        }
        .sl-blob-2 {
          width: 400px; height: 400px;
          bottom: -5%; left: -5%;
          background: rgba(124,58,237,0.15);
          animation: blobFloat2 16s ease-in-out infinite;
        }
        .sl-blob-3 {
          width: 350px; height: 350px;
          top: 40%; left: 10%;
          background: rgba(6,182,212,0.12);
          animation: blobFloat3 18s ease-in-out infinite;
        }
        .sl-blob-4 {
          width: 300px; height: 300px;
          top: 15%; right: 30%;
          background: rgba(16,185,129,0.10);
          animation: blobFloat4 20s ease-in-out infinite;
        }
        .sl-blob-5 {
          width: 250px; height: 250px;
          bottom: 20%; right: 15%;
          background: rgba(244,63,94,0.08);
          animation: blobFloat5 15s ease-in-out infinite;
        }
        .sl-page[data-dark] .sl-blob-1 { background: rgba(37,99,235,0.14); opacity: 0.8; }
        .sl-page[data-dark] .sl-blob-2 { background: rgba(124,58,237,0.12); opacity: 0.7; }
        .sl-page[data-dark] .sl-blob-3 { background: rgba(6,182,212,0.10); opacity: 0.6; }
        .sl-page[data-dark] .sl-blob-4 { background: rgba(16,185,129,0.08); opacity: 0.5; }
        .sl-page[data-dark] .sl-blob-5 { background: rgba(244,63,94,0.06); opacity: 0.5; }

        @keyframes blobFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 40px) scale(1.05); }
          66% { transform: translate(20px, -20px) scale(0.95); }
        }
        @keyframes blobFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.08); }
          66% { transform: translate(-20px, 25px) scale(0.96); }
        }
        @keyframes blobFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(35px, 30px) scale(1.04); }
        }
        @keyframes blobFloat4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, -35px) scale(1.06); }
        }
        @keyframes blobFloat5 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -25px) scale(1.03); }
          66% { transform: translate(-15px, 20px) scale(0.97); }
        }

        /* ══════════ GRID ══════════ */
        .sl-grid {
          position: absolute; inset: 0;
          background-image: radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none; z-index: 1;
        }
        .sl-page[data-dark] .sl-grid {
          background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
        }

        /* ══════════ TOPBAR ══════════ */
        .sl-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 28px; position: relative; z-index: 10; direction: ltr;
        }
        .sl-theme-btn {
          width: 46px; height: 46px; border-radius: 13px;
          background: var(--sl-theme-bg); border: 1px solid var(--sl-theme-border);
          backdrop-filter: blur(12px); display: flex; align-items: center;
          justify-content: center; cursor: pointer; transition: all 0.2s;
        }
        .sl-theme-btn:hover { transform: scale(1.05); }
        .sl-logo { height: 54px; object-fit: contain; }
        .sl-logo-link { display: inline-flex; cursor: pointer; text-decoration: none; transition: opacity 0.2s, transform 0.2s; }
        .sl-logo-link:hover { opacity: 0.85; transform: scale(1.02); }
        .sl-logo-link:active { transform: scale(0.98); }

        /* ══════════ MAIN ══════════ */
        .sl-main {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 0 1rem 3rem; position: relative; z-index: 2;
        }
        .sl-card-wrap { width: 100%; max-width: 480px; }

        /* ══════════ GLASS CARD ══════════ */
        .sl-card {
          background: var(--sl-card-bg);
          border: 1px solid var(--sl-card-border);
          border-radius: 24px;
          padding: 2.25rem 2rem 2rem;
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
          box-shadow: var(--sl-card-shadow);
          position: relative; overflow: hidden;
        }
        .sl-card-shine {
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: var(--sl-shine);
        }
        .sl-title {
          font-size: 1.5rem; font-weight: 900; color: var(--sl-text);
          margin: 0 0 7px;
        }
        .sl-subtitle {
          font-size: 0.86rem; color: var(--sl-text-sub); line-height: 1.6; margin: 0;
        }

        /* ══════════ OTP SPECIFIC ══════════ */
        .otp-header { text-align: center; margin-bottom: 22px; }

        .otp-email-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 7px 14px; border-radius: 9px;
          background: var(--sl-input-bg);
          border: 1px solid var(--sl-input-border);
          margin-bottom: 14px;
          backdrop-filter: blur(8px);
          direction: ltr;
          unicode-bidi: embed;
        }
        .otp-email-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #10b981; flex-shrink: 0;
          order: -1;
        }
        .otp-email-badge span {
          font-size: 0.8rem; color: var(--sl-text-sub);
          direction: ltr; unicode-bidi: embed;
        }

        .otp-dev {
          margin-bottom: 16px; padding: 12px 14px; border-radius: 11px;
          background: var(--sl-success-bg);
          border: 1px solid var(--sl-success-border);
          text-align: center;
          backdrop-filter: blur(8px);
        }
        .otp-dev-label {
          font-size: 0.75rem; color: var(--sl-success-text);
          opacity: 0.7; margin: 0 0 4px; font-weight: 600;
        }
        .otp-dev-code {
          font-size: 1.5rem; font-weight: 900;
          color: var(--sl-success-text);
          font-family: monospace; letter-spacing: 0.3em; margin: 0;
        }

        /* OTP Inputs */
        .otp-inputs {
          display: flex; justify-content: center; gap: 10px;
          margin-bottom: 8px;
          direction: ltr;
          padding: 0 4px;
        }
        .otp-box {
          width: 0; flex: 1; max-width: 52px; height: 60px; text-align: center;
          font-size: 1.6rem; font-weight: 800; border-radius: 12px;
          background: var(--sl-input-bg);
          border: 2px solid var(--sl-input-border);
          color: var(--sl-text);
          outline: none; font-family: monospace;
          transition: all 0.2s;
          backdrop-filter: blur(8px);
          box-sizing: border-box;
          padding: 0;
        }
        .otp-box:focus {
          border-color: rgba(59,130,246,0.55);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
        .otp-filled {
          background: rgba(59,130,246,0.08);
          border-color: rgba(59,130,246,0.45);
        }
        .sl-page[data-dark] .otp-filled {
          background: rgba(37,99,235,0.08);
        }
        .otp-success {
          background: var(--sl-success-bg) !important;
          border-color: rgba(16,185,129,0.5) !important;
          color: var(--sl-success-text) !important;
        }
        .otp-error {
          background: var(--sl-error-bg) !important;
          border-color: rgba(239,68,68,0.5) !important;
          color: var(--sl-error-text) !important;
        }

        .otp-timer {
          text-align: center; margin: 12px 0 18px;
        }
        .otp-timer p {
          font-size: 0.75rem; color: var(--sl-text-muted);
          display: inline-flex; align-items: center; gap: 5px; margin: 0;
        }

        /* Status messages */
        .otp-status {
          margin-bottom: 14px; padding: 11px 13px; border-radius: 11px;
          display: flex; align-items: flex-start; gap: 10px;
          backdrop-filter: blur(8px);
        }
        .otp-status p { margin: 0; }
        .otp-status-success {
          background: var(--sl-success-bg);
          border: 1px solid var(--sl-success-border);
        }
        .otp-status-success p {
          font-size: 0.82rem; color: var(--sl-success-text); font-weight: 600;
        }
        .otp-status-error {
          background: var(--sl-error-bg);
          border: 1px solid var(--sl-error-border);
          color: var(--sl-error-text);
        }
        .otp-status-error p { font-size: 0.8rem; }
        .otp-attempts {
          font-size: 0.72rem !important;
          color: var(--sl-error-sub) !important;
          margin-top: 3px !important;
        }

        .otp-loading {
          margin-bottom: 14px; display: flex; align-items: center;
          justify-content: center; gap: 8px;
          color: var(--sl-accent); font-size: 0.82rem;
        }

        /* Resend */
        .otp-resend { text-align: center; margin-bottom: 14px; }
        .otp-resend > p {
          font-size: 0.8rem; color: var(--sl-text-muted); margin: 0 0 7px;
        }
        .otp-resend-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.83rem; font-weight: 700;
          color: var(--sl-link); background: none; border: none;
          cursor: pointer; font-family: inherit; transition: opacity 0.2s;
        }
        .otp-resend-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .otp-resend-btn:hover:not(:disabled) { opacity: 0.8; }

        /* Back button */
        .otp-back {
          width: 100%; display: flex; align-items: center;
          justify-content: center; gap: 7px; padding: 11px;
          border-radius: 11px;
          border: 1px solid var(--sl-input-border);
          background: var(--sl-input-bg);
          color: var(--sl-text-muted);
          font-family: inherit; font-size: 0.83rem;
          cursor: pointer; transition: all 0.2s;
          backdrop-filter: blur(8px);
        }
        .otp-back:disabled { opacity: 0.5; cursor: not-allowed; }
        .otp-back:hover:not(:disabled) {
          border-color: var(--sl-accent);
          color: var(--sl-text-sub);
        }

        /* Register */
        .sl-register { text-align: center; margin-top: 20px; }
        .sl-register p { font-size: 0.84rem; color: var(--sl-text-muted); margin: 0; }
        .sl-register a {
          color: var(--sl-link); font-weight: 700;
          text-decoration: none; transition: opacity 0.2s;
        }
        .sl-register a:hover { opacity: 0.8; }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 500px) {
          .sl-card { padding: 1.75rem 1.25rem 1.5rem; border-radius: 20px; }
          .sl-title { font-size: 1.3rem; }
          .sl-topbar { padding: 16px; }
          .sl-blob { filter: blur(60px); }
          .otp-box { max-width: 48px; height: 56px; font-size: 1.5rem; }
          .otp-inputs { gap: 6px; }
        }
      `}</style>
    </div>
  );
}
