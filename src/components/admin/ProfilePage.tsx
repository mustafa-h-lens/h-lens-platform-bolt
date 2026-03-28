import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabaseClient';
import { ChevronLeft, Edit2, Lock, Camera, Eye, EyeOff, Loader2, Mail, Phone, User, Shield } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const getRoleLabel = (role?: string) => {
  switch (role) {
    case 'super_admin': return 'مدير عام';
    case 'project_manager': return 'مدير مشاريع';
    case 'admin': return 'مدير';
    default: return role || '';
  }
};

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2);
};

export const ProfilePage = ({ onBack }: Props) => {
  const { user, profile, refreshProfile } = useAuth();
  const { showSuccess, showError } = useNotification();

  // Personal info state
  const [editing, setEditing] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState((profile as any)?.phone || '');

  // Password state
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Avatar state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarUrl = (profile as any)?.avatar_url || null;

  const handleSaveInfo = async () => {
    if (!fullName.trim()) {
      showError('الاسم الكامل مطلوب');
      return;
    }
    setSavingInfo(true);
    try {
      const updateData: Record<string, unknown> = { full_name: fullName.trim() };
      // Try including phone — column may not exist yet
      if (phone.trim()) updateData.phone = phone.trim();
      else updateData.phone = null;

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user!.id);

      if (error) {
        // If phone column doesn't exist, retry without it
        if (error.message?.includes('phone')) {
          const { error: retryError } = await supabase
            .from('users')
            .update({ full_name: fullName.trim() })
            .eq('id', user!.id);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
      if (refreshProfile) await refreshProfile();
      setEditing(false);
      showSuccess('تم تحديث المعلومات الشخصية بنجاح');
    } catch {
      showError('حدث خطأ أثناء حفظ المعلومات');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleCancelEdit = () => {
    setFullName(profile?.full_name || '');
    setPhone((profile as any)?.phone || '');
    setEditing(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('كلمة المرور الجديدة وتأكيدها غير متطابقتين');
      return;
    }
    setSavingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      });
      if (signInError) {
        showError('كلمة المرور الحالية غير صحيحة');
        setSavingPassword(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('تم تغيير كلمة المرور بنجاح');
    } catch {
      showError('حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showError('يرجى اختيار صورة');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showError('حجم الصورة يجب أن لا يتجاوز 2MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user!.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('user-avatars').getPublicUrl(path);
      const avatarUrlWithCache = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrlWithCache })
        .eq('id', user!.id);
      if (updateError) throw updateError;

      if (refreshProfile) await refreshProfile();
      showSuccess('تم تحديث الصورة الشخصية');
    } catch {
      showError('فشل رفع الصورة. تأكد من وجود bucket "user-avatars" في Storage.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const PasswordField = ({ value, onChange, show, onToggle, placeholder }: {
    value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string;
  }) => (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        dir="ltr"
        style={{ paddingLeft: 40 }}
      />
      <button
        type="button"
        onClick={onToggle}
        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  return (
    <div style={{ padding: 28 }}>
      {/* Page header */}
      <div className="page-title-row" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-title">الملف الشخصي</div>
          <div className="page-subtitle">إدارة بيانات حسابك الشخصي</div>
        </div>
      </div>

      {/* Profile header card — full width */}
      <div className="card" style={{ cursor: 'default', padding: '32px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Avatar + Info — first in RTL = right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border-soft)' }}
                />
              ) : (
                <div className="avatar av-xl" style={{
                  width: 88, height: 88, fontSize: 24, fontWeight: 700,
                  background: 'var(--accent-glow)', color: 'var(--accent-lighter)',
                  border: '3px solid var(--border-soft)',
                }}>
                  {getInitials(profile?.full_name)}
                </div>
              )}
              <div style={{
                position: 'absolute', bottom: 2, left: 2,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--accent)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg-surface)',
              }}>
                {uploadingAvatar ? <Loader2 size={12} className="spin" /> : <Camera size={13} />}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                  e.target.value = '';
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{profile?.full_name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={12} /> {getRoleLabel(profile?.role)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={12} /> {user?.email}
              </div>
            </div>
          </div>
          {/* Badge — last in RTL = left side */}
          <span className="badge badge-green" style={{ fontSize: 12 }}>
            <span className="badge-dot" style={{ background: 'var(--success)' }} />
            نشط
          </span>
        </div>
      </div>

      {/* Two-column layout: right = personal info + password, left = empty (no notifications) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Personal info card */}
      <div className="card" style={{ cursor: 'default', padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>المعلومات الشخصية</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>بياناتك الشخصية في النظام</div>
          </div>
          {!editing ? (
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)} style={{ gap: 6 }}>
              <Edit2 size={13} /> تعديل
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={handleSaveInfo} disabled={savingInfo} style={{ gap: 6, background: 'var(--accent)', color: '#fff' }}>
                {savingInfo ? <Loader2 size={13} className="spin" /> : null} حفظ
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleCancelEdit}>إلغاء</button>
            </div>
          )}
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">الاسم الكامل</label>
            <input
              className="input"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              disabled={!editing}
            />
          </div>
          <div className="input-group">
            <label className="input-label">البريد الإلكتروني</label>
            <input
              className="input"
              value={user?.email || ''}
              disabled
              dir="ltr"
            />
          </div>
          <div className="input-group">
            <label className="input-label">رقم الجوال</label>
            <input
              className="input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={!editing}
              placeholder="+966 55 123 4567"
              dir="ltr"
            />
          </div>
          <div className="input-group">
            <label className="input-label">الدور</label>
            <input
              className="input"
              value={getRoleLabel(profile?.role)}
              disabled
            />
          </div>
        </div>
      </div>

      {/* Password card */}
      <div className="card" style={{ cursor: 'default', padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: changingPassword ? 20 : 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>كلمة المرور</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>تغيير كلمة المرور الخاصة بك</div>
          </div>
          {!changingPassword && (
            <button className="btn btn-secondary btn-sm" onClick={() => setChangingPassword(true)} style={{ gap: 6 }}>
              <Lock size={13} /> تغيير
            </button>
          )}
        </div>

        {!changingPassword && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>
            <Lock size={14} />
            <span>••••••••</span>
          </div>
        )}

        {changingPassword && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">كلمة المرور الحالية</label>
              <PasswordField
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrentPw}
                onToggle={() => setShowCurrentPw(!showCurrentPw)}
                placeholder="أدخل كلمة المرور الحالية"
              />
            </div>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">كلمة المرور الجديدة</label>
                <PasswordField
                  value={newPassword}
                  onChange={setNewPassword}
                  show={showNewPw}
                  onToggle={() => setShowNewPw(!showNewPw)}
                  placeholder="6 أحرف على الأقل"
                />
              </div>
              <div className="input-group">
                <label className="input-label">تأكيد كلمة المرور الجديدة</label>
                <PasswordField
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showConfirmPw}
                  onToggle={() => setShowConfirmPw(!showConfirmPw)}
                  placeholder="أعد إدخال كلمة المرور"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={handleChangePassword} disabled={savingPassword} style={{ gap: 6, background: 'var(--accent)', color: '#fff' }}>
                {savingPassword ? <Loader2 size={13} className="spin" /> : <Lock size={13} />} تغيير كلمة المرور
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                setChangingPassword(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}>
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>

        </div>{/* end right column */}

        {/* Left column — empty (notifications removed) */}
        <div />
      </div>{/* end grid */}
    </div>
  );
};
