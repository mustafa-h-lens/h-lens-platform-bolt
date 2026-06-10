import { useState } from 'react';
import { Loader2, ArrowLeft, Sun, Moon, Phone as PhoneIcon, Mail } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabaseClient';
import { normalizeSaudiPhone, saudiPhoneDigitsOnly, isValidSaudiPhone, stripLocalPhone } from '../../lib/phoneUtils';
import { isValidEmail } from '../../lib/validators';
import { COUNTRY_CODES } from '../../lib/shared-data';

interface SupplierLoginProps {
  onOTPSent: (identifier: string, mode: 'phone' | 'email', otpCode?: string) => void;
}

export default function SupplierLogin({ onOTPSent }: SupplierLoginProps) {
  // Primary channel is SMS-OTP; email-OTP is the secondary fallback. Mode is
  // tab-toggled by the user. Defaults to phone + Saudi country code.
  const [mode, setMode]               = useState<'phone' | 'email'>('phone');
  const [countryCode, setCountryCode] = useState('+966');
  const [phone, setPhone]             = useState('');
  const [email, setEmail]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [focused, setFocused]         = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const deviceInfo = navigator.userAgent.includes('Mobile') ? 'جوال' : 'كمبيوتر';

      if (mode === 'phone') {
        // Validation: Saudi enforces the strict 5XXXXXXXX pattern; non-Saudi
        // requires only a reasonable digit-length (since formats vary widely).
        const localStripped = stripLocalPhone(phone, countryCode);
        if (countryCode === '+966') {
          if (!isValidSaudiPhone(phone)) {
            setError('يرجى إدخال رقم جوال سعودي صالح (يبدأ بـ 5 ويتكون من 9 أرقام)');
            setLoading(false); return;
          }
        } else if (localStripped.length < 6 || localStripped.length > 15) {
          setError('يرجى إدخال رقم جوال صالح');
          setLoading(false); return;
        }
        const phoneE164 = countryCode === '+966'
          ? normalizeSaudiPhone(phone)!
          : `${countryCode}${localStripped}`;
        const phoneStored = countryCode === '+966'
          ? saudiPhoneDigitsOnly(phone)!
          : localStripped;

        // Block check via stored phone (matches whatever the admin saved)
        const { data: vendorRow } = await supabase
          .from('vendors')
          .select('status, block_reason, blocked_until')
          .eq('phone', phoneStored)
          .maybeSingle();
        if (vendorRow?.status === 'blocked') {
          const untilTxt = vendorRow.blocked_until
            ? ` حتى ${new Date(vendorRow.blocked_until).toLocaleDateString('ar-SA')}`
            : ' (حظر دائم)';
          const reasonTxt = vendorRow.block_reason ? `\nالسبب: ${vendorRow.block_reason}` : '';
          setError(`تم حظر حسابك${untilTxt}.${reasonTxt}\nيرجى التواصل مع الإدارة للمزيد من المعلومات.`);
          setLoading(false); return;
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ phone: phoneE164, deviceInfo, portal_type: 'vendor' }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'حدث خطأ أثناء إرسال رمز التحقق');
        onOTPSent(phoneE164, 'phone', data.otp);

      } else {
        // Email-OTP fallback path
        const trimmedEmail = email.trim().toLowerCase();
        if (!isValidEmail(trimmedEmail)) {
          setError('يرجى إدخال بريد إلكتروني صالح');
          setLoading(false); return;
        }

        // Block check by stored email
        const { data: vendorRow } = await supabase
          .from('vendors')
          .select('status, block_reason, blocked_until')
          .eq('email', trimmedEmail)
          .maybeSingle();
        if (vendorRow?.status === 'blocked') {
          const untilTxt = vendorRow.blocked_until
            ? ` حتى ${new Date(vendorRow.blocked_until).toLocaleDateString('ar-SA')}`
            : ' (حظر دائم)';
          const reasonTxt = vendorRow.block_reason ? `\nالسبب: ${vendorRow.block_reason}` : '';
          setError(`تم حظر حسابك${untilTxt}.${reasonTxt}\nيرجى التواصل مع الإدارة للمزيد من المعلومات.`);
          setLoading(false); return;
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ email: trimmedEmail, deviceInfo, portal_type: 'vendor' }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'حدث خطأ أثناء إرسال رمز التحقق');
        onOTPSent(trimmedEmail, 'email', data.otp);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في الاتصال');
    } finally { setLoading(false); }
  };

  const logo = isDarkMode ? '/assets/logo-white.png' : '/assets/logo-blue.png';
  const d = isDarkMode;

  return (
    <div className="sl-page" data-dark={d ? '' : undefined}>

      {/* ── Animated gradient blobs ── */}
      <div className="sl-blob sl-blob-1" />
      <div className="sl-blob sl-blob-2" />
      <div className="sl-blob sl-blob-3" />
      <div className="sl-blob sl-blob-4" />
      <div className="sl-blob sl-blob-5" />

      {/* ── Dot grid overlay ── */}
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

          {/* Glass card */}
          <div className="sl-card">
            {/* Top shine */}
            <div className="sl-card-shine" />

            {/* Mail icon + pulse */}
            <div className="sl-icon-wrap">
              <div className="sl-pulse sl-pulse-1" />
              <div className="sl-pulse sl-pulse-2" />
              <div className="sl-icon-box">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </div>
            </div>

            {/* Title */}
            <div className="sl-title-wrap">
              <h1 className="sl-title">تسجيل الدخول</h1>
              <p className="sl-subtitle">
                {mode === 'phone'
                  ? 'أدخل رقم جوالك وسنرسل إليك رمز تحقق عبر رسالة نصية'
                  : 'أدخل بريدك الإلكتروني وسنرسل إليك رمز التحقق'}
              </p>
            </div>

            {/* Channel tab toggle: SMS (primary) / Email (secondary) */}
            <div className="sl-tabs" role="tablist" aria-label="اختر طريقة تسجيل الدخول">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'phone'}
                onClick={() => { setMode('phone'); setError(''); }}
                disabled={loading}
                className={`sl-tab ${mode === 'phone' ? 'sl-tab-active' : ''}`}
              >
                <PhoneIcon size={16} />
                <span>رقم الجوال</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'email'}
                onClick={() => { setMode('email'); setError(''); }}
                disabled={loading}
                className={`sl-tab ${mode === 'email' ? 'sl-tab-active' : ''}`}
              >
                <Mail size={16} />
                <span>البريد الإلكتروني</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="sl-field-wrap">
                {mode === 'phone' ? (
                  <>
                    <label className="sl-label">رقم الجوال</label>
                    <div className={`sl-phone-wrap ${focused ? 'sl-input-focus' : ''} ${error ? 'sl-input-error' : ''}`}>
                      <select
                        className="sl-phone-prefix sl-cc-select"
                        value={countryCode}
                        onChange={e => {
                          const newCC = e.target.value;
                          setCountryCode(newCC);
                          setPhone(stripLocalPhone(phone, newCC));
                        }}
                        disabled={loading}
                        aria-label="رمز الدولة"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={phone}
                        onChange={e => setPhone(stripLocalPhone(e.target.value, countryCode))}
                        placeholder={countryCode === '+966' ? '5XXXXXXXX' : 'XXXXXXXXX'}
                        disabled={loading}
                        dir="ltr"
                        className="sl-phone-input"
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <label className="sl-label">البريد الإلكتروني</label>
                    <div className={`sl-email-wrap ${focused ? 'sl-input-focus' : ''} ${error ? 'sl-input-error' : ''}`}>
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        disabled={loading}
                        dir="ltr"
                        className="sl-email-input"
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                      />
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="sl-error">
                  <p style={{ whiteSpace: 'pre-line' }}>{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="sl-submit">
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /><span>جاري الإرسال...</span></>
                  : <><span>إرسال رمز التحقق</span><ArrowLeft size={17} /></>
                }
              </button>
            </form>

            {/* Info note */}
            <div className="sl-info">
              <p>
                {mode === 'phone'
                  ? '💡 سيتم إرسال رمز التحقق إلى جوالك المسجل في النظام. الرمز صالح لمدة 10 دقائق.'
                  : '💡 سيتم إرسال رمز التحقق إلى بريدك المسجل في النظام. الرمز صالح لمدة 10 دقائق.'}
              </p>
            </div>
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
        /* ══════════ PAGE ══════════ */
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
          --sl-info-bg: rgba(59,130,246,0.05);
          --sl-info-border: rgba(59,130,246,0.1);
          --sl-icon-grad: linear-gradient(145deg,#3b82f6,#2563eb);
          --sl-icon-border: rgba(37,99,235,0.3);
          --sl-icon-shadow: 0 8px 30px rgba(37,99,235,0.25);
          --sl-icon-stroke: rgba(255,255,255,0.95);
          --sl-pulse-1: rgba(59,130,246,0.15);
          --sl-pulse-2: rgba(59,130,246,0.08);
          --sl-theme-bg: rgba(255,255,255,0.7);
          --sl-theme-border: rgba(0,0,0,0.08);
          --sl-link: #2563eb;
          --sl-shine: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          --sl-error-bg: rgba(254,202,202,0.3);
          --sl-error-border: rgba(239,68,68,0.4);
          --sl-error-text: #dc2626;

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
          --sl-input-border: rgba(255,255,255,0.1);
          --sl-info-bg: rgba(255,255,255,0.03);
          --sl-info-border: rgba(255,255,255,0.07);
          --sl-icon-grad: linear-gradient(145deg,#1e3fa0,#2150e8);
          --sl-icon-border: rgba(120,160,255,0.4);
          --sl-icon-shadow: 0 8px 30px rgba(37,99,235,0.45);
          --sl-icon-stroke: rgba(210,225,255,0.92);
          --sl-pulse-1: rgba(59,130,246,0.2);
          --sl-pulse-2: rgba(59,130,246,0.1);
          --sl-theme-bg: rgba(255,255,255,0.08);
          --sl-theme-border: rgba(255,255,255,0.12);
          --sl-link: #60a5fa;
          --sl-shine: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
          --sl-error-bg: rgba(239,68,68,0.1);
          --sl-error-border: rgba(239,68,68,0.3);
          --sl-error-text: #fca5a5;
        }

        /* ══════════ ANIMATED BLOBS ══════════ */
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

        /* ══════════ DOT GRID ══════════ */
        .sl-grid {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 1;
        }
        .sl-page[data-dark] .sl-grid {
          background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
        }

        /* ══════════ TOP BAR ══════════ */
        .sl-topbar {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          padding: 20px 28px;
          position: relative;
          z-index: 10;
          direction: ltr;
        }
        .sl-theme-btn {
          width: 46px; height: 46px;
          border-radius: 13px;
          background: var(--sl-theme-bg);
          border: 1px solid var(--sl-theme-border);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sl-theme-btn:hover { transform: scale(1.05); }
        .sl-logo { height: 54px; object-fit: contain; }
        .sl-logo-link { display: inline-flex; cursor: pointer; text-decoration: none; transition: opacity 0.2s, transform 0.2s; }
        .sl-logo-link:hover { opacity: 0.85; transform: scale(1.02); }
        .sl-logo-link:active { transform: scale(0.98); }

        /* ══════════ MAIN ══════════ */
        .sl-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 1rem 3rem;
          position: relative;
          z-index: 2;
        }
        .sl-card-wrap {
          width: 100%;
          max-width: 440px;
        }

        /* ══════════ GLASS CARD ══════════ */
        .sl-card {
          background: var(--sl-card-bg);
          border: 1px solid var(--sl-card-border);
          border-radius: 24px;
          padding: 2.25rem 2rem 2rem;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: var(--sl-card-shadow);
          position: relative;
          overflow: hidden;
        }
        .sl-card-shine {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: var(--sl-shine);
        }

        /* ══════════ ICON ══════════ */
        .sl-icon-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 22px;
          position: relative;
          width: 100px; height: 100px;
          margin-left: auto; margin-right: auto;
        }
        .sl-pulse {
          position: absolute;
          border-radius: 20px;
        }
        .sl-pulse-1 {
          inset: 0;
          background: var(--sl-pulse-1);
          animation: slPulse1 2.2s ease-out infinite;
        }
        .sl-pulse-2 {
          inset: -8px;
          border-radius: 24px;
          background: var(--sl-pulse-2);
          animation: slPulse2 2.2s ease-out 0.7s infinite;
        }
        @keyframes slPulse1 {
          0%   { transform: scale(1);   opacity: 0.7; }
          70%  { transform: scale(1.5); opacity: 0;   }
          100% { transform: scale(1.5); opacity: 0;   }
        }
        @keyframes slPulse2 {
          0%   { transform: scale(1);    opacity: 0.45; }
          70%  { transform: scale(1.75); opacity: 0;    }
          100% { transform: scale(1.75); opacity: 0;    }
        }
        .sl-icon-box {
          width: 68px; height: 68px;
          border-radius: 17px;
          background: var(--sl-icon-grad);
          border: 1px solid var(--sl-icon-border);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--sl-icon-shadow);
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2;
          color: var(--sl-icon-stroke);
        }

        /* ══════════ TITLE ══════════ */
        .sl-title-wrap { text-align: center; margin-bottom: 22px; }
        .sl-title {
          font-size: 1.7rem;
          font-weight: 900;
          color: var(--sl-text);
          margin: 0 0 8px;
        }
        .sl-subtitle {
          font-size: 0.88rem;
          color: var(--sl-text-sub);
          line-height: 1.7;
          margin: 0;
        }

        /* ══════════ CHANNEL TABS (phone | email) ══════════ */
        .sl-tabs {
          display: flex; gap: 6px;
          padding: 4px;
          margin-bottom: 18px;
          background: var(--sl-input-bg);
          border: 1px solid var(--sl-input-border);
          border-radius: 12px;
          backdrop-filter: blur(8px);
        }
        .sl-tab {
          flex: 1;
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          border: none;
          background: transparent;
          color: var(--sl-text-muted);
          font-family: inherit;
          font-size: 0.84rem;
          font-weight: 600;
          border-radius: 9px;
          cursor: pointer;
          transition: background 0.22s ease, color 0.22s ease, transform 0.18s ease;
        }
        .sl-tab:disabled { cursor: not-allowed; opacity: 0.55; }
        .sl-tab:hover:not(:disabled):not(.sl-tab-active) { color: var(--sl-text-sub); }
        .sl-tab-active {
          background: var(--sl-accent, #3b82f6);
          color: #fff;
          box-shadow: 0 4px 14px rgba(59,130,246,0.28);
        }
        .sl-page[data-dark] .sl-tab-active {
          background: rgba(59,130,246,0.85);
          box-shadow: 0 4px 14px rgba(59,130,246,0.35);
        }

        /* ══════════ FORM ══════════ */
        .sl-field-wrap { margin-bottom: 14px; }
        .sl-label {
          display: block;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--sl-text-sub);
          margin-bottom: 8px;
          text-align: right;
        }
        .sl-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 11px;
          background: var(--sl-input-bg);
          border: 1px solid var(--sl-input-border);
          color: var(--sl-text);
          font-family: inherit;
          font-size: 0.92rem;
          outline: none;
          transition: border 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
          backdrop-filter: blur(8px);
        }
        .sl-input-focus {
          border-color: rgba(59,130,246,0.6) !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
        .sl-input-error {
          border-color: rgba(239,68,68,0.5) !important;
        }
        .sl-input::placeholder {
          color: var(--sl-text-muted);
        }
        .sl-phone-wrap {
          display: flex;
          align-items: stretch;
          border-radius: 11px;
          background: var(--sl-input-bg);
          border: 1px solid var(--sl-input-border);
          overflow: hidden;
          transition: border 0.2s, box-shadow 0.2s;
          backdrop-filter: blur(8px);
          direction: ltr;
        }
        .sl-phone-prefix {
          padding: 12px 14px;
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--sl-text-sub);
          background: rgba(0, 0, 0, 0.04);
          border-right: 1px solid var(--sl-input-border);
          display: flex; align-items: center;
        }
        .sl-page[data-dark] .sl-phone-prefix {
          background: rgba(255, 255, 255, 0.04);
        }
        /* Country-code <select> styled to match the chip look */
        .sl-cc-select {
          appearance: none; -webkit-appearance: none; -moz-appearance: none;
          border: none; outline: none; cursor: pointer;
          padding-right: 28px;
          background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: left 8px center;
        }
        .sl-cc-select:disabled { cursor: not-allowed; opacity: 0.6; }
        .sl-cc-select option { color: #0f172a; background: #fff; }
        .sl-phone-input {
          flex: 1;
          padding: 12px 14px;
          background: transparent;
          border: none;
          color: var(--sl-text);
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 0.95rem;
          letter-spacing: 0.05em;
          outline: none;
          width: 100%;
          text-align: left;
        }
        .sl-phone-input::placeholder { color: var(--sl-text-muted); letter-spacing: normal; }

        /* Email input — mirrors phone input styling minus the prefix chip */
        .sl-email-wrap {
          display: flex;
          align-items: stretch;
          border-radius: 11px;
          background: var(--sl-input-bg);
          border: 1px solid var(--sl-input-border);
          overflow: hidden;
          transition: border 0.2s, box-shadow 0.2s;
          backdrop-filter: blur(8px);
        }
        .sl-email-input {
          flex: 1;
          padding: 12px 14px;
          background: transparent;
          border: none;
          color: var(--sl-text);
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 0.95rem;
          outline: none;
          width: 100%;
          text-align: left;
        }
        .sl-email-input::placeholder { color: var(--sl-text-muted); }

        .sl-error {
          margin-bottom: 12px;
          padding: 10px 13px;
          border-radius: 10px;
          background: var(--sl-error-bg);
          border: 1px solid var(--sl-error-border);
          backdrop-filter: blur(8px);
        }
        .sl-error p {
          font-size: 0.8rem;
          color: var(--sl-error-text);
          text-align: right;
          margin: 0;
        }

        .sl-submit {
          width: 100%;
          padding: 13px;
          border-radius: 11px;
          border: none;
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: white;
          font-family: inherit;
          font-size: 0.92rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          box-shadow: 0 4px 20px rgba(37,99,235,0.35);
          transition: all 0.25s;
          margin-bottom: 16px;
        }
        .sl-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(37,99,235,0.45);
        }
        .sl-submit:disabled {
          background: rgba(37,99,235,0.4);
          cursor: not-allowed;
          box-shadow: none;
        }

        .sl-info {
          padding: 11px 13px;
          border-radius: 10px;
          background: var(--sl-info-bg);
          border: 1px solid var(--sl-info-border);
          backdrop-filter: blur(8px);
        }
        .sl-info p {
          font-size: 0.75rem;
          color: var(--sl-text-muted);
          line-height: 1.7;
          text-align: right;
          margin: 0;
        }

        /* ══════════ REGISTER LINK ══════════ */
        .sl-register {
          text-align: center;
          margin-top: 20px;
        }
        .sl-register p {
          font-size: 0.84rem;
          color: var(--sl-text-muted);
          margin: 0;
        }
        .sl-register a {
          color: var(--sl-link);
          font-weight: 700;
          text-decoration: none;
          transition: opacity 0.2s;
        }
        .sl-register a:hover { opacity: 0.8; }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ══════════ RESPONSIVE ══════════ */
        @media (max-width: 500px) {
          .sl-card { padding: 1.75rem 1.25rem 1.5rem; border-radius: 20px; }
          .sl-title { font-size: 1.4rem; }
          .sl-topbar { padding: 16px 16px; }
          .sl-blob { filter: blur(60px); }
        }
      `}</style>
    </div>
  );
}
