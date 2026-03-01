import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus } from 'lucide-react';

export const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin' | 'client'>('admin');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await signUp(email, password, fullName, role);
      setSuccess('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (err: any) {
      setError(err.message || 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-dark-border w-full max-w-md p-8">
        <div className="flex justify-center mb-8">
          <div className="bg-green-600 p-4 rounded-full">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-slate-800">إنشاء حساب جديد</h1>
        <p className="text-center text-slate-600 mb-8">نظام إدارة الفواتير والمشاريع</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
              الاسم الكامل
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              placeholder="أدخل الاسم الكامل"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              placeholder="admin2@example.com"
              required
              dir="ltr"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              placeholder="••••••••"
              required
              minLength={6}
              dir="ltr"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
              الصلاحية
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'super_admin' | 'client')}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              required
            >
              <option value="admin">مسؤول</option>
              <option value="super_admin">مسؤول أعلى</option>
              <option value="client">عميل</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
          </button>
        </form>
      </div>
    </div>
  );
};
