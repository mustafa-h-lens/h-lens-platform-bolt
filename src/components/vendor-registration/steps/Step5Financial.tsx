import { useEffect, useState, useRef } from 'react';
import { VendorFormData } from '../VendorRegistrationForm';
import { supabase } from '../../../lib/supabaseClient';
import { Toggle } from '../../ui/Toggle';

interface Props {
  formData: VendorFormData;
  updateFormData: (data: Partial<VendorFormData>) => void;
  errors?: Record<string, React.ReactNode>;
}

const FieldError = ({ msg }: { msg?: React.ReactNode }) => msg ? (
  <div className="field-error">✕ {msg}</div>
) : null;

interface Bank {
  id: string;
  name_ar: string;
  name_en: string;
}

export const Step5Financial = ({ formData, updateFormData, errors = {} }: Props) => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankOpen, setBankOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const bankRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchBanks(); }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bankRef.current && !bankRef.current.contains(e.target as Node)) setBankOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const FALLBACK_BANKS: Bank[] = [
    { id: 'fb1', name_ar: 'البنك الأهلي السعودي', name_en: 'SNB' },
    { id: 'fb2', name_ar: 'بنك الراجحي', name_en: 'Al Rajhi Bank' },
    { id: 'fb3', name_ar: 'بنك الرياض', name_en: 'Riyad Bank' },
    { id: 'fb4', name_ar: 'بنك ساب', name_en: 'SABB' },
    { id: 'fb5', name_ar: 'البنك السعودي الفرنسي', name_en: 'BSF' },
    { id: 'fb6', name_ar: 'بنك البلاد', name_en: 'Bank AlBilad' },
    { id: 'fb7', name_ar: 'بنك الجزيرة', name_en: 'Bank AlJazira' },
    { id: 'fb8', name_ar: 'بنك الإنماء', name_en: 'Alinma Bank' },
    { id: 'fb9', name_ar: 'البنك العربي الوطني', name_en: 'ANB' },
    { id: 'fb10', name_ar: 'بنك السعودي للاستثمار', name_en: 'SAIB' },
  ];

  const fetchBanks = async () => {
    try {
      const { data, error } = await supabase.from('banks').select('id, name_ar, name_en').eq('is_active', true).order('name_ar');
      if (error) throw error;
      if (data && data.length > 0) {
        setBanks(data);
      } else {
        setBanks(FALLBACK_BANKS);
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
      setBanks(FALLBACK_BANKS);
    }
    finally { setLoading(false); }
  };

  const selectedBank = banks.find(b => b.id === formData.bank_id);

  // IBAN: digits only (without SA prefix)
  const ibanRaw = (formData.iban?.startsWith('SA') ? formData.iban.slice(2) : formData.iban || '').replace(/\D/g, '');
  // Format with spaces for display: "03 8000 0000 6080 1016 75 19"
  const formatIbanDisplay = (digits: string) => {
    // SA + 2 check digits + 4*5 groups => SA XX XXXX XXXX XXXX XXXX XX
    const groups = [];
    let i = 0;
    const sizes = [2, 4, 4, 4, 4, 2, 2];
    for (const size of sizes) {
      if (i >= digits.length) break;
      groups.push(digits.slice(i, i + size));
      i += size;
    }
    return groups.join(' ');
  };

  const filteredBanks = banks.filter(b => b.name_ar.includes(bankSearch) || b.name_en.toLowerCase().includes(bankSearch.toLowerCase()));

  return (
    <>
      <h2 className="step-title">🏦 المالية</h2>
      <p className="step-subtitle">المعلومات البنكية لتحويل المستحقات</p>
      <div className="form-section">
        {/* Info */}
        <div className="info-box green">
          <span className="info-icon">🏦</span>
          <span><strong>طريقة الدفع: تحويل بنكي</strong><br />سيتم تحويل مستحقاتك مباشرة إلى حسابك البنكي بعد اكتمال كل مشروع</span>
        </div>

        {/* Bank — custom select */}
        <div className="input-group">
          <label className="input-label"><span className="req">*</span> اسم البنك</label>
          <div className={`custom-select ${bankOpen ? 'open' : ''}`} ref={bankRef}>
            <div className="cs-trigger" tabIndex={0} onClick={() => !loading && setBankOpen(!bankOpen)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!loading) setBankOpen(!bankOpen); } }}>
              <span className={selectedBank ? '' : 'cs-placeholder'}>
                {selectedBank ? selectedBank.name_ar : 'اختر البنك'}
              </span>
              <span className="cs-chevron">&#9662;</span>
            </div>
            {bankOpen && (
              <div className="cs-dropdown" style={{ display: 'flex' }}>
                <div className="cs-search">
                  <input
                    type="text"
                    placeholder="ابحث..."
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="cs-options">
                  {filteredBanks.map(b => (
                    <div
                      key={b.id}
                      className={`cs-option ${formData.bank_id === b.id ? 'selected' : ''}`}
                      onClick={() => {
                        updateFormData({ bank_id: b.id, bank_name_display: b.name_ar });
                        setBankOpen(false);
                        setBankSearch('');
                      }}
                    >
                      {b.name_ar}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <FieldError msg={errors.bank_id} />
        </div>

        {/* Account Holder Name */}
        <div className="input-group">
          <label className="input-label"><span className="req">*</span> اسم صاحب الحساب</label>
          <input
            className="input"
            type="text"
            value={formData.account_name}
            onChange={(e) => updateFormData({ account_name: e.target.value })}
            placeholder="الاسم كما يظهر في الحساب البنكي"
          />
          <FieldError msg={errors.account_name} />
        </div>

        {/* IBAN with SA prefix */}
        <div className="input-group">
          <label className="input-label"><span className="req">*</span> رقم الآيبان IBAN</label>
          <div className="iban-wrap" style={{ direction: 'ltr' }}>
            <span className="iban-prefix">SA</span>
            <input
              className="input"
              type="text"
              value={ibanRaw}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 22);
                updateFormData({ iban: 'SA' + digits });
              }}
              placeholder="0380000000608010167519"
              dir="ltr"
              inputMode="numeric"
              style={{ fontFamily: 'var(--font-mono)', textAlign: 'left', letterSpacing: '0.05em' }}
              maxLength={22}
            />
          </div>
          <div className="iban-counter" style={{ direction: 'ltr', textAlign: 'left' }}>{ibanRaw.length} / 22 {ibanRaw.length === 22 && <span style={{ color: 'var(--success-text)' }}>✓</span>}</div>
          <FieldError msg={errors.iban} />
        </div>

        {/* VAT toggle */}
        <Toggle
          checked={!!formData.price_includes_tax}
          onChange={(checked) => {
            updateFormData({ price_includes_tax: checked });
            if (!checked) updateFormData({ company_name: '', vat_number: '' });
          }}
          label="السعر يشمل ضريبة القيمة المضافة؟"
        />

        {/* VAT fields — shown when VAT is enabled */}
        {formData.price_includes_tax && (
          <>
            <div className="input-group">
              <label className="input-label"><span className="req">*</span> اسم الشركة / المؤسسة</label>
              <input
                className="input"
                type="text"
                value={formData.company_name || ''}
                onChange={(e) => updateFormData({ company_name: e.target.value })}
                placeholder="اسم الشركة كما هو في السجل التجاري"
              />
              <FieldError msg={errors.company_name} />
            </div>
            <div className="input-group">
              <label className="input-label"><span className="req">*</span> الرقم الضريبي</label>
              <input
                className="input"
                type="text"
                value={formData.vat_number || ''}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 15);
                  updateFormData({ vat_number: digits });
                }}
                placeholder="3XXXXXXXXXX0003"
                dir="ltr"
                inputMode="numeric"
                style={{ fontFamily: 'var(--font-mono)', textAlign: 'left', letterSpacing: '0.05em' }}
                maxLength={15}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, direction: 'ltr', textAlign: 'left' }}>
                {(formData.vat_number || '').length} / 15
              </div>
              <FieldError msg={errors.vat_number} />
            </div>
          </>
        )}
      </div>
    </>
  );
};
