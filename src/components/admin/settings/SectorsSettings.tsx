import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { getTheme, borderRadius, fontSize } from '../../../theme/tokens';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { Briefcase, Plus, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react';
import { Button, Input } from '../../ui';

interface Sector {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

export const SectorsSettings: React.FC = () => {
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const { showNotification } = useNotification();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSector, setNewSector] = useState({ name_ar: '', name_en: '' });
  const [editSector, setEditSector] = useState({ name_ar: '', name_en: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<string | null>(null);

  useEffect(() => {
    fetchSectors();
  }, []);

  const fetchSectors = async () => {
    try {
      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSectors(data || []);
    } catch (error) {
      console.error('Error fetching sectors:', error);
      showNotification('حدث خطأ أثناء تحميل القطاعات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newSector.name_ar.trim() || !newSector.name_en.trim()) {
      showNotification('يرجى إدخال اسم القطاع بالعربية والإنجليزية', 'error');
      return;
    }

    if (isSaving) return;

    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('sectors')
        .insert([{ ...newSector, is_active: true }])
        .select()
        .single();

      if (error) throw error;

      setSectors(prev => [...prev, data].sort((a, b) => a.display_order - b.display_order));

      showNotification('تم إضافة القطاع بنجاح', 'success');
      setSuccessAnimation('add');
      setTimeout(() => setSuccessAnimation(null), 600);
      setNewSector({ name_ar: '', name_en: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding sector:', error);
      showNotification('حدث خطأ أثناء إضافة القطاع', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editSector.name_ar.trim() || !editSector.name_en.trim()) {
      showNotification('يرجى إدخال اسم القطاع بالعربية والإنجليزية', 'error');
      return;
    }

    if (isSaving) return;

    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('sectors')
        .update({
          name_ar: editSector.name_ar,
          name_en: editSector.name_en,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSectors(prev => prev.map(sector => sector.id === id ? data : sector).sort((a, b) => a.display_order - b.display_order));

      showNotification('تم تحديث القطاع بنجاح', 'success');
      setSuccessAnimation(id);
      setTimeout(() => setSuccessAnimation(null), 600);
      setEditingId(null);
      setEditSector({ name_ar: '', name_en: '' });
    } catch (error) {
      console.error('Error updating sector:', error);
      showNotification('حدث خطأ أثناء تحديث القطاع', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القطاع؟')) return;

    try {
      const { error } = await supabase
        .from('sectors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSectors(prev => prev.filter(sector => sector.id !== id));

      showNotification('تم حذف القطاع بنجاح', 'success');
    } catch (error) {
      console.error('Error deleting sector:', error);
      showNotification('حدث خطأ أثناء حذف القطاع', 'error');
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase
        .from('sectors')
        .update({ is_active: !isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSectors(prev => prev.map(sector => sector.id === id ? data : sector));

      showNotification(`تم ${!isActive ? 'تفعيل' : 'إلغاء تفعيل'} القطاع بنجاح`, 'success');
    } catch (error) {
      console.error('Error toggling sector:', error);
      showNotification('حدث خطأ أثناء تحديث حالة القطاع', 'error');
    }
  };

  const startEdit = (sector: Sector) => {
    setEditingId(sector.id);
    setEditSector({ name_ar: sector.name_ar, name_en: sector.name_en });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditSector({ name_ar: '', name_en: '' });
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
        <p style={{ color: theme.text.secondary }}>جاري تحميل القطاعات...</p>
      </div>
    );
  }

  return (
    <div style={containerStyles}>
      <div style={headerStyles}>
        <div style={titleContainerStyles}>
          <Briefcase size={24} color={theme.primary.main} />
          <h2 style={titleStyles}>إدارة القطاعات</h2>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus size={16} />
            إضافة قطاع
          </Button>
        )}
      </div>

      {isAdding && (
        <div style={addFormStyles}>
          <Input
            label="اسم القطاع بالعربية"
            value={newSector.name_ar}
            onChange={(e) => setNewSector({ ...newSector, name_ar: e.target.value })}
            placeholder="مثال: تقنية"
          />
          <Input
            label="اسم القطاع بالإنجليزية"
            value={newSector.name_en}
            onChange={(e) => setNewSector({ ...newSector, name_en: e.target.value })}
            placeholder="Example: Technology"
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
                setNewSector({ name_ar: '', name_en: '' });
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
          {sectors.map((sector) => (
            <tr key={sector.id}>
              <td style={tdStyles}>
                {editingId === sector.id ? (
                  <Input
                    value={editSector.name_ar}
                    onChange={(e) => setEditSector({ ...editSector, name_ar: e.target.value })}
                    fullWidth
                  />
                ) : (
                  sector.name_ar
                )}
              </td>
              <td style={tdStyles}>
                {editingId === sector.id ? (
                  <Input
                    value={editSector.name_en}
                    onChange={(e) => setEditSector({ ...editSector, name_en: e.target.value })}
                    fullWidth
                  />
                ) : (
                  sector.name_en
                )}
              </td>
              <td style={tdStyles}>
                <span style={badgeStyles(sector.is_active)}>
                  {sector.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </td>
              <td style={tdStyles}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {editingId === sector.id ? (
                    <>
                      <button
                        onClick={() => handleEdit(sector.id)}
                        style={{ ...actionButtonStyles, color: theme.status.success.main }}
                        title="حفظ"
                        disabled={isSaving}
                        className={successAnimation === sector.id ? 'animate-success-flash' : ''}
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
                        onClick={() => startEdit(sector)}
                        style={{ ...actionButtonStyles, color: theme.primary.main }}
                        title="تعديل"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => toggleActive(sector.id, sector.is_active)}
                        style={{ ...actionButtonStyles, color: theme.status.warning.main }}
                        title={sector.is_active ? 'إلغاء التفعيل' : 'تفعيل'}
                      >
                        {sector.is_active ? <X size={18} /> : <Check size={18} />}
                      </button>
                      <button
                        onClick={() => handleDelete(sector.id)}
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

      {sectors.length === 0 && (
        <p style={{ textAlign: 'center', color: theme.text.secondary, padding: '2rem' }}>
          لا توجد قطاعات مضافة حالياً
        </p>
      )}
    </div>
  );
};
