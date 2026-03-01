import { useState, useEffect, useRef } from 'react';
import { Plus, FileText, Download, Trash2, Upload } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { Modal } from '../../shared/Modal';
import { useNotification } from '../../../contexts/NotificationContext';
import { ConfirmationModal } from '../../shared/ConfirmationModal';

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
    const colors: Record<string, string> = {
      contract: 'bg-blue-100 text-blue-800',
      nda: 'bg-purple-100 text-purple-800',
      certificate: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[type] || colors.other}`}>
        {getDocumentTypeLabel(type)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">المستندات</h2>
          <p className="text-sm text-slate-600 mt-1">إدارة ملفات ومستندات المورد</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          رفع مستند
        </button>
      </div>

      {documents.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">اسم الملف</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">النوع</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">تم الرفع بواسطة</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">تاريخ الرفع</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <span className="font-medium text-slate-900">{doc.file_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getDocumentTypeBadge(doc.document_type)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-700">
                        {doc.uploader?.full_name || 'غير معروف'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-700" dir="ltr">
                        {new Date(doc.created_at).toLocaleDateString('ar-SA')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => window.open(doc.file_url, '_blank')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="تحميل"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteDocId(doc.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-lg p-12 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">لم يتم رفع أي مستندات بعد</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
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

      // Upload file to storage
      const filePath = `vendors/${vendorId}/documents/${Date.now()}_${selectedFile.name}`;
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
      alert(error.message || 'حدث خطأ أثناء رفع المستند');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="رفع مستند جديد">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            نوع المستند <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.document_type}
            onChange={(e) => setFormData({ ...formData, document_type: e.target.value as any })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            dir="rtl"
            required
          >
            <option value="contract">عقد</option>
            <option value="nda">اتفاقية سرية (NDA)</option>
            <option value="certificate">شهادة</option>
            <option value="other">أخرى</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            اسم المستند
          </label>
          <input
            type="text"
            value={formData.file_name}
            onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            dir="rtl"
            placeholder="سيتم استخدام اسم الملف إذا ترك فارغاً"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            اختيار الملف <span className="text-red-500">*</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Upload className="w-5 h-5" />
            {selectedFile ? selectedFile.name : 'اضغط لاختيار ملف'}
          </button>
          {selectedFile && (
            <p className="text-xs text-green-600 mt-1">
              تم اختيار: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'جاري الرفع...' : 'رفع المستند'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
