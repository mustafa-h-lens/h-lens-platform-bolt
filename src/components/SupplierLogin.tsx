import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';

interface SupplierLoginProps {
  onOTPSent: (email: string, otpCode?: string) => void;
}

export default function SupplierLogin({ onOTPSent }: SupplierLoginProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOTP, setDevOTP] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني صالح');
      return;
    }

    setLoading(true);

    try {
      // Get device info
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

      // Store dev OTP if available
      if (data.otp) {
        setDevOTP(data.otp);
      }

      onOTPSent(email, data.otp);
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
              تسجيل دخول الموردين
            </h1>
            <p className="text-slate-300 text-sm">
              نظام إدارة الموردين - Half Lens
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                مرحباً بك
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                أدخل بريدك الإلكتروني وسنرسل لك رمز تحقق للدخول إلى حسابك
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-2 text-right"
                >
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail size={20} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-left"
                    disabled={loading}
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 text-right">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <span>إرسال رمز التحقق</span>
                )}
              </button>
            </form>

            {/* Dev OTP Display */}
            {devOTP && (
              <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-500 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 text-center mb-2">
                  🔐 Development Mode - OTP Code
                </p>
                <p className="text-3xl font-bold text-blue-700 text-center tracking-widest font-mono" dir="ltr">
                  {devOTP}
                </p>
                <p className="text-xs text-blue-600 text-center mt-2">
                  Use this code in the next screen
                </p>
              </div>
            )}

            {/* Info */}
            <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 text-right leading-relaxed">
                💡 <strong>ملاحظة:</strong> سيتم إرسال رمز التحقق إلى بريدك الإلكتروني
                المسجل في النظام. الرمز صالح لمدة 10 دقائق فقط.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-slate-600">
          <p>© 2024 Half Lens. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </div>
  );
}
