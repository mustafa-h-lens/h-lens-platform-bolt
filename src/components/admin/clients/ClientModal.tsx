import { useState, useEffect, useRef } from 'react';
import { Upload, User } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import type { Client } from '../../../types/database';
import { Modal } from '../../shared/Modal';
import { toEnglishNumbers } from '../../../lib/numberUtils';

interface ClientModalProps {
  client: Client | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClientModal = ({ client, onClose, onSuccess }: ClientModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showCropModal, setShowCropModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    client_image: '',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        code: client.code || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        notes: client.notes || '',
        client_image: (client as any).client_image || '',
      });
      if ((client as any).client_image) {
        setImagePreview((client as any).client_image);
      }
    }
  }, [client]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      alert('يرجى اختيار صورة بصيغة JPG أو PNG فقط');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('حجم الصورة يجب أن يكون أقل من 3 ميجابايت');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const cropImage = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;

        canvas.width = 400;
        canvas.height = 400;

        ctx.drawImage(img, x, y, size, size, 0, 0, 400, 400);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = imageUrl;
    });
  };

  const handleCropConfirm = async () => {
    if (!imagePreview || !imageFile) return;

    setUploadingImage(true);
    try {
      const croppedImageDataUrl = await cropImage(imagePreview);

      const blob = await (await fetch(croppedImageDataUrl)).blob();
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `client-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('vendor-images')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vendor-images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, client_image: publicUrl });
      setImagePreview(publicUrl);
      setShowCropModal(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      if (client) {
        const { error } = await supabase
          .from('clients')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', client.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert({
            ...formData,
            created_by: user.id,
          });

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('حدث خطأ أثناء حفظ بيانات العميل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={client ? 'تعديل عميل' : 'إضافة عميل جديد'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              صورة العميل
            </label>
            <div className="relative">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-[120px] h-[120px] rounded-[20px] cursor-pointer group
                  backdrop-blur-lg bg-gradient-to-br from-[#0A2A66]/20 to-[#1B4FA9]/10
                  border-2 border-[#0A2A66]/20 hover:border-[#0A2A66]/40
                  transition-all duration-300 overflow-hidden
                  flex items-center justify-center relative"
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                      transition-opacity flex items-center justify-center">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                  </>
                ) : (
                  <User className="w-12 h-12 text-white/80" strokeWidth={1.5} />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
              JPG أو PNG - حجم أقصى 3MB
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              اسم العميل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66]/50"
              placeholder="أدخل اسم العميل"
              dir="rtl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              رقم الهاتف
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: toEnglishNumbers(e.target.value) })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66]/50"
              placeholder="+966xxxxxxxxx"
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66]/50"
              placeholder="example@domain.com"
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              العنوان
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66]/50"
              placeholder="الرياض، المملكة العربية السعودية"
              dir="rtl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              ملاحظات
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66]/50 resize-none"
              placeholder="أضف ملاحظات إضافية..."
              dir="rtl"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9]
                hover:shadow-lg text-white rounded-lg
                transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'جاري الحفظ...' : client ? 'تحديث' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-dark-border
                text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800
                rounded-lg transition-colors font-medium"
            >
              إلغاء
            </button>
          </div>
      </form>

      {showCropModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
              معاينة الصورة
            </h3>
            <div className="flex flex-col items-center">
              <div className="w-[200px] h-[200px] rounded-[20px] overflow-hidden border-2 border-[#0A2A66]/20 mb-4">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Crop preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center">
                سيتم قص الصورة بشكل مربع تلقائياً
              </p>
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={handleCropConfirm}
                  disabled={uploadingImage}
                  className="flex-1 px-4 py-2 bg-gradient-to-l from-[#0A2A66] to-[#1B4FA9]
                    hover:shadow-lg text-white rounded-lg transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {uploadingImage ? 'جاري الرفع...' : 'تأكيد'}
                </button>
                <button
                  onClick={() => {
                    setShowCropModal(false);
                    setImagePreview(formData.client_image || '');
                  }}
                  disabled={uploadingImage}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-dark-border
                    text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800
                    rounded-lg transition-colors font-medium"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
