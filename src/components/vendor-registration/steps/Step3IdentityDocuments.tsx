import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { VendorFormData } from '../VendorRegistrationForm';
import { Upload, Check, User, CreditCard } from 'lucide-react';

interface Props {
  formData: VendorFormData;
  updateFormData: (data: Partial<VendorFormData>) => void;
}

export const Step3IdentityDocuments = ({ formData, updateFormData }: Props) => {
  const [idDragging, setIdDragging] = useState(false);
  const [profileDragging, setProfileDragging] = useState(false);
  const [idImagePreview, setIdImagePreview] = useState<string>(formData.id_image_url || '');
  const [profileImagePreview, setProfileImagePreview] = useState<string>(formData.profile_image_url || '');

  const idInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const handleIdDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIdDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      updateFormData({ id_image: file });
      const reader = new FileReader();
      reader.onload = () => setIdImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleProfileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setProfileDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      updateFormData({ profile_image: file });
      const reader = new FileReader();
      reader.onload = () => setProfileImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleIdFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateFormData({ id_image: file });
      const reader = new FileReader();
      reader.onload = () => setIdImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleProfileFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateFormData({ profile_image: file });
      const reader = new FileReader();
      reader.onload = () => setProfileImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--vr-text-primary)' }}>
          المستندات الثبوتية
        </h2>
        <p style={{ color: 'var(--vr-text-secondary)' }}>
          نحتاج إلى بعض المستندات للتحقق من هويتك
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="vr-input-group"
      >
        <label className="vr-input-label">رقم الهوية الوطنية <span className="req">*</span></label>
        <input
          type="text"
          value={formData.id_number}
          onChange={(e) => updateFormData({ id_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
          placeholder="1234567890"
          className="vr-input"
          dir="ltr"
          style={{ textAlign: 'left' }}
        />
        <div style={{ fontSize: '11px', color: 'var(--vr-text-muted)', marginTop: 4, textAlign: 'left', direction: 'ltr' }}>
          {formData.id_number.length}/10
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <label className="vr-input-label block mb-3">
          صورة الهوية الوطنية <span className="req">*</span>
        </label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => setIdDragging(true)}
          onDragLeave={() => setIdDragging(false)}
          onDrop={handleIdDrop}
          onClick={() => idInputRef.current?.click()}
          className={`vr-upload-zone ${idDragging ? 'dragover' : ''}`}
        >
          <input
            ref={idInputRef}
            type="file"
            accept="image/*"
            onChange={handleIdFileSelect}
            className="hidden"
          />

          {idImagePreview ? (
            <div className="relative">
              <img
                src={idImagePreview}
                alt="ID Preview"
                className="max-h-48 mx-auto"
                style={{ borderRadius: 'var(--vr-radius-md)' }}
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'var(--vr-success)' }}
              >
                <Check className="w-5 h-5 text-white" />
              </motion.div>
              <p className="mt-3 text-sm" style={{ color: 'var(--vr-text-muted)' }}>
                انقر لتغيير الصورة
              </p>
            </div>
          ) : (
            <>
              <CreditCard className="upload-icon w-12 h-12 mx-auto mb-4" />
              <p className="upload-text font-semibold mb-2">
                اسحب الصورة هنا أو انقر للاختيار
              </p>
              <p className="upload-hint">
                JPG, PNG أو JPEG (حد أقصى 5MB)
              </p>
            </>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label className="vr-input-label block mb-3">
          الصورة الشخصية <span className="req">*</span>
        </label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => setProfileDragging(true)}
          onDragLeave={() => setProfileDragging(false)}
          onDrop={handleProfileDrop}
          onClick={() => profileInputRef.current?.click()}
          className={`vr-upload-zone ${profileDragging ? 'dragover' : ''}`}
        >
          <input
            ref={profileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfileFileSelect}
            className="hidden"
          />

          {profileImagePreview ? (
            <div className="relative">
              <img
                src={profileImagePreview}
                alt="Profile Preview"
                className="w-32 h-32 mx-auto rounded-full object-cover"
                style={{ border: `4px solid var(--vr-accent)` }}
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-0 right-1/2 translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'var(--vr-success)' }}
              >
                <Check className="w-5 h-5 text-white" />
              </motion.div>
              <p className="mt-3 text-sm" style={{ color: 'var(--vr-text-muted)' }}>
                انقر لتغيير الصورة
              </p>
            </div>
          ) : (
            <>
              <User className="upload-icon w-12 h-12 mx-auto mb-4" />
              <p className="upload-text font-semibold mb-2">
                اسحب صورتك الشخصية هنا أو انقر للاختيار
              </p>
              <p className="upload-hint">
                JPG, PNG أو JPEG (حد أقصى 5MB)
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
