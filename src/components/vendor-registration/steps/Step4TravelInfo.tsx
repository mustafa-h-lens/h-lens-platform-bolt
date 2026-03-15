import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VendorFormData } from '../VendorRegistrationForm';
import { Plane, FileText, Check, X, Upload, ChevronDown } from 'lucide-react';
import { getCountryOptions } from '../../../lib/countries';

interface Props {
  formData: VendorFormData;
  updateFormData: (data: Partial<VendorFormData>) => void;
}

interface VisaEntry {
  country: string;
  countryCode: string;
  flag: string;
  file?: File;
  preview?: string;
}

interface CountryOption {
  value: string;
  label: string;
}

export const Step4TravelInfo = ({ formData, updateFormData }: Props) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [passportPreview, setPassportPreview] = useState<string>(formData.visa_file_url || '');
  const passportInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [countries, setCountries] = useState<CountryOption[]>([]);

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    const options = await getCountryOptions('ar');
    setCountries(options);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  const [visas, setVisas] = useState<VisaEntry[]>(() => {
    if (formData.visa_country) {
      return [{
        country: formData.visa_country,
        countryCode: formData.visa_country,
        flag: '',
        preview: formData.visa_file_url || undefined
      }];
    }
    return [];
  });

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addVisa = (country: CountryOption) => {
    if (visas.find(v => v.country === country.value)) return;
    const flag = country.label.split(' ')[0];
    const updated = [...visas, { country: country.value, countryCode: country.value, flag }];
    setVisas(updated);
    setShowDropdown(false);
    if (updated.length === 1) {
      updateFormData({ visa_country: country.value });
    }
  };

  const removeVisa = (code: string) => {
    const updated = visas.filter(v => v.countryCode !== code);
    setVisas(updated);
    updateFormData({ visa_country: updated[0]?.country || '' });
  };

  const handleFileSelect = (code: string, file: File) => {
    const updated = visas.map(v => {
      if (v.countryCode !== code) return v;
      let preview = 'document';
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setVisas(prev => prev.map(pv => pv.countryCode === code ? { ...pv, preview: reader.result as string } : pv));
        };
        reader.readAsDataURL(file);
      }
      return { ...v, file, preview };
    });
    setVisas(updated);
    // Store first visa file for backward compat
    const first = updated.find(v => v.file);
    if (first?.file) updateFormData({ visa_file: first.file });
  };

  const availableCountries = countries.filter(c => !visas.find(v => v.country === c.value));

  return (
    <div className="space-y-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--vr-text-primary)' }}>معلومات السفر</h2>
        <p style={{ color: 'var(--vr-text-secondary)' }}>اختياري - يمكنك تخطي هذه الخطوة</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="vr-banner info">
        <Plane className="w-8 h-8 flex-shrink-0" />
        <div>
          <h3 className="font-semibold mb-2" style={{ color: 'var(--vr-text-primary)' }}>هل لديك تأشيرة سفر سارية؟</h3>
          <p className="text-sm">إذا كانت لديك تأشيرة سارية لأي دولة، يمكنك إضافة معلوماتها هنا لزيادة فرص عملك معنا</p>
        </div>
      </motion.div>

      {/* Passport number + upload */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="vr-input-group" style={{ marginBottom: 12 }}>
          <label className="vr-input-label">رقم جواز السفر</label>
          <input type="text" value={formData.passport_number} onChange={(e) => updateFormData({ passport_number: e.target.value })} placeholder="A12345678" className="vr-input" dir="ltr" style={{ textAlign: 'left' }} />
        </div>
        {/* Passport image upload */}
        <div>
          <label className="vr-input-label" style={{ marginBottom: 6 }}>صورة جواز السفر</label>
          <input
            ref={passportInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                updateFormData({ visa_file: file });
                if (file.type.startsWith('image/')) {
                  const reader = new FileReader();
                  reader.onload = () => setPassportPreview(reader.result as string);
                  reader.readAsDataURL(file);
                } else {
                  setPassportPreview('document');
                }
              }
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />
          {passportPreview ? (
            <div style={{ textAlign: 'center', padding: 16, borderRadius: 14, border: '1px solid var(--vr-success-border)', background: 'var(--vr-success-bg)' }}>
              {passportPreview === 'document' ? (
                <FileText size={32} style={{ color: 'var(--vr-success-text)', margin: '0 auto 8px' }} />
              ) : (
                <img src={passportPreview} alt="" style={{ maxHeight: 100, borderRadius: 10, margin: '0 auto 8px' }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                <Check size={14} style={{ color: 'var(--vr-success)' }} />
                <span style={{ fontSize: 12, color: 'var(--vr-success-text)', fontWeight: 600 }}>تم الرفع</span>
              </div>
              <button onClick={() => passportInputRef.current?.click()} style={{ background: 'none', border: 'none', color: 'var(--vr-accent-lighter)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                تغيير الملف
              </button>
            </div>
          ) : (
            <button onClick={() => passportInputRef.current?.click()} className="vr-upload-zone" style={{ width: '100%', padding: '20px 16px' }}>
              <Upload size={20} className="upload-icon mx-auto mb-2" />
              <p className="upload-text" style={{ fontSize: 13 }}>ارفع صورة جواز السفر</p>
              <p className="upload-hint" style={{ fontSize: 11 }}>JPG, PNG, PDF (حد أقصى 5MB)</p>
            </button>
          )}
        </div>
      </motion.div>

      {/* Visa multi-select dropdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <label className="vr-input-label" style={{ marginBottom: 6 }}>التأشيرات المتوفرة</label>

        {/* Selected visas as tags */}
        {visas.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {visas.map(v => (
              <span key={v.countryCode} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8,
                background: 'var(--vr-accent-glow-md)', border: '1px solid var(--vr-border-accent)',
                color: 'var(--vr-accent-lighter)', fontSize: 13, fontWeight: 600,
              }}>
                <span style={{ fontSize: 16 }}>{v.flag}</span>
                {v.country}
                <button onClick={() => removeVisa(v.countryCode)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vr-error-text)', display: 'flex', padding: 0 }}>
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Dropdown to add more */}
        {availableCountries.length > 0 && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="vr-input"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'right' }}
            >
              <span style={{ color: 'var(--vr-text-muted)' }}>
                {visas.length === 0 ? 'اختر التأشيرات المتوفرة لديك' : 'إضافة تأشيرة أخرى'}
              </span>
              <ChevronDown size={16} style={{ color: 'var(--vr-text-muted)', flexShrink: 0 }} />
            </button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="vr-dropdown"
                  style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50 }}
                >
                  {availableCountries.map(c => (
                    <div key={c.value} className="vr-dropdown-item" onMouseDown={(e) => { e.preventDefault(); addVisa(c); }}>
                      {c.label}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Individual upload box per visa */}
      <AnimatePresence>
        {visas.map((visa, idx) => (
          <motion.div
            key={visa.countryCode}
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: 0.1 * idx }}
            style={{
              padding: 16, borderRadius: 14,
              border: '1px solid var(--vr-border-soft)',
              background: 'var(--vr-bg-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{visa.flag}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--vr-text-primary)' }}>تأشيرة {visa.country}</span>
              </div>
              {visa.preview && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={14} style={{ color: 'var(--vr-success)' }} />
                  <span style={{ fontSize: 12, color: 'var(--vr-success-text)' }}>تم الرفع</span>
                </div>
              )}
            </div>

            <input
              ref={el => { fileRefs.current[visa.countryCode] = el; }}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(visa.countryCode, f); e.target.value = ''; }}
              style={{ display: 'none' }}
            />

            {visa.preview && visa.preview !== 'document' ? (
              <div style={{ position: 'relative', textAlign: 'center' }}>
                <img src={visa.preview} alt="" style={{ maxHeight: 120, borderRadius: 10, margin: '0 auto' }} />
                <button
                  onClick={() => fileRefs.current[visa.countryCode]?.click()}
                  style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--vr-accent-lighter)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  تغيير الملف
                </button>
              </div>
            ) : visa.preview === 'document' ? (
              <div style={{ textAlign: 'center' }}>
                <FileText size={32} style={{ color: 'var(--vr-accent-lighter)', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 12, color: 'var(--vr-text-muted)' }}>تم رفع المستند</p>
                <button
                  onClick={() => fileRefs.current[visa.countryCode]?.click()}
                  style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--vr-accent-lighter)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  تغيير الملف
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRefs.current[visa.countryCode]?.click()}
                className="vr-upload-zone"
                style={{ width: '100%', padding: '20px 16px' }}
              >
                <Upload size={20} className="upload-icon mx-auto mb-2" />
                <p className="upload-text" style={{ fontSize: 13 }}>ارفع صورة التأشيرة أو PDF</p>
                <p className="upload-hint" style={{ fontSize: 11 }}>JPG, PNG, PDF (حد أقصى 5MB)</p>
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
