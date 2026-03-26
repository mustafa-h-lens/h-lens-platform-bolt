import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit2, Users, UserCheck, UserX, Shield } from 'lucide-react';
import type { User, Client } from '../../types/database';
import { useNotification } from '../../contexts/NotificationContext';
import { formatNumber } from '../../lib/formatters';
import { Modal } from '../shared/Modal';

interface UserManagementProps {
  onBack: () => void;
}

export const UserManagement = ({ onBack }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return { label: 'مدير عام', cls: 'badge badge-purple' };
      case 'project_manager': return { label: 'مدير مشاريع', cls: 'badge badge-blue' };
      default: return { label: role, cls: 'badge badge-gray' };
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

  const filteredUsers = users.filter(u => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return u.full_name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (u.username && u.username.toLowerCase().includes(s));
  });

  const activeCount = users.filter(u => u.is_active).length;
  const inactiveCount = users.filter(u => !u.is_active).length;
  const adminCount = users.filter(u => u.role === 'super_admin').length;

  if (loading) {
    return <div className="dash-empty" style={{ height: 384 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div style={{ padding: 28 }}>
      {/* Page Title */}
      <div className="page-title-row">
        <div>
          <div className="page-title">إدارة المستخدمين</div>
          <div className="page-subtitle">إدارة حسابات وصلاحيات المستخدمين</div>
        </div>
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
                <th>اسم المستخدم</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const roleBadge = getRoleBadge(user.role);
                return (
                  <tr key={user.id}>
                    <td><span className="td-primary">{user.full_name}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }} dir="ltr">{user.email}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{user.username || '-'}</td>
                    <td><span className={roleBadge.cls}>{roleBadge.label}</span></td>
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
                      <div className="actions-cell">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setEditingUser(user); setShowModal(true); }}
                          style={{ color: 'var(--accent-lighter)', padding: 6 }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleUserStatus(user)}
                          style={{ color: user.is_active ? 'var(--danger-text)' : 'var(--success-text)', fontSize: 12 }}
                        >
                          {user.is_active ? 'إيقاف' : 'تفعيل'}
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
  const { showError } = useNotification();
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    username: user?.username || '',
    role: user?.role || 'project_manager',
    password: '',
    confirmPassword: '',
    sendInvite: true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user && formData.password !== formData.confirmPassword) {
      showError('كلمة المرور وتأكيدها غير متطابقتين');
      return;
    }

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
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
              required
            >
              <option value="" disabled>اختر الدور</option>
              <option value="project_manager">مدير مشاريع</option>
              <option value="super_admin">مدير عام</option>
            </select>
          </div>
        </div>

        {/* Row 3: Passwords (only for new user) */}
        {!user && (
          <div className="form-grid">
            <div className="input-group">
              <label className="input-label">كلمة المرور <span className="req">*</span></label>
              <input
                type="password"
                className="input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                dir="ltr"
              />
            </div>

            <div className="input-group">
              <label className="input-label">تأكيد كلمة المرور <span className="req">*</span></label>
              <input
                type="password"
                className="input"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={6}
                dir="ltr"
              />
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
