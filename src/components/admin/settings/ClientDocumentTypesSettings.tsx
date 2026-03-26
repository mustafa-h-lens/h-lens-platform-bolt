import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FileText, X, GripVertical } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';

interface DocumentType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export const ClientDocumentTypesSettings = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_document_types')
        .select('*')
        .order('display_order')
        .order('name');

      if (error) throw error;
      setTypes(data || []);
    } catch (error) {
      console.error('Error loading document types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type?: DocumentType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        description: type.description || '',
        is_active: type.is_active,
      });
    } else {
      setEditingType(null);
      setFormData({ name: '', description: '', is_active: true });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData({ name: '', description: '', is_active: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('يرجى إدخال اسم نوع المستند');
      return;
    }

    try {
      const typeData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
        created_by: user?.id,
      };

      if (editingType) {
        const { error } = await supabase
          .from('client_document_types')
          .update(typeData)
          .eq('id', editingType.id);
        if (error) throw error;
        showSuccess('تم تحديث نوع المستند بنجاح');
      } else {
        const maxOrder = types.length > 0 ? Math.max(...types.map(t => t.display_order)) + 1 : 0;
        const { error } = await supabase
          .from('client_document_types')
          .insert({ ...typeData, display_order: maxOrder });
        if (error) throw error;
        showSuccess('تم إضافة نوع المستند بنجاح');
      }

      loadTypes();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving document type:', error);
      if (error.code === '23505') {
        showError('هذا النوع موجود بالفعل');
      } else {
        showError('حدث خطأ أثناء حفظ نوع المستند');
      }
    }
  };

  const handleToggleActive = async (type: DocumentType) => {
    try {
      const { error } = await supabase
        .from('client_document_types')
        .update({ is_active: !type.is_active })
        .eq('id', type.id);
      if (error) throw error;
      loadTypes();
    } catch (error) {
      showError('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const handleDelete = async (typeId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا النوع؟\nملاحظة: لن يتم حذف المستندات المرتبطة بهذا النوع')) return;
    try {
      const { error } = await supabase
        .from('client_document_types')
        .delete()
        .eq('id', typeId);
      if (error) throw error;
      showSuccess('تم حذف نوع المستند');
      loadTypes();
    } catch (error) {
      console.error('Error deleting document type:', error);
      showError('حدث خطأ أثناء حذف نوع المستند');
    }
  };

  if (loading) {
    return <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            <div className="p-3 rounded-xl border"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}>
              <FileText className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
            </div>
            أنواع مستندات العملاء
          </h1>
          <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            إدارة أنواع المستندات المطلوبة من العملاء (السجل التجاري، الشهادة الضريبية، إلخ)
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg transition-all font-medium"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Plus className="w-4 h-4" />
          إضافة نوع
        </button>
      </div>

      {/* Types Table */}
      {types.length === 0 ? (
        <div className="text-center py-16 rounded-lg border"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3, color: 'var(--color-text-muted)' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>لا توجد أنواع مستندات</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-table-header)', borderBottom: '1px solid var(--color-table-border)' }}>
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)', width: 40 }}>#</th>
                <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>اسم النوع</th>
                <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الوصف</th>
                <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {types.map((type, idx) => (
                <tr key={type.id} style={{ borderBottom: '1px solid var(--color-table-border)' }}>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>
                    <GripVertical size={14} style={{ opacity: 0.4 }} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)', opacity: type.is_active ? 1 : 0.5 }}>
                      {type.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {type.description || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(type)}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer"
                      style={{
                        backgroundColor: type.is_active ? 'color-mix(in srgb, var(--color-success) 15%, transparent)' : 'color-mix(in srgb, var(--color-text-muted) 10%, transparent)',
                        color: type.is_active ? 'var(--color-success)' : 'var(--color-text-muted)',
                        border: 'none',
                      }}
                    >
                      {type.is_active ? 'نشط' : 'معطل'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={() => handleOpenModal(type)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--color-primary)' }}
                        title="تعديل"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(type.id)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--color-danger)' }}
                        title="حذف"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-2xl max-w-lg w-full" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="border-b p-6 flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {editingType ? 'تعديل نوع المستند' : 'إضافة نوع مستند جديد'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  اسم النوع <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  placeholder="مثال: السجل التجاري"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  الوصف
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 resize-none"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  placeholder="وصف مختصر لهذا النوع..."
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="doc_type_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded"
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <label htmlFor="doc_type_active" className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  نوع نشط (يظهر عند رفع المستندات)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 text-white rounded-lg transition-all font-medium"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {editingType ? 'حفظ التعديلات' : 'إضافة النوع'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 rounded-lg transition-colors font-medium border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
