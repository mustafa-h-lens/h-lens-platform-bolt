import { useState, useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { Modal } from '../../shared/Modal';

interface CreateInvoiceModalProps {
  project: {
    id: string;
    client: {
      id: string;
    };
    total_price: number;
    currency: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateInvoiceModal = ({ project, onClose, onSuccess }: CreateInvoiceModalProps) => {
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [formData, setFormData] = useState({
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'unpaid',
    total_amount: project.total_price.toString(),
    paid_amount: '0',
    notes: '',
  });

  useEffect(() => {
    generateInvoiceNumber();
  }, []);

  const generateInvoiceNumber = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_invoice_number');
      if (error) throw error;
      setInvoiceNumber(data);
    } catch (error) {
      console.error('Error generating invoice number:', error);
      const timestamp = Date.now();
      setInvoiceNumber(`INV-${timestamp}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile) return null;
    setUploadingFile(true);
    try {
      // Sanitize storage key — Supabase rejects non-ASCII, spaces, parens
      const lastDot = selectedFile.name.lastIndexOf('.');
      const ext = lastDot > -1 ? selectedFile.name.substring(lastDot) : '';
      const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
      const rand = Math.random().toString(36).substring(2, 10);
      const filePath = `invoices/${project.id}/${Date.now()}_${rand}${safeExt}`;
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let fileUrl = uploadedFileUrl || null;
      if (selectedFile && !uploadedFileUrl) {
        fileUrl = await uploadFile();
        if (fileUrl) setUploadedFileUrl(fileUrl);
      }

      const { error } = await supabase.from('invoices').insert({
        project_id: project.id,
        client_id: project.client.id,
        invoice_number: invoiceNumber,
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        status: formData.status,
        total_amount: parseFloat(formData.total_amount),
        paid_amount: parseFloat(formData.paid_amount),
        currency: project.currency,
        notes: formData.notes || null,
        file_url: fileUrl,
        created_by: user!.id,
      });

      if (error) throw error;
      onSuccess();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      showError(`حدث خطأ أثناء إنشاء الفاتورة: ${error?.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="إصدار فاتورة جديدة" maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">رقم الفاتورة</label>
            <input
              type="text"
              value={invoiceNumber}
              readOnly
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">تاريخ الإصدار</label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">تاريخ الاستحقاق</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">المبلغ الإجمالي</label>
            <input
              type="number"
              step="0.01"
              value={formData.total_amount}
              onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-sm text-slate-600 mt-1">القيمة الافتراضية من سعر المشروع، يمكن التعديل</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">المبلغ المدفوع</label>
              <input
                type="number"
                step="0.01"
                value={formData.paid_amount}
                onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">الحالة</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="unpaid">غير مدفوعة</option>
                <option value="partial">مدفوعة جزئياً</option>
                <option value="paid">مدفوعة</option>
                <option value="cancelled">ملغاة</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ملف الفاتورة</label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <Upload className="w-5 h-5" />
              {uploadingFile ? 'جاري الرفع...' : selectedFile ? selectedFile.name : 'اضغط لاختيار ملف الفاتورة'}
            </button>
            {selectedFile && (
              <p className="text-xs text-green-600 mt-1">
                تم اختيار: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ملاحظات</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="أي ملاحظات إضافية..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري الإنشاء...' : 'إصدار الفاتورة'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 border border-slate-300 text-slate-700 hover:bg-slate-50 py-2 rounded-lg transition-colors"
            >
              إلغاء
            </button>
        </div>
      </form>
    </Modal>
  );
};
