import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit2, Trash2, Copy, Shield, Users, Check, X } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { Modal } from '../shared/Modal';
import type { RoleWithPermissions, ModuleKey } from '../../types/database';
import { MODULE_KEYS, MODULE_LABELS } from '../../types/database';

export const RolesManagement = () => {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [duplicatingRole, setDuplicatingRole] = useState<RoleWithPermissions | null>(null);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*, role_permissions(*)')
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserCountForRole = async (roleId: string): Promise<number> => {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleId);
    return count || 0;
  };

  const handleDelete = async (role: RoleWithPermissions) => {
    if (role.is_system) return;

    const userCount = await getUserCountForRole(role.id);
    if (userCount > 0) {
      showError(`لا يمكن حذف هذا الدور لأنه مرتبط بـ ${userCount} مستخدم`);
      return;
    }

    if (!confirm(`هل تريد حذف الدور "${role.name}"؟`)) return;

    try {
      const { error } = await supabase.from('roles').delete().eq('id', role.id);
      if (error) throw error;
      loadRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      showError('حدث خطأ أثناء حذف الدور');
    }
  };

  const { showError } = useNotification();

  if (loading) {
    return <div className="dash-empty" style={{ height: 200 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>الأدوار والصلاحيات</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>إنشاء وإدارة الأدوار وتحديد صلاحيات الوصول لكل دور</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingRole(null); setDuplicatingRole(null); setShowModal(true); }}>
          <Plus size={16} /> دور جديد
        </button>
      </div>

      {/* Roles Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {roles.map((role) => {
          const enabledCount = role.is_system
            ? MODULE_KEYS.length
            : role.role_permissions.filter(p => p.has_access).length;

          return (
            <div
              key={role.id}
              className="card"
              style={{
                padding: 20,
                border: role.is_system ? '1px solid var(--accent)' : '1px solid var(--border-soft)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {/* Role header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                    background: role.is_system ? 'var(--accent-glow)' : 'var(--bg-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: role.is_system ? 'var(--accent-lighter)' : 'var(--text-muted)',
                  }}>
                    <Shield size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{role.name}</div>
                    {role.is_system && (
                      <span className="badge badge-purple" style={{ fontSize: 10, marginTop: 2 }}>نظامي</span>
                    )}
                  </div>
                </div>
                {!role.is_system && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setDuplicatingRole(role); setEditingRole(null); setShowModal(true); }}
                      title="نسخ"
                      style={{ padding: 6, color: 'var(--text-muted)' }}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setEditingRole(role); setDuplicatingRole(null); setShowModal(true); }}
                      title="تعديل"
                      style={{ padding: 6, color: 'var(--accent-lighter)' }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDelete(role)}
                      title="حذف"
                      style={{ padding: 6, color: 'var(--danger-text)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              {role.description && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                  {role.description}
                </div>
              )}

              {/* Permissions summary */}
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                <Users size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
                {enabledCount} من {MODULE_KEYS.length} أقسام مفعّلة
              </div>

              {/* Module badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {MODULE_KEYS.map((key) => {
                  const hasAccess = role.is_system || role.role_permissions.some(p => p.module_key === key && p.has_access);
                  return (
                    <span
                      key={key}
                      className={`badge ${hasAccess ? 'badge-green' : 'badge-gray'}`}
                      style={{ fontSize: 10, opacity: hasAccess ? 1 : 0.4 }}
                    >
                      {hasAccess ? <Check size={9} style={{ marginLeft: 2 }} /> : <X size={9} style={{ marginLeft: 2 }} />}
                      {MODULE_LABELS[key]}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <RoleModal
          role={editingRole}
          duplicateFrom={duplicatingRole}
          onClose={() => { setShowModal(false); setEditingRole(null); setDuplicatingRole(null); }}
          onSuccess={() => { loadRoles(); setShowModal(false); setEditingRole(null); setDuplicatingRole(null); }}
        />
      )}
    </div>
  );
};

// ─── Role Modal ───────────────────────────────────────────────
interface RoleModalProps {
  role: RoleWithPermissions | null;
  duplicateFrom: RoleWithPermissions | null;
  onClose: () => void;
  onSuccess: () => void;
}

const RoleModal = ({ role, duplicateFrom, onClose, onSuccess }: RoleModalProps) => {
  const { showError } = useNotification();
  const isEditing = !!role;
  const source = role || duplicateFrom;

  const [name, setName] = useState(role ? role.name : duplicateFrom ? `${duplicateFrom.name} (نسخة)` : '');
  const [description, setDescription] = useState(source?.description || '');
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    const perms: Record<string, boolean> = {};
    MODULE_KEYS.forEach(key => {
      if (source) {
        perms[key] = source.role_permissions.some(p => p.module_key === key && p.has_access);
      } else {
        // New role: dashboard on by default
        perms[key] = key === 'dashboard';
      }
    });
    return perms;
  });
  const [loading, setLoading] = useState(false);

  const togglePermission = (key: ModuleKey) => {
    // users & settings cannot be enabled for non-system roles
    if (key === 'users') return;
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError('يرجى إدخال اسم الدور');
      return;
    }

    setLoading(true);
    try {
      let roleId: string;

      if (isEditing) {
        // Update role
        const { error } = await supabase
          .from('roles')
          .update({ name: name.trim(), description: description.trim() || null })
          .eq('id', role!.id);
        if (error) throw error;
        roleId = role!.id;

        // Delete old permissions and re-insert
        await supabase.from('role_permissions').delete().eq('role_id', roleId);
      } else {
        // Create role
        const { data, error } = await supabase
          .from('roles')
          .insert({ name: name.trim(), description: description.trim() || null })
          .select('id')
          .single();
        if (error) throw error;
        roleId = data.id;
      }

      // Insert permissions
      const permRows = MODULE_KEYS.map(key => ({
        role_id: roleId,
        module_key: key,
        has_access: key === 'users' ? false : (permissions[key] || false),
      }));

      const { error: permError } = await supabase.from('role_permissions').insert(permRows);
      if (permError) throw permError;

      onSuccess();
    } catch (error) {
      console.error('Error saving role:', error);
      const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ الدور';
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'تعديل الدور' : duplicateFrom ? 'نسخ الدور' : 'إضافة دور جديد'}
    >
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, marginTop: -8 }}>
        {isEditing ? 'تعديل اسم ووصف وصلاحيات الدور' : 'إنشاء دور جديد وتحديد صلاحيات الوصول'}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Name */}
        <div className="input-group">
          <label className="input-label">اسم الدور <span className="req">*</span></label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: محاسب، مدير عمليات..."
            required
          />
        </div>

        {/* Description */}
        <div className="input-group">
          <label className="input-label">الوصف</label>
          <input
            type="text"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="وصف مختصر لهذا الدور"
          />
        </div>

        {/* Permissions Grid */}
        <div className="input-group">
          <label className="input-label">صلاحيات الوصول للأقسام</label>
          <div style={{
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            {MODULE_KEYS.map((key, idx) => {
              const isLocked = key === 'users';
              const isOn = isLocked ? false : permissions[key];
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: idx < MODULE_KEYS.length - 1 ? '1px solid var(--border-soft)' : 'none',
                    background: isLocked ? 'var(--bg-hover)' : 'transparent',
                    opacity: isLocked ? 0.5 : 1,
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                    {MODULE_LABELS[key]}
                    {isLocked && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 6 }}>(مدير عام فقط)</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePermission(key)}
                    disabled={isLocked}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: 'none',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      background: isOn ? 'var(--accent)' : 'var(--border-soft)',
                      position: 'relative', transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3,
                      right: isOn ? 3 : 'auto',
                      left: isOn ? 'auto' : 3,
                      transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, gap: 6 }}>
            {loading ? 'جاري الحفظ...' : (
              <><Plus size={15} /> {isEditing ? 'حفظ التعديلات' : 'إضافة الدور'}</>
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
