import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Pencil, Users, UserCheck, UserX, Shield, Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';
import type { User, Client, Role } from '../../types/database';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatNumber } from '../../lib/formatters';
import { Modal } from '../shared/Modal';
import { RolesManagement } from './RolesManagement';

interface UserManagementProps {
  onBack: () => void;
}

type Tab = 'users' | 'roles';

export const UserManagement = ({ onBack }: UserManagementProps) => {
  const { profile } = useAuth();
  const { showSuccess, showError, confirm } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('users');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, clientsRes, rolesRes] = await Promise.all([
        supabase.from('users').select('*, roles(id, name, is_system)').order('created_at', { ascending: false }),
        supabase.from('clients').select('*'),
        supabase.from('roles').select('*').order('is_system', { ascending: false }).order('name'),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setUsers(usersRes.data || []);
      setClients(clientsRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (user: User) => {
    // Use the joined role name if available
    if (user.roles) {
      const isSystem = user.roles.is_system;
      return {
        label: user.roles.name,
        cls: isSystem ? 'badge badge-purple' : 'badge badge-blue',
      };
    }
    // Fallback to legacy role field
    switch (user.role) {
      case 'super_admin': return { label: 'مدير عام', cls: 'badge badge-purple' };
      case 'project_manager': return { label: 'مدير مشاريع', cls: 'badge badge-blue' };
      default: return { label: user.role, cls: 'badge badge-gray' };
    }
  };

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toggleUserStatus = async (user: User) => {
    const action = user.is_active ? 'إيقاف' : 'تفعيل';
    const confirmed = await confirm({
      title: `${action} المستخدم`,
      message: `هل تريد ${action} حساب "${user.full_name}"؟`,
      confirmText: action,
      type: user.is_active ? 'danger' : 'info',
    });
    if (!confirmed) return;

    setTogglingId(user.id);
    // Optimistic update
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);
      if (error) throw error;
      showSuccess(`تم ${action} المستخدم بنجاح`);
    } catch (error) {
      // Revert optimistic update
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: user.is_active } : u));
      showError('حدث خطأ أثناء تحديث حالة المستخدم');
    } finally {
      setTogglingId(null);
    }
  };

  const deleteUser = async (user: User) => {
    // Prevent self-delete
    if (user.email === profile?.email) {
      showError('لا يمكنك حذف حسابك الخاص');
      return;
    }

    // Check if last admin
    const adminUsers = users.filter(u => (u.role === 'super_admin' || (u.roles && u.roles.is_system)) && u.id !== user.id);
    if ((user.role === 'super_admin' || (user.roles && user.roles.is_system)) && adminUsers.length === 0) {
      showError('لا يمكن حذف آخر مدير عام في النظام');
      return;
    }

    // Check if user has data (projects, activity)
    const [projectsRes, activityRes] = await Promise.all([
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
      supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    const projectCount = projectsRes.count || 0;
    const activityCount = activityRes.count || 0;

    let message = `هل أنت متأكد من حذف المستخدم "${user.full_name}"؟`;
    if (projectCount > 0 || activityCount > 0) {
      message += '\n\n⚠️ تنبيه: هذا المستخدم لديه بيانات مرتبطة:';
      if (projectCount > 0) message += `\n• ${projectCount} مشروع`;
      if (activityCount > 0) message += `\n• ${activityCount} سجل نشاط`;
      message += '\n\nيُفضل إيقاف الحساب بدلاً من حذفه. هل تريد المتابعة؟';
    }

    const confirmed = await confirm({
      title: 'حذف المستخدم',
      message,
      confirmText: 'حذف نهائي',
      type: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(user.id);
    try {
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showSuccess(`تم حذف المستخدم "${user.full_name}" بنجاح`);
    } catch (error) {
      console.error('Error deleting user:', error);
      showError('فشل حذف المستخدم. قد تكون هناك بيانات مرتبطة تمنع الحذف.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return u.full_name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
  });

  const activeCount = users.filter(u => u.is_active).length;
  const inactiveCount = users.filter(u => !u.is_active).length;
  const adminCount = users.filter(u => u.role === 'super_admin' || (u.roles && u.roles.is_system)).length;

  if (loading) {
    return <div className="dash-empty" style={{ height: 384 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div style={{ padding: 28 }}>
      {/* Page Title */}
      <div className="page-title-row">
        <div>
          <div className="page-title">إدارة المستخدمين</div>
          <div className="page-subtitle">إدارة حسابات وصلاحيات المستخدمين والأدوار</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border-soft)', marginBottom: 20 }}>
        {([
          { id: 'users' as Tab, label: 'المستخدمين', icon: <Users size={15} /> },
          { id: 'roles' as Tab, label: 'الأدوار والصلاحيات', icon: <Shield size={15} /> },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', fontSize: 13, fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.2s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'roles' ? (
        <RolesManagement />
      ) : (
        <>
          {/* Users tab header with add button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div />
            <button className="btn btn-primary" onClick={() => { setEditingUser(null); setShowModal(true); }}>
              <Plus size={16} /> مستخدم جديد
            </button>
          </div>

          {/* Stat Cards */}
          <div className="stats-grid">
            <div className="stat-card sc-blue">
              <div className="stat-icon-box"><Users size={18} /></div>
              <div className="stat-sub">إجمالي المستخدمين</div>
              <div className="stat-val">{formatNumber(users.length)}</div>
            </div>
            <div className="stat-card sc-green">
              <div className="stat-icon-box"><UserCheck size={18} /></div>
              <div className="stat-sub">نشط</div>
              <div className="stat-val">{formatNumber(activeCount)}</div>
            </div>
            <div className="stat-card sc-amber">
              <div className="stat-icon-box"><UserX size={18} /></div>
              <div className="stat-sub">غير نشط</div>
              <div className="stat-val">{formatNumber(inactiveCount)}</div>
            </div>
            <div className="stat-card sc-purple">
              <div className="stat-icon-box"><Shield size={18} /></div>
              <div className="stat-sub">مدير عام</div>
              <div className="stat-val">{formatNumber(adminCount)}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <input className="input" placeholder="بحث بالاسم أو البريد..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ maxWidth: 260 }} />
          </div>

          {/* Table */}
          {filteredUsers.length === 0 ? (
            <div className="dash-empty" style={{ height: 200 }}>
              <Users size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا يوجد مستخدمون</span>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>البريد الإلكتروني</th>
                    <th>الدور</th>
                    <th>آخر دخول</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const roleBadge = getRoleBadge(user);
                    return (
                      <tr key={user.id}>
                        <td><span className="td-primary">{user.full_name}</span></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }} dir="ltr">{user.email}</td>
                        <td><span className={roleBadge.cls}>{roleBadge.label}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {(user as any).last_login
                            ? new Date((user as any).last_login).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                        <td>
                          {user.is_active ? (
                            <span className="badge badge-green">
                              <span className="badge-dot" style={{ background: 'var(--success)' }} />
                              نشط
                            </span>
                          ) : (
                            <span className="badge badge-red">
                              <span className="badge-dot" style={{ background: 'var(--danger)' }} />
                              غير نشط
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="actions-cell" style={{ gap: 4 }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => { setEditingUser(user); setShowModal(true); }}
                              style={{ color: 'var(--accent-lighter)', padding: 6 }}
                              title="تعديل"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => toggleUserStatus(user)}
                              disabled={togglingId === user.id}
                              style={{ color: user.is_active ? 'var(--danger-text)' : 'var(--success-text)', fontSize: 12, minWidth: 50 }}
                              title={user.is_active ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                            >
                              {togglingId === user.id ? <Loader2 size={14} className="spin" /> : (user.is_active ? 'إيقاف' : 'تفعيل')}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => deleteUser(user)}
                              disabled={deletingId === user.id}
                              style={{ color: 'var(--danger-text)', padding: 6 }}
                              title="حذف المستخدم"
                            >
                              {deletingId === user.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {showModal && (
            <UserModal
              key={editingUser?.id ?? 'new'}
              user={editingUser}
              clients={clients}
              roles={roles}
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
        </>
      )}
    </div>
  );
};

interface UserModalProps {
  user: User | null;
  clients: Client[];
  roles: Role[];
  onClose: () => void;
  onSuccess: () => void;
}

const UserModal = ({ user, clients, roles, onClose, onSuccess }: UserModalProps) => {
  const { showError } = useNotification();
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: (user as any)?.phone || '',
    username: user?.username || '',
    role_id: user?.role_id || roles.find(r => !r.is_system)?.id || '',
    password: '',
    confirmPassword: '',
    sendInvite: true,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user && formData.password !== formData.confirmPassword) {
      showError('كلمة المرور وتأكيدها غير متطابقتين');
      return;
    }

    if (!formData.role_id) {
      showError('يرجى اختيار الدور');
      return;
    }

    setLoading(true);

    try {
      // Determine the legacy role text from role_id
      const selectedRole = roles.find(r => r.id === formData.role_id);
      const roleName = (selectedRole?.name || '').toLowerCase();
      const legacyRole = selectedRole?.is_system
        ? 'super_admin'
        : (roleName.includes('محاسب') || roleName.includes('accountant'))
          ? 'accountant'
          : 'project_manager';

      if (user) {
        const { error } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            username: formData.username || null,
            role: legacyRole,
            role_id: formData.role_id,
          })
          .eq('id', user.id);

        if (error) throw error;
      } else {
        // Use separate Supabase client to avoid swapping admin session
        const tempClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } }
        );

        const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { full_name: formData.full_name } },
        });

        if (signUpError) throw new Error(signUpError.message);

        // Supabase returns user with empty identities if email already exists
        if (!signUpData.user || (signUpData.user.identities && signUpData.user.identities.length === 0)) {
          throw new Error('هذا البريد الإلكتروني مسجل بالفعل');
        }

        const userId = signUpData.user.id;

        // Insert profile — use upsert to handle race conditions with triggers
        const { error: profileError } = await supabase.from('users').upsert({
          id: userId,
          email: formData.email,
          full_name: formData.full_name,
          username: formData.username || null,
          phone: formData.phone || null,
          role: legacyRole,
          role_id: formData.role_id,
        }, { onConflict: 'id' });

        if (profileError) throw new Error(profileError.message);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving user:', error);
      const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ المستخدم';
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={user ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, marginTop: -8 }}>
        {user ? 'تعديل بيانات وصلاحيات المستخدم' : 'إنشاء حساب مستخدم جديد في النظام'}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Row 1: Name + Email */}
        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">الاسم الكامل <span className="req">*</span></label>
            <input
              type="text"
              className="input"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="الاسم الأول والأخير"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">البريد الإلكتروني <span className="req">*</span></label>
            <input
              type="email"
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@halflens.sa"
              required
              disabled={!!user}
              dir="ltr"
            />
          </div>
        </div>

        {/* Row 2: Phone + Role */}
        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">رقم الجوال</label>
            <input
              type="tel"
              className="input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+966 5x xxx xxxx"
              dir="ltr"
            />
          </div>

          <div className="input-group">
            <label className="input-label">الدور <span className="req">*</span></label>
            <select
              className="input"
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              required
            >
              <option value="" disabled>اختر الدور</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.is_system ? '(نظامي)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Passwords (only for new user) */}
        {!user && (
          <div className="form-grid">
            <div className="input-group">
              <label className="input-label">كلمة المرور <span className="req">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  dir="ltr"
                  style={{ paddingLeft: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">تأكيد كلمة المرور <span className="req">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                  dir="ltr"
                  style={{ paddingLeft: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Send invite toggle */}
        {!user && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border-soft)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>إرسال دعوة بالبريد</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>إرسال رابط تفعيل الحساب عبر البريد الإلكتروني</div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, sendInvite: !formData.sendInvite })}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: formData.sendInvite ? 'var(--accent)' : 'var(--border-soft)',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3,
                right: formData.sendInvite ? 3 : 'auto',
                left: formData.sendInvite ? 'auto' : 3,
                transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, gap: 6 }}>
            {loading ? 'جاري الحفظ...' : (
              <><Plus size={15} /> {user ? 'حفظ التعديلات' : 'إضافة المستخدم'}</>
            )}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
};
