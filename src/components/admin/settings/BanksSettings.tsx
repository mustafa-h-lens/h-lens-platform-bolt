import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { getTheme, borderRadius, fontSize } from '../../../theme/tokens';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { Building2, Plus, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react';
import { Button, Input } from '../../ui';

interface Bank {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

export const BanksSettings: React.FC = () => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const { showNotification } = useNotification();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newBank, setNewBank] = useState({ name_ar: '', name_en: '' });
  const [editBank, setEditBank] = useState({ name_ar: '', name_en: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<string | null>(null);

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('name_ar');

      if (error) throw error;
      setBanks(data || []);
    } catch (error) {
      console.error('Error fetching banks:', error);
      showNotification('حدث خطأ أثناء تحميل البنوك', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newBank.name_ar.trim() || !newBank.name_en.trim()) {
      showNotification('يرجى إدخال اسم البنك بالعربية والإنجليزية', 'error');
      return;
    }

    if (isSaving) return;

    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('banks')
        .insert([{ ...newBank, is_active: true }])
        .select()
        .single();

      if (error) throw error;

      setBanks(prev => [...prev, data].sort((a, b) => a.name_ar.localeCompare(b.name_ar)));

      showNotification('تم إضافة البنك بنجاح', 'success');
      setSuccessAnimation('add');
      setTimeout(() => setSuccessAnimation(null), 600);
      setNewBank({ name_ar: '', name_en: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding bank:', error);
      showNotification('حدث خطأ أثناء إضافة البنك', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editBank.name_ar.trim() || !editBank.name_en.trim()) {
      showNotification('يرجى إدخال اسم البنك بالعربية والإنجليزية', 'error');
      return;
    }

    if (isSaving) return;

    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('banks')
        .update({
          name_ar: editBank.name_ar,
          name_en: editBank.name_en,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setBanks(prev => prev.map(bank => bank.id === id ? data : bank).sort((a, b) => a.name_ar.localeCompare(b.name_ar)));

      showNotification('تم تحديث البنك بنجاح', 'success');
      setSuccessAnimation(id);
      setTimeout(() => setSuccessAnimation(null), 600);
      setEditingId(null);
      setEditBank({ name_ar: '', name_en: '' });
    } catch (error) {
      console.error('Error updating bank:', error);
      showNotification('حدث خطأ أثناء تحديث البنك', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا البنك؟')) return;

    try {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBanks(prev => prev.filter(bank => bank.id !== id));

      showNotification('تم حذف البنك بنجاح', 'success');
    } catch (error) {
      console.error('Error deleting bank:', error);
      showNotification('حدث خطأ أثناء حذف البنك', 'error');
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .update({ is_active: !isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setBanks(prev => prev.map(bank => bank.id === id ? data : bank));

      showNotification(`تم ${!isActive ? 'تفعيل' : 'إلغاء تفعيل'} البنك بنجاح`, 'success');
    } catch (error) {
      console.error('Error toggling bank:', error);
      showNotification('حدث خطأ أثناء تحديث حالة البنك', 'error');
    }
  };

  const startEdit = (bank: Bank) => {
    setEditingId(bank.id);
    setEditBank({ name_ar: bank.name_ar, name_en: bank.name_en });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBank({ name_ar: '', name_en: '' });
  };

  const containerStyles: React.CSSProperties = {
    backgroundColor: theme.background.primary,
    borderRadius: borderRadius.lg,
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  };

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
  };

  const titleContainerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  };

  const titleStyles: React.CSSProperties = {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: theme.text.primary,
    margin: 0,
  };

  const tableStyles: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '1rem',
  };

  const thStyles: React.CSSProperties = {
    padding: '0.75rem',
    textAlign: 'right',
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: theme.text.secondary,
    borderBottom: `2px solid ${theme.border.default}`,
  };

  const tdStyles: React.CSSProperties = {
    padding: '0.75rem',
    textAlign: 'right',
    fontSize: fontSize.sm,
    color: theme.text.primary,
    borderBottom: `1px solid ${theme.border.default}`,
  };

  const badgeStyles = (isActive: boolean): React.CSSProperties => ({
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: borderRadius.full,
    fontSize: fontSize.xs,
    fontWeight: '600',
    backgroundColor: isActive ? theme.status.success.light : theme.status.warning.light,
    color: isActive ? theme.status.success.main : theme.status.warning.main,
  });

  const actionButtonStyles: React.CSSProperties = {
    padding: '0.375rem',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: borderRadius.DEFAULT,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const addFormStyles: React.CSSProperties = {
    backgroundColor: theme.background.secondary,
    padding: '1rem',
    borderRadius: borderRadius.DEFAULT,
    marginBottom: '1rem',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr auto',
    gap: '1rem',
    alignItems: 'end',
  };

  if (loading) {
    return (
      <div style={containerStyles}>
        <p style={{ color: theme.text.secondary }}>جاري تحميل البنوك...</p>
      </div>
    );
  }

  return (
    <div style={containerStyles}>
      <div style={headerStyles}>
        <div style={titleContainerStyles}>
          <Building2 size={24} color={theme.primary.main} />
          <h2 style={titleStyles}>إدارة البنوك</h2>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus size={16} />
            إضافة بنك
          </Button>
        )}
      </div>

      {isAdding && (
        <div style={addFormStyles}>
          <Input
            label="اسم البنك بالعربية"
            value={newBank.name_ar}
            onChange={(e) => setNewBank({ ...newBank, name_ar: e.target.value })}
            placeholder="مثال: البنك الأهلي السعودي"
          />
          <Input
            label="اسم البنك بالإنجليزية"
            value={newBank.name_en}
            onChange={(e) => setNewBank({ ...newBank, name_en: e.target.value })}
            placeholder="Example: Al Ahli Bank"
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              onClick={handleAdd}
              size="sm"
              disabled={isSaving}
              className={successAnimation === 'add' ? 'animate-success-flash' : ''}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {isSaving ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
            <Button
              onClick={() => {
                setIsAdding(false);
                setNewBank({ name_ar: '', name_en: '' });
              }}
              variant="outline"
              size="sm"
            >
              <X size={16} />
              إلغاء
            </Button>
          </div>
        </div>
      )}

      <table style={tableStyles}>
        <thead>
          <tr>
            <th style={thStyles}>الاسم بالعربية</th>
            <th style={thStyles}>الاسم بالإنجليزية</th>
            <th style={thStyles}>الحالة</th>
            <th style={thStyles}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {banks.map((bank) => (
            <tr key={bank.id}>
              <td style={tdStyles}>
                {editingId === bank.id ? (
                  <Input
                    value={editBank.name_ar}
                    onChange={(e) => setEditBank({ ...editBank, name_ar: e.target.value })}
                    fullWidth
                  />
                ) : (
                  bank.name_ar
                )}
              </td>
              <td style={tdStyles}>
                {editingId === bank.id ? (
                  <Input
                    value={editBank.name_en}
                    onChange={(e) => setEditBank({ ...editBank, name_en: e.target.value })}
                    fullWidth
                  />
                ) : (
                  bank.name_en
                )}
              </td>
              <td style={tdStyles}>
                <span style={badgeStyles(bank.is_active)}>
                  {bank.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </td>
              <td style={tdStyles}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {editingId === bank.id ? (
                    <>
                      <button
                        onClick={() => handleEdit(bank.id)}
                        style={{ ...actionButtonStyles, color: theme.status.success.main }}
                        title="حفظ"
                        disabled={isSaving}
                        className={successAnimation === bank.id ? 'animate-success-flash' : ''}
                      >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{ ...actionButtonStyles, color: theme.text.secondary }}
                        title="إلغاء"
                      >
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(bank)}
                        style={{ ...actionButtonStyles, color: theme.primary.main }}
                        title="تعديل"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => toggleActive(bank.id, bank.is_active)}
                        style={{ ...actionButtonStyles, color: theme.status.warning.main }}
                        title={bank.is_active ? 'إلغاء التفعيل' : 'تفعيل'}
                      >
                        {bank.is_active ? <X size={18} /> : <Check size={18} />}
                      </button>
                      <button
                        onClick={() => handleDelete(bank.id)}
                        style={{ ...actionButtonStyles, color: theme.status.error.main }}
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {banks.length === 0 && (
        <p style={{ textAlign: 'center', color: theme.text.secondary, padding: '2rem' }}>
          لا توجد بنوك مضافة حالياً
        </p>
      )}
    </div>
  );
};
