import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { VendorFormData } from '../VendorRegistrationForm';
import { COUNTRY_CODES } from '../../../lib/shared-data';
import { Toggle } from '../../ui/Toggle';

interface Props {
  formData: VendorFormData;
  updateFormData: (data: Partial<VendorFormData>) => void;
  errors?: Record<string, string>;
}

const FieldError = ({ msg }: { msg?: string }) => msg ? (
  <div className="field-error">✕ {msg}</div>
) : null;

export const Step2Contact = ({ formData, updateFormData, errors = {} }: Props) => {
  const [cities, setCities] = useState<string[]>([]);
  const [phoneCodeOpen, setPhoneCodeOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [countryCodeSearch, setCountryCodeSearch] = useState('');
  const phoneCodeRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (phoneCodeRef.current && !phoneCodeRef.current.contains(e.target as Node)) setPhoneCodeOpen(false);
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const PRIORITY_CITIES = ['الرياض', 'جدة', 'الدمام'];
  const FALLBACK_CITIES = ['الرياض','جدة','الدمام','مكة المكرمة','المدينة المنورة','الخبر','الظهران','الطائف','تبوك','بريدة','عنيزة','حائل','خميس مشيط','أبها','نجران','جازان','ينبع','الجبيل','القطيف','الأحساء','حفر الباطن','الخرج','سكاكا','عرعر','الباحة','العلا','رابغ','بيشة'];

  const fetchCities = async () => {
    const { data } = await supabase
      .from('cities')
      .select('name')
      .eq('is_active', true)
      .order('name');
    if (data && data.length > 0) {
      const names = data.map(c => c.name);
      const priority = PRIORITY_CITIES.filter(c => names.includes(c));
      const rest = names.filter(c => !PRIORITY_CITIES.includes(c));
      setCities([...priority, ...rest]);
    } else {
      setCities(FALLBACK_CITIES);
    }
  };

  const currentCode = COUNTRY_CODES.find(c => c.code === formData.country_code);
  const filteredCities = cities.filter(c => c.includes(citySearch));
  const filteredCountryCodes = COUNTRY_CODES.filter(c =>
    c.code.includes(countryCodeSearch) ||
    c.name.includes(countryCodeSearch) ||
    c.nameAr.includes(countryCodeSearch)
  );
  const otherCities = cities.filter(c => c !== formData.primary_city);

  return (
    <>
      <h2 className="step-title">📞 التواصل</h2>
      <p className="step-subtitle">معلومات التواصل والموقع</p>
      <div className="form-section">
        {/* Phone */}
        <div className="input-group">
          <label className="input-label"><span className="req">*</span> رقم الجوال</label>
          <div className="phone-group">
            {/* Country code — custom select */}
            <div className={`custom-select phone-code ${phoneCodeOpen ? 'open' : ''}`} ref={phoneCodeRef}>
              <div className="cs-trigger" onClick={() => setPhoneCodeOpen(!phoneCodeOpen)}>
                <span>{currentCode ? `${currentCode.flag} ${currentCode.code}` : '+966 🇸🇦'}</span>
                <span className="cs-chevron">&#9662;</span>
              </div>
              {phoneCodeOpen && (
                <div className="cs-dropdown" style={{ display: 'flex' }}>
                  <div className="cs-search">
                    <input
                      type="text"
                      placeholder="ابحث..."
                      value={countryCodeSearch}
                      onChange={(e) => setCountryCodeSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="cs-options">
                    {filteredCountryCodes.map(c => (
                      <div
                        key={c.code}
                        className={`cs-option ${formData.country_code === c.code ? 'selected' : ''}`}
                        onClick={() => {
                          updateFormData({ country_code: c.code });
                          setPhoneCodeOpen(false);
                          setCountryCodeSearch('');
                        }}
                      >
                        {c.flag} {c.code} {c.nameAr}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Phone number */}
            <input
              className="input phone-number"
              type="tel"
              value={formData.phone}
              onChange={(e) => updateFormData({ phone: e.target.value.replace(/\D/g, '').slice(0, 9) })}
              placeholder="5XXXXXXXX"
              dir="ltr"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
          <FieldError msg={errors.phone} />
        </div>

        {/* Email */}
        <div className="input-group">
          <label className="input-label"><span className="req">*</span> البريد الإلكتروني</label>
          <input
            className="input"
            type="email"
            required
            value={formData.email}
            onChange={(e) => updateFormData({ email: e.target.value })}
            placeholder="example@email.com"
            dir="ltr"
            style={{ fontFamily: 'var(--font-mono)', textAlign: 'left' }}
          />
          <FieldError msg={errors.email} />
        </div>

        {/* Primary City — custom select */}
        <div className="input-group">
          <label className="input-label"><span className="req">*</span> مدينة العمل الأساسية</label>
          <div className={`custom-select ${cityOpen ? 'open' : ''} ${errors.primary_city ? 'has-error' : ''}`} ref={cityRef}>
            <div className="cs-trigger" onClick={() => setCityOpen(!cityOpen)}>
              <span className={formData.primary_city ? '' : 'cs-placeholder'}>
                {formData.primary_city || 'اختر المدينة'}
              </span>
              <span className="cs-chevron">&#9662;</span>
            </div>
            {cityOpen && (
              <div className="cs-dropdown" style={{ display: 'flex' }}>
                <div className="cs-search">
                  <input
                    type="text"
                    placeholder="ابحث..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="cs-options">
                  {filteredCities.map(city => (
                    <div
                      key={city}
                      className={`cs-option ${formData.primary_city === city ? 'selected' : ''}`}
                      onClick={() => {
                        updateFormData({ primary_city: city });
                        setCityOpen(false);
                        setCitySearch('');
                      }}
                    >
                      {city}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <FieldError msg={errors.primary_city} />
        </div>

        {/* Other cities toggle */}
        <Toggle
          checked={!!formData.available_other_cities}
          onChange={(checked) => updateFormData({ available_other_cities: checked })}
          label="متاح للعمل في مدن أخرى؟"
        />

        {/* Other cities grid */}
        {formData.available_other_cities && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              اختر حتى مدينتين ({(formData.other_cities || []).length}/2)
            </div>
          <div className="city-grid">
            {otherCities.map(city => {
              const checked = formData.other_cities?.includes(city);
              return (
                <div
                  key={city}
                  className={`city-chip ${checked ? 'checked' : ''}`}
                  onClick={() => {
                    const current = formData.other_cities || [];
                    if (checked) {
                      updateFormData({ other_cities: current.filter(c => c !== city) });
                    } else if (current.length < 2) {
                      updateFormData({ other_cities: [...current, city] });
                    }
                  }}
                  style={{ opacity: !checked && (formData.other_cities || []).length >= 2 ? 0.4 : 1, cursor: !checked && (formData.other_cities || []).length >= 2 ? 'not-allowed' : 'pointer' }}
                >
                  <span className="chip-check">{checked ? '✓' : ''}</span>
                  {city}
                </div>
              );
            })}
          </div>
          </div>
        )}
      </div>
    </>
  );
};
