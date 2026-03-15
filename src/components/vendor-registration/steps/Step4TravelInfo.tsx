import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { VendorFormData } from '../VendorRegistrationForm';
import { Plane, FileText, Check } from 'lucide-react';

interface Props {
  formData: VendorFormData;
  updateFormData: (data: Partial<VendorFormData>) => void;
}

const countries = [
  { code: 'US', name: 'الولايات المتحدة', flag: '🇺🇸' },
  { code: 'GB', name: 'المملكة المتحدة', flag: '🇬🇧' },
  { code: 'EU', name: 'شنقن', flag: '🇪🇺' },
  { code: 'JP', name: 'اليابان', flag: '🇯🇵' },
];

export const Step4TravelInfo = ({ formData, updateFormData }: Props) => {
  const [visaDragging, setVisaDragging] = useState(false);
  const [visaFilePreview, setVisaFilePreview] = useState<string>(formData.visa_file_url || '');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const visaInputRef = useRef<HTMLInputElement>(null);

  const handleVisaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setVisaDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      updateFormData({ visa_file: file });
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setVisaFilePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setVisaFilePreview('document');
      }
    }
  };

  const handleVisaFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateFormData({ visa_file: file });
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setVisaFilePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setVisaFilePreview('document');
      }
    }
  };

  const filteredCountries = countries.filter(c =>
    c.name.includes(countrySearch)
  );

  return (
    <div className="space-y-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--vr-text-primary)' }}>
          معلومات السفر
        </h2>
        <p style={{ color: 'var(--vr-text-secondary)' }}>
          اختياري - يمكنك تخطي هذه الخطوة
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="vr-banner info"
      >
        <Plane className="w-8 h-8 flex-shrink-0" />
        <div>
          <h3 className="font-semibold mb-2" style={{ color: 'var(--vr-text-primary)' }}>
            هل لديك تأشيرة سفر سارية؟
          </h3>
          <p className="text-sm">
            إذا كانت لديك تأشيرة سارية لأي دولة، يمكنك إضافة معلوماتها هنا لزيادة فرص عملك معنا
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="vr-input-group"
      >
        <label className="vr-input-label">رقم جواز السفر</label>
        <input
          type="text"
          value={formData.passport_number}
          onChange={(e) => updateFormData({ passport_number: e.target.value })}
          placeholder=" "
          className="vr-input"
          dir="ltr"
          style={{ textAlign: 'left' }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative"
      >
        <div className="vr-input-group">
          <label className="vr-input-label">دولة التأشيرة</label>
          <input
            type="text"
            value={formData.visa_country || countrySearch}
            onChange={(e) => {
              setCountrySearch(e.target.value);
              setShowCountryDropdown(true);
              updateFormData({ visa_country: '' });
            }}
            onFocus={() => setShowCountryDropdown(true)}
            placeholder=" "
            className="vr-input"
          />
        </div>

        {showCountryDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="vr-dropdown absolute top-full left-0 right-0 mt-2 z-10"
          >
            {filteredCountries.map((country) => (
              <div
                key={country.code}
                className="vr-dropdown-item"
                onClick={() => {
                  updateFormData({ visa_country: country.name });
                  setCountrySearch('');
                  setShowCountryDropdown(false);
                }}
              >
                <span className="ml-2">{country.flag}</span>
                {country.name}
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <label className="vr-input-label block mb-3">
          رفع مستند التأشيرة
        </label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => setVisaDragging(true)}
          onDragLeave={() => setVisaDragging(false)}
          onDrop={handleVisaDrop}
          onClick={() => visaInputRef.current?.click()}
          className={`vr-upload-zone ${visaDragging ? 'dragover' : ''}`}
        >
          <input
            ref={visaInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleVisaFileSelect}
            className="hidden"
          />

          {visaFilePreview ? (
            <div className="relative">
              {visaFilePreview === 'document' ? (
                <div className="flex flex-col items-center">
                  <FileText className="w-16 h-16 mb-3" style={{ color: 'var(--vr-accent-lighter)' }} />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                    style={{ background: 'var(--vr-success)' }}
                  >
                    <Check className="w-5 h-5 text-white" />
                  </motion.div>
                  <p className="font-semibold" style={{ color: 'var(--vr-text-primary)' }}>
                    تم رفع المستند بنجاح
                  </p>
                </div>
              ) : (
                <>
                  <img
                    src={visaFilePreview}
                    alt="Visa Preview"
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
                </>
              )}
              <p className="mt-3 text-sm" style={{ color: 'var(--vr-text-muted)' }}>
                انقر لتغيير الملف
              </p>
            </div>
          ) : (
            <>
              <FileText className="upload-icon w-12 h-12 mx-auto mb-4" />
              <p className="upload-text font-semibold mb-2">
                اسحب المستند هنا أو انقر للاختيار
              </p>
              <p className="upload-hint">
                JPG, PNG, PDF (حد أقصى 10MB)
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
