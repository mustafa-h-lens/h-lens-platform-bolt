import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { Modal } from '../../shared/Modal';
import { DatePicker } from '../../ui/DatePicker';
import { FileUploader } from '../../ui/FileUploader';

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

  const handleFileSelect = (file: File) => {
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
            <DatePicker
              label="تاريخ الإصدار"
              required
              value={formData.issue_date}
              onChange={(date) => setFormData({ ...formData, issue_date: date })}
            />
            <DatePicker
              label="تاريخ الاستحقاق"
              required
              value={formData.due_date}
              onChange={(date) => setFormData({ ...formData, due_date: date })}
            />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <FileUploader
            label="ملف الفاتورة"
            hint={selectedFile ? `تم اختيار: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : undefined}
            value={selectedFile ? selectedFile.name : uploadedFileUrl}
            onChange={(url) => { if (!url) { setSelectedFile(null); setUploadedFileUrl(''); } }}
            onFile={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
            preview="file"
            uploading={uploadingFile}
          />

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
