import { useState, useEffect, useRef } from 'react';
import { Plus, FileText, Download, Trash2, Upload } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { Modal } from '../../../shared/Modal';
import { useNotification } from '../../../../contexts/NotificationContext';
import { ConfirmationModal } from '../../../shared/ConfirmationModal';
import { toEnglishNumbers } from '../../../../lib/numberUtils';

interface Document {
  id: string;
  vendor_id: string;
  document_type: 'contract' | 'nda' | 'certificate' | 'other';
  file_url: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
  uploader?: {
    full_name: string;
  };
}

interface VendorDocumentsProps {
  vendorId: string;
}

export const VendorDocuments = ({ vendorId }: VendorDocumentsProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchDocuments();
  }, [vendorId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_documents')
        .select(`
          *,
          uploader:users!uploaded_by(full_name)
        `)
        .eq('vendor_id', vendorId)
        .not('document_type', 'in', '("passport","visa_usa","visa_uk","visa_schengen","visa_japan")')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      // Find doc to delete from storage too
      const doc = documents.find(d => d.id === documentId);
      if (doc?.file_url) {
        const bucketName = 'vendor-images';
        const urlParts = doc.file_url.split(`/storage/v1/object/public/${bucketName}/`);
        if (urlParts.length === 2) {
          const storagePath = decodeURIComponent(urlParts[1]);
          await supabase.storage.from(bucketName).remove([storagePath]);
        }
      }

      const { error } = await supabase
        .from('vendor_documents')
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

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'contract':
        return 'عقد';
      case 'nda':
        return 'اتفاقية سرية';
      case 'certificate':
        return 'شهادة';
      case 'other':
        return 'أخرى';
      default:
        return type;
    }
  };

  const getDocumentTypeBadge = (type: string) => {
    const badgeClass: Record<string, string> = {
      contract: 'badge badge-blue',
      nda: 'badge badge-purple',
      certificate: 'badge badge-green',
      other: 'badge badge-gray',
    };

    return (
      <span className={badgeClass[type] || badgeClass.other}>
        {getDocumentTypeLabel(type)}
      </span>
    );
  };

  if (loading) {
    return <div className="dash-empty" style={{ height: 256 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>المستندات</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>إدارة ملفات ومستندات المورد</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)} style={{ gap: 6 }}>
          <Plus size={13} />
          رفع مستند
        </button>
      </div>

      {documents.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>اسم الملف</th>
                <th>النوع</th>
                <th>تم الرفع بواسطة</th>
                <th>تاريخ الرفع</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span className="td-primary">{doc.file_name}</span>
                    </div>
                  </td>
                  <td>
                    {getDocumentTypeBadge(doc.document_type)}
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {doc.uploader?.full_name || 'غير معروف'}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }} dir="ltr">
                      {toEnglishNumbers(new Date(doc.created_at).toLocaleDateString('ar-SA'))}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => window.open(doc.file_url, '_blank')}
                        title="تحميل"
                        style={{ color: 'var(--accent-lighter)', padding: 6 }}
                      >
                        <Download size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setDeleteDocId(doc.id)}
                        title="حذف"
                        style={{ color: 'var(--danger-text)', padding: 6 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 48 }}>
          <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>لم يتم رفع أي مستندات بعد</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)} style={{ gap: 6 }}>
            <Plus size={13} />
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
        <AddDocumentModal
          vendorId={vendorId}
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

interface AddDocumentModalProps {
  vendorId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AddDocumentModal = ({ vendorId, onClose, onSuccess }: AddDocumentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showError } = useNotification();
  const [formData, setFormData] = useState({
    document_type: 'contract' as 'contract' | 'nda' | 'certificate' | 'other',
    file_name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Upload file to storage — sanitize name (Supabase rejects non-ASCII, spaces, parens)
      const lastDot = selectedFile.name.lastIndexOf('.');
      const ext = lastDot > -1 ? selectedFile.name.substring(lastDot) : '';
      const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
      const filePath = `vendors/${vendorId}/documents/${Date.now()}_${Math.random().toString(36).substring(2, 10)}${safeExt}`;
      const { error: uploadError } = await supabase.storage
        .from('vendor-images')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('vendor-images')
        .getPublicUrl(filePath);

      // Save record
      const { error } = await supabase
        .from('vendor_documents')
        .insert([
          {
            vendor_id: vendorId,
            document_type: formData.document_type,
            file_name: formData.file_name || selectedFile.name,
            file_url: urlData.publicUrl,
            uploaded_by: user?.id,
          },
        ]);

      if (error) throw error;
      onSuccess();
    } catch (error: any) {
      console.error('Error adding document:', error);
      showError(error.message || 'حدث خطأ أثناء رفع المستند');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="رفع مستند جديد">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="input-group">
          <label className="input-label">نوع المستند <span className="req">*</span></label>
          <select
            className="input"
            value={formData.document_type}
            onChange={(e) => setFormData({ ...formData, document_type: e.target.value as any })}
            dir="rtl"
            required
          >
            <option value="contract">عقد</option>
            <option value="nda">اتفاقية سرية (NDA)</option>
            <option value="certificate">شهادة</option>
            <option value="other">أخرى</option>
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">اسم المستند</label>
          <input
            type="text"
            className="input"
            value={formData.file_name}
            onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
            dir="rtl"
            placeholder="سيتم استخدام اسم الملف إذا ترك فارغاً"
          />
        </div>

        <div className="input-group">
          <label className="input-label">اختيار الملف <span className="req">*</span></label>
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
                  setFormData({ ...formData, file_name: file.name });
                }
              }
            }}
          />
          <div
            className="upload-area"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} />
            <strong>{selectedFile ? selectedFile.name : 'اضغط لاختيار ملف'}</strong>
          </div>
          {selectedFile && (
            <span style={{ fontSize: 12, color: 'var(--success-text)', marginTop: 8 }}>
              تم اختيار: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, paddingTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            إلغاء
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !selectedFile}
            style={{ flex: 1 }}
          >
            {loading ? 'جاري الرفع...' : 'رفع المستند'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
