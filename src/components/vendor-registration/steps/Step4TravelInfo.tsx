import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { VendorFormData } from '../VendorRegistrationForm';
import { pdfFirstPageToImage } from '../../../utils/pdfFirstPageToImage';

// Lazy so the cropper code is fetched only when the user actually picks
// a passport file.
const DocumentCropper = lazy(() => import('../../shared/DocumentCropper'));

const PASSPORT_ASPECT_RATIO = 1.42;
const PENDING_FILE_WATCHDOG_MS = 30000;

interface Props {
  formData: VendorFormData;
  updateFormData: (data: Partial<VendorFormData>) => void;
}

const VISA_COUNTRIES = [
  { code: 'US', name: 'USA', flag: '🇺🇸' },
  { code: 'EU', name: 'Schengen', flag: '🇪🇺' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'GB', name: 'UK', flag: '🇬🇧' },
];

interface VisaEntry {
  country: string;
  countryCode: string;
  flag: string;
  doc?: { url: string; name: string; size: string } | null;
}

export const Step4TravelInfo = ({ formData, updateFormData }: Props) => {
  const [visas, setVisas] = useState<VisaEntry[]>(() => {
    if (formData.visa_country) {
      const country = VISA_COUNTRIES.find(c => c.name === formData.visa_country);
      if (country) {
        return [{ country: country.name, countryCode: country.code, flag: country.flag, doc: formData.visa_file_url ? { url: formData.visa_file_url, name: 'visa', size: '' } : null }];
      }
    }
    return [];
  });

  const [passportPreview, setPassportPreview] = useState<{ url: string; name: string; size: string } | null>(null);
  const [pendingPassportFile, setPendingPassportFile] = useState<File | null>(null);
  const [convertingPdf, setConvertingPdf] = useState(false);

  // Watchdog: never let a stuck cropper freeze the form permanently.
  useEffect(() => {
    if (!pendingPassportFile) return;
    const t = window.setTimeout(() => {
      console.warn('Step4: cropper pendingPassportFile watchdog tripped, clearing');
      setPendingPassportFile(null);
    }, PENDING_FILE_WATCHDOG_MS);
    return () => window.clearTimeout(t);
  }, [pendingPassportFile]);

  // Restore passport preview from File object or URL on mount
  useEffect(() => {
    if (formData.passport_file) {
      const sizeStr = (formData.passport_file.size / 1024).toFixed(0) + ' KB';
      const url = URL.createObjectURL(formData.passport_file);
      setPassportPreview({ url, name: formData.passport_file.name, size: sizeStr });
      return () => URL.revokeObjectURL(url);
    } else if (formData.passport_file_url) {
      setPassportPreview({ url: formData.passport_file_url, name: 'passport', size: '' });
    }
  }, []);

  // Restore visa file previews from File objects on mount
  useEffect(() => {
    if (formData.visa_file && visas.length > 0 && !visas[0].doc) {
      const sizeStr = (formData.visa_file.size / 1024).toFixed(0) + ' KB';
      const url = URL.createObjectURL(formData.visa_file);
      setVisas(prev => prev.map((v, i) => i === 0 ? { ...v, doc: { url, name: formData.visa_file!.name, size: sizeStr } } : v));
      return () => URL.revokeObjectURL(url);
    }
  }, []);

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const passportFileRef = useRef<HTMLInputElement | null>(null);

  const toggleVisa = (vc: typeof VISA_COUNTRIES[0]) => {
    const idx = visas.findIndex(v => v.countryCode === vc.code);
    let updated: VisaEntry[];
    if (idx >= 0) {
      updated = visas.filter(v => v.countryCode !== vc.code);
    } else {
      updated = [...visas, { country: vc.name, countryCode: vc.code, flag: vc.flag, doc: null }];
    }
    setVisas(updated);
    updateFormData({ visa_country: updated[0]?.country || '' });
  };

  const handleVisaUpload = (code: string, file: File) => {
    const sizeStr = (file.size / 1024).toFixed(0) + ' KB';
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setVisas(prev => prev.map(v =>
          v.countryCode === code ? { ...v, doc: { url: reader.result as string, name: file.name, size: sizeStr } } : v
        ));
      };
      reader.readAsDataURL(file);
    } else {
      setVisas(prev => prev.map(v =>
        v.countryCode === code ? { ...v, doc: { url: 'document', name: file.name, size: sizeStr } } : v
      ));
    }
    updateFormData({ visa_file: file });
  };

  const removeVisaDoc = (index: number) => {
    setVisas(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], doc: null };
      return copy;
    });
  };

  const handlePassportUpload = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    let imageFile: File | null = null;
    if (isPdf) {
      setConvertingPdf(true);
      try {
        imageFile = await pdfFirstPageToImage(file);
      } catch (e) {
        console.error('PDF conversion failed', e);
        commitPassportFile(file);
        setConvertingPdf(false);
        return;
      } finally {
        setConvertingPdf(false);
      }
    } else if (file.type.startsWith('image/')) {
      imageFile = file;
    } else {
      commitPassportFile(file);
      return;
    }

    setPendingPassportFile(imageFile);
  };

  const commitPassportFile = (file: File) => {
    const sizeStr = (file.size / 1024).toFixed(0) + ' KB';
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPassportPreview({ url: reader.result as string, name: file.name, size: sizeStr });
      };
      reader.readAsDataURL(file);
    } else {
      setPassportPreview({ url: 'document', name: file.name, size: sizeStr });
    }
    updateFormData({ passport_file: file });
    setPendingPassportFile(null);
  };

  const removePassportDoc = () => {
    setPassportPreview(null);
    updateFormData({ passport_file: null, passport_file_url: '' });
  };

  return (
    <>
      <h2 className="step-title">✈️ السفر</h2>
      <p className="step-subtitle">معلومات السفر والتأشيرات <span className="opt">(اختياري)</span></p>
      <div className="form-section">
        {/* Info */}
        <div className="info-box amber">
          <span className="info-icon">✈️</span>
          <span><strong>لماذا نطلب هذا؟</strong><br />بعض المشاريع تتطلب السفر خارج المملكة. هذه المعلومات اختيارية وتساعدنا في ترشيحك لمشاريع دولية.</span>
        </div>

        {/* Passport Number */}
        <div className="input-group">
          <label className="input-label">رقم جواز السفر</label>
          <input
            className="input"
            type="text"
            value={formData.passport_number}
            onChange={(e) => updateFormData({ passport_number: e.target.value })}
            placeholder="A12345678"
            dir="ltr"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </div>

        {/* Passport Upload */}
        <div className="input-group">
          <label className="input-label">صورة جواز السفر</label>
          {passportPreview ? (
            <div className="upload-preview">
              {passportPreview.url !== 'document' ? (
                <img src={passportPreview.url} alt="Passport" />
              ) : (
                <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📄</div>
              )}
              <div className="up-info">
                <span className="up-name">{passportPreview.name}</span>
                <span className="up-size">{passportPreview.size}</span>
              </div>
              <button className="up-remove" onClick={removePassportDoc} type="button">✕</button>
            </div>
          ) : (
            <div className="upload-zone">
              <span className="uz-emoji">📄</span>
              <div className="uz-text">اسحب صورة الجواز هنا أو انقر للرفع</div>
              <div className="uz-hint">PNG, JPG, PDF — حد أقصى 5MB</div>
              <input
                ref={passportFileRef}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePassportUpload(file);
                  e.target.value = '';
                }}
              />
            </div>
          )}
        </div>

        {/* Visa chips */}
        <div className="input-group">
          <label className="input-label">
            الدول التي لديك تأشيرة لها{' '}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(اختر واحدة أو أكثر)</span>
          </label>
          <div className="visa-chips">
            {VISA_COUNTRIES.map(vc => {
              const isSelected = visas.some(v => v.countryCode === vc.code);
              return (
                <div
                  key={vc.code}
                  className={`visa-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleVisa(vc)}
                >
                  {vc.flag} {vc.name} {isSelected && '✓'}
                </div>
              );
            })}
          </div>
        </div>

        {/* Visa upload items */}
        {visas.length > 0 && (
          <div className="visa-uploads">
            {visas.map((visa, idx) => (
              <div key={visa.countryCode} className="visa-upload-item">
                <label className="input-label">{visa.flag} صورة تأشيرة {visa.country}</label>
                {visa.doc ? (
                  <div className="upload-preview">
                    {visa.doc.url !== 'document' ? (
                      <img src={visa.doc.url} alt={visa.country} />
                    ) : (
                      <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📄</div>
                    )}
                    <div className="up-info">
                      <span className="up-name">{visa.doc.name}</span>
                      <span className="up-size">{visa.doc.size}</span>
                    </div>
                    <button className="up-remove" onClick={() => removeVisaDoc(idx)} type="button">✕</button>
                  </div>
                ) : (
                  <div className="upload-zone">
                    <span className="uz-emoji">📄</span>
                    <div className="uz-text">اسحب ملف التأشيرة هنا</div>
                    <div className="uz-hint">PNG, JPG, PDF — حد أقصى 5MB</div>
                    <input
                      ref={el => { fileRefs.current[visa.countryCode] = el; }}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVisaUpload(visa.countryCode, file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {convertingPdf && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#e2e8f0', fontFamily: 'Tajawal, sans-serif', fontSize: 14,
        }}>
          جاري تحويل ملف PDF…
        </div>
      )}

      {pendingPassportFile && (
        <Suspense fallback={null}>
          <DocumentCropper
            open={!!pendingPassportFile}
            file={pendingPassportFile}
            aspect={PASSPORT_ASPECT_RATIO}
            docLabel="جواز السفر"
            onSave={commitPassportFile}
            onSkip={commitPassportFile}
            onCancel={() => setPendingPassportFile(null)}
          />
        </Suspense>
      )}
    </>
  );
};
