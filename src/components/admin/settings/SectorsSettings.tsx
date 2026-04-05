import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { Briefcase, Plus, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react';

interface Sector {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  display_order?: number;
}

export const SectorsSettings: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSector, setNewSector] = useState({ name_ar: '', name_en: '' });
  const [editSector, setEditSector] = useState({ name_ar: '', name_en: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      showError('حدث خطأ أثناء تحميل القطاعات');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newSector.name_ar.trim() || !newSector.name_en.trim()) {
      showError('يرجى إدخال اسم القطاع بالعربية والإنجليزية');
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
      setSectors(prev => [...prev, data]);
      showSuccess('تم إضافة القطاع بنجاح');
      setNewSector({ name_ar: '', name_en: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding sector:', error);
      showError('حدث خطأ أثناء إضافة القطاع');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editSector.name_ar.trim() || !editSector.name_en.trim()) {
      showError('يرجى إدخال اسم القطاع بالعربية والإنجليزية');
      return;
    }
    if (isSaving) return;

    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('sectors')
        .update({ name_ar: editSector.name_ar, name_en: editSector.name_en })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setSectors(prev => prev.map(s => s.id === id ? data : s));
      showSuccess('تم تحديث القطاع بنجاح');
      setEditingId(null);
      setEditSector({ name_ar: '', name_en: '' });
    } catch (error) {
      console.error('Error updating sector:', error);
      showError('حدث خطأ أثناء تحديث القطاع');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القطاع؟')) return;

    try {
      const { error } = await supabase.from('sectors').delete().eq('id', id);
      if (error) throw error;
      setSectors(prev => prev.filter(s => s.id !== id));
      showSuccess('تم حذف القطاع بنجاح');
    } catch (error) {
      console.error('Error deleting sector:', error);
      showError('حدث خطأ أثناء حذف القطاع');
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
      setSectors(prev => prev.map(s => s.id === id ? data : s));
      showSuccess(`تم ${!isActive ? 'تفعيل' : 'إلغاء تفعيل'} القطاع بنجاح`);
    } catch (error) {
      console.error('Error toggling sector:', error);
      showError('حدث خطأ أثناء تحديث حالة القطاع');
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

  if (loading) {
    return (
      <div className="ds-card" style={{ padding: 24 }}>
        <p style={{ color: 'var(--text-muted)' }}>جاري تحميل القطاعات...</p>
      </div>
    );
  }

  return (
    <div className="ds-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Briefcase size={20} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>إدارة القطاعات</h2>
        </div>
        {!isAdding && (
          <button className="btn btn-primary btn-sm" style={{ gap: 6 }} onClick={() => setIsAdding(true)}>
            <Plus size={14} />
            إضافة قطاع
          </button>
        )}
      </div>

      {isAdding && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)', marginBottom: 16 }}>
          <div className="input-group">
            <label className="input-label">اسم القطاع بالعربية</label>
            <input className="input" value={newSector.name_ar} onChange={e => setNewSector({ ...newSector, name_ar: e.target.value })} placeholder="مثال: تقنية" />
          </div>
          <div className="input-group">
            <label className="input-label">اسم القطاع بالإنجليزية</label>
            <input className="input" value={newSector.name_en} onChange={e => setNewSector({ ...newSector, name_en: e.target.value })} placeholder="Example: Technology" dir="ltr" />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={isSaving} style={{ gap: 4 }}>
              {isSaving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
              حفظ
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setIsAdding(false); setNewSector({ name_ar: '', name_en: '' }); }} style={{ gap: 4 }}>
              <X size={14} />
              إلغاء
            </button>
          </div>
        </div>
      )}

      {sectors.length === 0 ? (
        <div className="dash-empty" style={{ height: 120 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>لا توجد قطاعات مضافة حالياً</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الاسم بالعربية</th>
                <th>الاسم بالإنجليزية</th>
                <th style={{ textAlign: 'center' }}>الحالة</th>
                <th style={{ textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map(sector => (
                <tr key={sector.id}>
                  <td>
                    {editingId === sector.id ? (
                      <input className="input" value={editSector.name_ar} onChange={e => setEditSector({ ...editSector, name_ar: e.target.value })} style={{ maxWidth: 200 }} />
                    ) : (
                      <span className="td-primary">{sector.name_ar}</span>
                    )}
                  </td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>
                    {editingId === sector.id ? (
                      <input className="input" value={editSector.name_en} onChange={e => setEditSector({ ...editSector, name_en: e.target.value })} dir="ltr" style={{ maxWidth: 200 }} />
                    ) : (
                      sector.name_en
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${sector.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {sector.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {editingId === sector.id ? (
                        <>
                          <button className="btn btn-sm" style={{ padding: '4px 8px', background: 'var(--success-bg)', color: 'var(--success-text)' }} onClick={() => handleEdit(sector.id)} disabled={isSaving}>
                            {isSaving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                          </button>
                          <button className="btn btn-sm" style={{ padding: '4px 8px' }} onClick={cancelEdit}>
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-sm" style={{ padding: '4px 8px', color: 'var(--accent)' }} onClick={() => startEdit(sector)} title="تعديل">
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-sm" style={{ padding: '4px 8px', color: 'var(--warning-text)' }} onClick={() => toggleActive(sector.id, sector.is_active)} title={sector.is_active ? 'إلغاء التفعيل' : 'تفعيل'}>
                            {sector.is_active ? <X size={14} /> : <Check size={14} />}
                          </button>
                          <button className="btn btn-sm" style={{ padding: '4px 8px', color: 'var(--danger)' }} onClick={() => handleDelete(sector.id)} title="حذف">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
