import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit2, XCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import type { User, Client } from '../../types/database';

interface UserManagementProps {
  onBack: () => void;
}

export const UserManagement = ({ onBack }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, clientsRes] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*')
      ]);

      if (usersRes.error) throw usersRes.error;
      if (clientsRes.error) throw clientsRes.error;

      setUsers(usersRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'super_admin': return 'مدير عام';
      case 'project_manager': return 'مدير مشاريع';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-700';
      case 'project_manager': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800
              text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">إدارة المستخدمين</h1>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-light
            text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>مستخدم جديد</span>
        </button>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border">
        {loading ? (
          <div className="p-8 text-center text-slate-600 dark:text-slate-300">جاري التحميل...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-600 dark:text-slate-300">لا يوجد مستخدمون</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-dark-border">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">الاسم</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">البريد الإلكتروني</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">اسم المستخدم</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">الدور</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">الحالة</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">{user.full_name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{user.email}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{user.username || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                        {getRoleText(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>نشط</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-4 h-4" />
                          <span>غير نشط</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleUserStatus(user)}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            user.is_active
                              ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                        >
                          {user.is_active ? 'إيقاف' : 'تفعيل'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <UserModal
          user={editingUser}
          clients={clients}
          onClose={() => {
            setShowModal(false);
            setEditingUser(null);
          }}
          onSuccess={() => {
            loadData();
            setShowModal(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
};

interface UserModalProps {
  user: User | null;
  clients: Client[];
  onClose: () => void;
  onSuccess: () => void;
}

const UserModal = ({ user, clients, onClose, onSuccess }: UserModalProps) => {
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    username: user?.username || '',
    role: user?.role || 'project_manager',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user) {
        const { error } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            username: formData.username || null,
            role: formData.role
          })
          .eq('id', user.id);

        if (error) throw error;
      } else {
        // Create auth user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('فشل في إنشاء المستخدم');

        // Create user record in users table
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            username: formData.username || null,
            role: formData.role,
          });

        if (userError) throw userError;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving user:', error);
      const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ المستخدم';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          {user ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              الاسم الكامل
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={!!user}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              اسم المستخدم
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              الدور
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="project_manager">مدير مشاريع</option>
              <option value="super_admin">مدير عام</option>
            </select>
          </div>

          {!user && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                كلمة المرور
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={!user}
                minLength={6}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
