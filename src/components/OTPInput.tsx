import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface OTPInputProps {
  email: string;
  onBack: () => void;
  onSuccess: (vendorData: any) => void;
  devOTP?: string | null;
}

export default function OTPInput({ email, onBack, onSuccess, devOTP }: OTPInputProps) {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');
    setRemainingAttempts(null);

    // Move to next input (left to right: 0->1->2->3)
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(digit => digit) && newOtp.join('').length === 4) {
      verifyOTP(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Backspace moves to previous input (right to left: 3->2->1->0)
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const newOtp = [...otp];

    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }

    setOtp(newOtp);

    if (pastedData.length === 4) {
      verifyOTP(pastedData);
    } else if (pastedData.length > 0) {
      inputRefs.current[Math.min(pastedData.length, 3)]?.focus();
    }
  };

  const verifyOTP = async (code: string) => {
    setLoading(true);
    setError('');

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
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        throw new Error(data.error || 'رمز التحقق غير صحيح');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess(data);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في التحقق');
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');
    setOtp(['', '', '', '']);
    setRemainingAttempts(null);

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
        throw new Error(data.error || 'حدث خطأ أثناء إعادة الإرسال');
      }

      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0a0f1e] to-[#1a2332] p-8 text-center">
            <img
              src="/half_lens_logo_-_color.png"
              alt="Half Lens"
              className="h-16 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-white mb-2">
              إدخال رمز التحقق
            </h1>
            <p className="text-slate-300 text-sm">
              تم إرسال الرمز إلى: {email}
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="text-center mb-8">
              <p className="text-slate-600 text-sm leading-relaxed">
                أدخل رمز التحقق المكون من 4 أرقام الذي أرسلناه إلى بريدك الإلكتروني
              </p>
            </div>

            {/* Dev OTP Display */}
            {devOTP && (
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-500 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 text-center mb-2">
                  🔐 Development Mode - Your OTP Code
                </p>
                <p className="text-3xl font-bold text-blue-700 text-center tracking-widest font-mono" dir="ltr">
                  {devOTP}
                </p>
                <p className="text-xs text-blue-600 text-center mt-2">
                  Enter this code in the boxes below
                </p>
              </div>
            )}

            {/* OTP Input Boxes */}
            <div className="mb-8">
              <div className="flex justify-center gap-3 mb-6" dir="ltr" style={{ direction: 'ltr' }}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={loading || success}
                    style={{
                      textAlign: 'center',
                      direction: 'ltr'
                    }}
                    className={`w-16 h-20 text-center text-3xl font-bold rounded-xl border-2 outline-none transition-all ${
                      success
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : error
                        ? 'bg-red-50 border-red-500 text-red-700 animate-shake'
                        : digit
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  />
                ))}
              </div>

              <div className="text-center">
                <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  الرمز صالح لمدة 10 دقائق
                </p>
              </div>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="text-green-600" size={24} />
                <p className="text-sm text-green-800 font-medium text-right flex-1">
                  تم التحقق بنجاح! جاري تسجيل الدخول...
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1 text-right">
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                    {remainingAttempts !== null && remainingAttempts > 0 && (
                      <p className="text-xs text-red-700 mt-1">
                        المحاولات المتبقية: {remainingAttempts}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && !success && (
              <div className="mb-6 flex items-center justify-center gap-2 text-blue-600">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm font-medium">جاري التحقق...</span>
              </div>
            )}

            {/* Resend Button */}
            <div className="text-center mb-6">
              <p className="text-sm text-slate-600 mb-2">لم تستلم الرمز؟</p>
              <button
                onClick={handleResendOTP}
                disabled={loading || success}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                إعادة إرسال الرمز
              </button>
            </div>

            {/* Back Button */}
            <button
              onClick={onBack}
              disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight size={20} />
              <span className="text-sm font-medium">العودة لتغيير البريد الإلكتروني</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-slate-600">
          <p>© 2024 Half Lens. جميع الحقوق محفوظة.</p>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
}
