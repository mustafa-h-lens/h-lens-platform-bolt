import { useEffect, useState, useRef } from 'react';
import { VendorFormData } from '../VendorRegistrationForm';
import { supabase } from '../../../lib/supabaseClient';

interface Props {
  formData: VendorFormData;
  updateFormData: (data: Partial<VendorFormData>) => void;
}

interface Bank {
  id: string;
  name_ar: string;
  name_en: string;
}

export const Step5Financial = ({ formData, updateFormData }: Props) => {
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

  const fetchBanks = async () => {
    try {
      const { data, error } = await supabase.from('banks').select('id, name_ar, name_en').eq('is_active', true).order('name_ar');
      if (error) throw error;
      setBanks(data || []);
    } catch (error) { console.error('Error fetching banks:', error); }
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
            <div className="cs-trigger" onClick={() => !loading && setBankOpen(!bankOpen)}>
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
                        updateFormData({ bank_id: b.id });
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
        </div>

        {/* IBAN with SA prefix */}
        <div className="input-group">
          <label className="input-label"><span className="req">*</span> رقم الآيبان IBAN</label>
          <div className="iban-wrap">
            <span className="iban-prefix">SA</span>
            <input
              className="input"
              type="text"
              value={formatIbanDisplay(ibanRaw)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 22);
                updateFormData({ iban: 'SA' + digits });
              }}
              placeholder="00 0000 0000 0000 0000 00"
              dir="ltr"
              inputMode="numeric"
              style={{ fontFamily: 'var(--font-mono)', paddingLeft: 36 }}
              maxLength={27}
            />
          </div>
          <div className="iban-counter">{ibanRaw.length} / 22</div>
        </div>

        {/* VAT toggle */}
        <div
          className={`toggle-wrap ${formData.price_includes_tax ? 'on' : ''}`}
          onClick={() => updateFormData({ price_includes_tax: !formData.price_includes_tax })}
        >
          <span className="toggle-label">السعر يشمل ضريبة القيمة المضافة؟</span>
          <div className="toggle-sw" />
        </div>
      </div>
    </>
  );
};
