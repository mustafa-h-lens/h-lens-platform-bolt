import { useState, useEffect, useRef } from 'react';
import { Plus, FileText, Download, Trash2, Upload, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { Modal } from '../../../shared/Modal';
import { useNotification } from '../../../../contexts/NotificationContext';
import { ConfirmationModal } from '../../../shared/ConfirmationModal';
import { toEnglishNumbers } from '../../../../lib/numberUtils';

interface DocType {
  id: string;
  name: string;
}

interface ClientDocument {
  id: string;
  client_id: string;
  document_type: string;
  document_type_id: string | null;
  file_name: string;
  file_url: string;
  expiry_date: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  uploader?: {
    full_name: string;
  } | null;
  client_document_types?: {
    name: string;
  } | null;
}

interface ClientDocumentsProps {
  clientId: string;
}

export const ClientDocuments = ({ clientId }: ClientDocumentsProps) => {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchDocuments();
    fetchDocTypes();
  }, [clientId]);

  const fetchDocTypes = async () => {
    try {
      const { data } = await supabase
        .from('client_document_types')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order');
      setDocTypes(data || []);
    } catch {}
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select(`
          *,
          uploader:users!uploaded_by(full_name),
          client_document_types(name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching client documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      const doc = documents.find(d => d.id === documentId);
      if (doc?.file_url) {
        const bucketName = 'client-documents';
        const urlParts = doc.file_url.split(`/storage/v1/object/public/${bucketName}/`);
        if (urlParts.length === 2) {
          const storagePath = decodeURIComponent(urlParts[1]);
          await supabase.storage.from(bucketName).remove([storagePath]);
        }
      }

      const { error } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      showSuccess('تم حذف المستند بنجاح');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      showError('حدث خطأ أثناء حذف المستند');
    } finally {
      setDeleteDocId(null);
    }
  };

  const getTypeLabel = (doc: ClientDocument) => {
    // Prefer joined type name, fallback to legacy document_type text
    return doc.client_document_types?.name || doc.document_type || '-';
  };

  const isExpiringSoon = (expiryDate: string | null): boolean => {
    if (!expiryDate) return false;
    const diff = new Date(expiryDate).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 30;
  };

  const isExpired = (expiryDate: string | null): boolean => {
    if (!expiryDate) return false;
    return new Date(expiryDate).getTime() < Date.now();
  };

  // Summary counts
  const expiredCount = documents.filter(d => isExpired(d.expiry_date)).length;
  const expiringSoonCount = documents.filter(d => isExpiringSoon(d.expiry_date)).length;

  if (loading) {
    return <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>جاري التحميل...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>مستندات العميل</h2>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            السجل التجاري، شهادة الضريبة، العقود، والمستندات الرسمية
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff' }}
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={16} />
          رفع مستند
        </button>
      </div>

      {/* Expiry alerts */}
      {(expiredCount > 0 || expiringSoonCount > 0) && (
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-warning) 8%, transparent)',
            borderColor: 'var(--color-warning)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
            <div>
              {expiredCount > 0 && (
                <span style={{ fontSize: 13, color: 'var(--color-danger)', fontWeight: 600 }}>
                  {expiredCount} مستند منتهي الصلاحية
                </span>
              )}
              {expiredCount > 0 && expiringSoonCount > 0 && <span style={{ color: 'var(--color-text-secondary)' }}> · </span>}
              {expiringSoonCount > 0 && (
                <span style={{ fontSize: 13, color: 'var(--color-warning)', fontWeight: 600 }}>
                  {expiringSoonCount} مستند يقترب انتهاء صلاحيته
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {documents.length > 0 ? (
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <table className="w-full">
            <thead
              style={{
                backgroundColor: 'var(--color-table-header)',
                borderBottom: '1px solid var(--color-table-border)',
              }}
            >
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>اسم الملف</th>
                <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>النوع</th>
                <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>تاريخ الانتهاء</th>
                <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>تم الرفع بواسطة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>تاريخ الرفع</th>
                <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const expired = isExpired(doc.expiry_date);
                const expiring = isExpiringSoon(doc.expiry_date);
                return (
                  <tr key={doc.id} style={{ borderBottom: '1px solid var(--color-table-border)' }}>
                    <td className="px-4 py-3">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <div>
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{doc.file_name}</span>
                          {doc.notes && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{doc.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-blue">
                        {getTypeLabel(doc)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {doc.expiry_date ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {(expired || expiring) && (
                            <AlertTriangle size={13} style={{ color: expired ? 'var(--color-danger)' : 'var(--color-warning)' }} />
                          )}
                          <span
                            style={{
                              fontSize: 13,
                              color: expired ? 'var(--color-danger)' : expiring ? 'var(--color-warning)' : 'var(--color-text-secondary)',
                              fontWeight: expired || expiring ? 600 : 400,
                            }}
                            dir="ltr"
                          >
                            {toEnglishNumbers(new Date(doc.expiry_date).toLocaleDateString('ar-SA'))}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>-</span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                      {doc.uploader?.full_name || 'غير معروف'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)', fontSize: 13 }} dir="ltr">
                      {toEnglishNumbers(new Date(doc.created_at).toLocaleDateString('ar-SA'))}
                    </td>
                    <td className="px-4 py-3">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          className="p-1.5 rounded-lg transition-colors"
                          onClick={() => window.open(doc.file_url, '_blank')}
                          title="تحميل"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          <Download size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg transition-colors"
                          onClick={() => setDeleteDocId(doc.id)}
                          title="حذف"
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p className="text-lg mb-2">لم يتم رفع أي مستندات بعد</p>
          <p className="text-sm mb-4">قم برفع السجل التجاري والشهادة الضريبية والمستندات الأخرى</p>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all mx-auto"
            style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff' }}
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} />
            رفع أول مستند
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteDocId}
        title="حذف المستند"
        message="هل أنت متأكد من حذف هذا المستند؟ هذا الإجراء لا يمكن التراجع عنه."
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
        onConfirm={() => deleteDocId && handleDelete(deleteDocId)}
        onCancel={() => setDeleteDocId(null)}
      />

      {showAddModal && (
        <AddClientDocumentModal
          clientId={clientId}
          docTypes={docTypes}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchDocuments();
          }}
        />
      )}
    </div>
  );
};

// ─── Add Document Modal ────────────────────────────────────────
interface AddClientDocumentModalProps {
  clientId: string;
  docTypes: DocType[];
  onClose: () => void;
  onSuccess: () => void;
}

const AddClientDocumentModal = ({ clientId, docTypes, onClose, onSuccess }: AddClientDocumentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showError, showSuccess } = useNotification();
  const [formData, setFormData] = useState({
    document_type_id: docTypes[0]?.id || '',
    file_name: '',
    expiry_date: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showError('يرجى اختيار ملف');
      return;
    }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Upload file
      const filePath = `clients/${clientId}/documents/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('client-documents')
        .getPublicUrl(filePath);

      // Save record
      const selectedType = docTypes.find(t => t.id === formData.document_type_id);
      const { error } = await supabase
        .from('client_documents')
        .insert({
          client_id: clientId,
          document_type: selectedType?.name || 'أخرى',
          document_type_id: formData.document_type_id || null,
          file_name: formData.file_name || selectedFile.name,
          file_url: urlData.publicUrl,
          expiry_date: formData.expiry_date || null,
          notes: formData.notes || null,
          uploaded_by: user?.id,
        });

      if (error) throw error;
      showSuccess('تم رفع المستند بنجاح');
      onSuccess();
    } catch (error: any) {
      console.error('Error adding client document:', error);
      showError(error.message || 'حدث خطأ أثناء رفع المستند');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="رفع مستند جديد">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Document type */}
        <div className="input-group">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            نوع المستند <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <select
            className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            value={formData.document_type_id}
            onChange={(e) => setFormData({ ...formData, document_type_id: e.target.value })}
            required
          >
            <option value="" disabled>اختر نوع المستند</option>
            {docTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* File name */}
        <div className="input-group">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            اسم المستند
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            value={formData.file_name}
            onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
            placeholder="سيتم استخدام اسم الملف إذا ترك فارغاً"
          />
        </div>

        {/* Expiry date */}
        <div className="input-group">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
            تاريخ انتهاء الصلاحية
          </label>
          <input
            type="date"
            className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            value={formData.expiry_date}
            onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
          />
        </div>

        {/* Notes */}
        <div className="input-group">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            ملاحظات
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="ملاحظات إضافية..."
          />
        </div>

        {/* File upload */}
        <div className="input-group">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            اختيار الملف <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedFile(file);
                if (!formData.file_name) {
                  setFormData(prev => ({ ...prev, file_name: file.name }));
                }
              }
            }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '24px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: selectedFile ? 'color-mix(in srgb, var(--color-success) 5%, transparent)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <Upload size={24} style={{ margin: '0 auto 8px', color: 'var(--color-text-muted)' }} />
            <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>
              {selectedFile ? selectedFile.name : 'اضغط لاختيار ملف'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
              PDF, Word, Excel, أو صور (حد أقصى 50 ميجا)
            </p>
          </div>
          {selectedFile && (
            <span style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 8, display: 'block' }}>
              تم اختيار: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              flex: 1,
              opacity: loading || !selectedFile ? 0.5 : 1,
              cursor: loading || !selectedFile ? 'not-allowed' : 'pointer',
            }}
            disabled={loading || !selectedFile}
          >
            {loading ? 'جاري الرفع...' : 'رفع المستند'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg font-medium border transition-all"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
};
