import { useState, useRef } from 'react';
import { VendorFormData } from '../VendorRegistrationForm';

interface Props {
  formData: VendorFormData;
  updateFormData: (data: Partial<VendorFormData>) => void;
}

export const Step3IdentityDocuments = ({ formData, updateFormData }: Props) => {
  const [idDragging, setIdDragging] = useState(false);
  const [profileDragging, setProfileDragging] = useState(false);
  const [passportDragging, setPassportDragging] = useState(false);
  const [idPreview, setIdPreview] = useState<{ url: string; name: string; size: string } | null>(
    formData.id_image_url ? { url: formData.id_image_url, name: 'صورة الهوية', size: '' } : null
  );
  const [profilePreview, setProfilePreview] = useState<{ url: string; name: string; size: string } | null>(
    formData.profile_image_url ? { url: formData.profile_image_url, name: 'الصورة الشخصية', size: '' } : null
  );
  const [passportPreview, setPassportPreview] = useState<{ url: string; name: string; size: string } | null>(
    formData.passport_image_url ? { url: formData.passport_image_url, name: 'صورة الجواز', size: '' } : null
  );

  const idInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const passportInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (
    file: File,
    type: 'id' | 'profile' | 'passport',
  ) => {
    if (!file.type.startsWith('image/')) return;
    const sizeStr = (file.size / 1024).toFixed(0) + ' KB';
    const reader = new FileReader();
    reader.onload = () => {
      const preview = { url: reader.result as string, name: file.name, size: sizeStr };
      if (type === 'id') {
        setIdPreview(preview);
        updateFormData({ id_image: file });
      } else if (type === 'profile') {
        setProfilePreview(preview);
        updateFormData({ profile_image: file });
      } else {
        setPassportPreview(preview);
        updateFormData({ passport_image: file });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent, type: 'id' | 'profile' | 'passport') => {
    e.preventDefault();
    if (type === 'id') setIdDragging(false);
    else if (type === 'profile') setProfileDragging(false);
    else setPassportDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file, type);
  };

  const removeUpload = (type: 'id' | 'profile' | 'passport') => {
    if (type === 'id') {
      setIdPreview(null);
      updateFormData({ id_image: null, id_image_url: '' });
    } else if (type === 'profile') {
      setProfilePreview(null);
      updateFormData({ profile_image: null, profile_image_url: '' });
    } else {
      setPassportPreview(null);
      updateFormData({ passport_image: null, passport_image_url: '' });
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
        </div>

        {/* Profile Image Upload */}
        <div className="input-group">
          <label className="input-label"><span className="req">*</span> الصورة الشخصية</label>
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
        </div>

        {/* Passport Upload */}
        <div className="input-group">
          <label className="input-label"><span className="opt">(اختياري)</span> صورة الجواز</label>
          <div
            className={`upload-zone ${passportDragging ? 'dragover' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setPassportDragging(true)}
            onDragLeave={() => setPassportDragging(false)}
            onDrop={(e) => handleDrop(e, 'passport')}
          >
            <span className="uz-emoji">🛂</span>
            <div className="uz-text">اسحب الملف هنا أو اضغط للتحميل</div>
            <div className="uz-hint">PNG, JPG — حد أقصى 5MB</div>
            <input
              ref={passportInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file, 'passport');
                e.target.value = '';
              }}
            />
          </div>
          {passportPreview && (
            <div className="upload-preview">
              <img src={passportPreview.url} alt="Passport" />
              <div className="up-info">
                <span className="up-name">{passportPreview.name}</span>
                <span className="up-size">{passportPreview.size}</span>
              </div>
              <button className="up-remove" onClick={() => removeUpload('passport')} type="button">✕</button>
            </div>
          )}
        </div>

        {/* Security info */}
        <div className="info-box blue">
          <span className="info-icon">🔒</span>
          <span>بياناتك في أمان — نستخدم تشفير متقدم لحماية جميع بياناتك ومستنداتك الشخصية</span>
        </div>
      </div>
    </>
  );
};
