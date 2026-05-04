import { useState, useRef, useEffect } from 'react';
import { VendorFormData } from '../VendorRegistrationForm';
import DocumentCropper from '../../shared/DocumentCropper';
import { autoCropDocument } from '../../../utils/autoCropDocument';

const ID_ASPECT_RATIO = 1.586;

interface Props {
  formData: VendorFormData;
  updateFormData: (data: Partial<VendorFormData>) => void;
  errors?: Record<string, string>;
}

const FieldError = ({ msg }: { msg?: string }) => msg ? (
  <div className="field-error">✕ {msg}</div>
) : null;

export const Step3IdentityDocuments = ({ formData, updateFormData, errors = {} }: Props) => {
  const [idDragging, setIdDragging] = useState(false);
  const [profileDragging, setProfileDragging] = useState(false);
  const [idPreview, setIdPreview] = useState<{ url: string; name: string; size: string } | null>(null);
  const [profilePreview, setProfilePreview] = useState<{ url: string; name: string; size: string } | null>(null);
  const [pendingIdFile, setPendingIdFile] = useState<File | null>(null);
  const [autoCropping, setAutoCropping] = useState(false);

  // Restore previews from File objects or URLs when component mounts
  useEffect(() => {
    if (formData.id_image) {
      const sizeStr = (formData.id_image.size / 1024).toFixed(0) + ' KB';
      const url = URL.createObjectURL(formData.id_image);
      setIdPreview({ url, name: formData.id_image.name, size: sizeStr });
      return () => URL.revokeObjectURL(url);
    } else if (formData.id_image_url) {
      setIdPreview({ url: formData.id_image_url, name: 'صورة الهوية', size: '' });
    }
  }, []);

  useEffect(() => {
    if (formData.profile_image) {
      const sizeStr = (formData.profile_image.size / 1024).toFixed(0) + ' KB';
      const url = URL.createObjectURL(formData.profile_image);
      setProfilePreview({ url, name: formData.profile_image.name, size: sizeStr });
      return () => URL.revokeObjectURL(url);
    } else if (formData.profile_image_url) {
      setProfilePreview({ url: formData.profile_image_url, name: 'الصورة الشخصية', size: '' });
    }
  }, []);

  const idInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File, type: 'id' | 'profile') => {
    if (!file.type.startsWith('image/')) return;
    if (type === 'id') {
      setAutoCropping(true);
      try {
        const cropped = await autoCropDocument(file, { aspectWidth: 1.586, aspectHeight: 1 });
        if (cropped) {
          commitIdFile(cropped);
          return;
        }
      } finally {
        setAutoCropping(false);
      }
      setPendingIdFile(file);
      return;
    }
    const sizeStr = (file.size / 1024).toFixed(0) + ' KB';
    const reader = new FileReader();
    reader.onload = () => {
      const preview = { url: reader.result as string, name: file.name, size: sizeStr };
      setProfilePreview(preview);
      updateFormData({ profile_image: file });
    };
    reader.readAsDataURL(file);
  };

  const commitIdFile = (file: File) => {
    const sizeStr = (file.size / 1024).toFixed(0) + ' KB';
    const reader = new FileReader();
    reader.onload = () => {
      setIdPreview({ url: reader.result as string, name: file.name, size: sizeStr });
      updateFormData({ id_image: file });
      setPendingIdFile(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent, type: 'id' | 'profile') => {
    e.preventDefault();
    if (type === 'id') setIdDragging(false);
    else setProfileDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file, type);
  };

  const removeUpload = (type: 'id' | 'profile') => {
    if (type === 'id') {
      setIdPreview(null);
      updateFormData({ id_image: null, id_image_url: '' });
    } else {
      setProfilePreview(null);
      updateFormData({ profile_image: null, profile_image_url: '' });
    }
  };

  return (
    <>
      <h2 className="step-title">🪪 المستندات</h2>
      <p className="step-subtitle">المستندات المطلوبة للتحقق من هويتك</p>
      <div className="form-section">
        {/* ID Number */}
        <div className="input-group">
          <label className="input-label"><span className="req">*</span> رقم الهوية الوطنية / الإقامة</label>
          <input
            className="input"
            type="text"
            value={formData.id_number}
            onChange={(e) => updateFormData({ id_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="1XXXXXXXXX"
            dir="ltr"
            style={{ fontFamily: 'var(--font-mono)' }}
            maxLength={10}
          />
          <FieldError msg={errors.id_number} />
        </div>

        {/* ID Image Upload */}
        <div className="input-group">
          <label className="input-label"><span className="req">*</span> صورة الهوية</label>
          <div
            className={`upload-zone ${idDragging ? 'dragover' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setIdDragging(true)}
            onDragLeave={() => setIdDragging(false)}
            onDrop={(e) => handleDrop(e, 'id')}
          >
            <span className="uz-emoji">🪪</span>
            <div className="uz-text">اسحب الملف هنا أو اضغط للتحميل</div>
            <div className="uz-hint">PNG, JPG — حد أقصى 5MB</div>
            <input
              ref={idInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file, 'id');
                e.target.value = '';
              }}
            />
          </div>
          {idPreview && (
            <div className="upload-preview">
              <img src={idPreview.url} alt="ID" />
              <div className="up-info">
                <span className="up-name">{idPreview.name}</span>
                <span className="up-size">{idPreview.size}</span>
              </div>
              <button className="up-remove" onClick={() => removeUpload('id')} type="button">✕</button>
            </div>
          )}
          <FieldError msg={errors.id_image} />
        </div>

        {/* Profile Image Upload */}
        <div className="input-group">
          <label className="input-label"><span className="req">*</span> الصورة الشخصية</label>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>📸</span> ملاحظة: الصورة تكون بخلفية بيضاء
          </div>
          <div
            className={`upload-zone ${profileDragging ? 'dragover' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setProfileDragging(true)}
            onDragLeave={() => setProfileDragging(false)}
            onDrop={(e) => handleDrop(e, 'profile')}
          >
            <span className="uz-emoji">🤳</span>
            <div className="uz-text">اسحب الملف هنا أو اضغط للتحميل</div>
            <div className="uz-hint">PNG, JPG — حد أقصى 5MB</div>
            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file, 'profile');
                e.target.value = '';
              }}
            />
          </div>
          {profilePreview && (
            <div className="upload-preview">
              <img src={profilePreview.url} alt="Profile" />
              <div className="up-info">
                <span className="up-name">{profilePreview.name}</span>
                <span className="up-size">{profilePreview.size}</span>
              </div>
              <button className="up-remove" onClick={() => removeUpload('profile')} type="button">✕</button>
            </div>
          )}
          <FieldError msg={errors.profile_image} />
        </div>

        {/* Security info */}
        <div className="info-box blue">
          <span className="info-icon">🔒</span>
          <span>بياناتك في أمان — نستخدم تشفير متقدم لحماية جميع بياناتك ومستنداتك الشخصية</span>
        </div>
      </div>

      <DocumentCropper
        open={!!pendingIdFile}
        file={pendingIdFile}
        aspect={ID_ASPECT_RATIO}
        docLabel="صورة الهوية"
        onSave={commitIdFile}
        onSkip={commitIdFile}
        onCancel={() => setPendingIdFile(null)}
      />

      {autoCropping && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#e2e8f0', fontFamily: 'Tajawal, sans-serif', fontSize: 14, gap: 10,
        }}>
          <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
          جاري الاقتطاع التلقائي…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </>
  );
};
