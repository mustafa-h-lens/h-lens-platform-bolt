import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabaseClient';
import { VendorFormData } from '../VendorRegistrationForm';
import { Phone, MapPin, Check } from 'lucide-react';
import { COUNTRY_CODES } from '../../../lib/shared-data';

interface Props {
  formData: VendorFormData;
  updateFormData: (data: Partial<VendorFormData>) => void;
}

export const Step2Contact = ({ formData, updateFormData }: Props) => {
  const [cities, setCities] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    const { data } = await supabase
      .from('cities')
      .select('name')
      .eq('is_active', true)
      .order('name');
    if (data) setCities(data.map(c => c.name));
  };

  const filteredCities = cities.filter(c => c.includes(citySearch));

  return (
    <div className="space-y-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--vr-text-primary)' }}>
          معلومات التواصل
        </h2>
        <p style={{ color: 'var(--vr-text-secondary)' }}>
          كيف يمكننا الوصول إليك؟
        </p>
      </motion.div>

      {/* Phone with country code on LEFT (LTR layout) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="vr-input-label block mb-2">
          رقم الجوال <span className="req">*</span>
        </label>
        <div style={{ display: 'flex', gap: 0, direction: 'ltr' }}>
          {/* Country code LEFT */}
          <select
            value={formData.country_code}
            onChange={(e) => updateFormData({ country_code: e.target.value })}
            className="vr-input"
            style={{
              width: 120, flexShrink: 0,
              borderRadius: '10px 0 0 10px',
              borderLeft: 'none',
              textAlign: 'center',
              fontSize: '14px',
              cursor: 'pointer',
              paddingLeft: 8, paddingRight: 8,
            }}
          >
            {COUNTRY_CODES.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
          {/* Phone number RIGHT */}
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateFormData({ phone: e.target.value.replace(/\D/g, '').slice(0, 9) })}
            placeholder="512345678"
            className="vr-input"
            dir="ltr"
            style={{ flex: 1, borderRadius: '0 10px 10px 0', textAlign: 'left' }}
          />
        </div>
        <div style={{ fontSize: '11px', color: 'var(--vr-text-muted)', marginTop: 4, textAlign: 'left', direction: 'ltr' }}>
          {formData.phone.length}/9
        </div>
      </motion.div>

      {/* Primary City — searchable dropdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <label className="vr-input-label" style={{ marginBottom: 6 }}>مدينة العمل الأساسية <span className="req">*</span></label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={formData.primary_city || citySearch}
            onChange={(e) => {
              setCitySearch(e.target.value);
              setShowCityDropdown(true);
              updateFormData({ primary_city: '' });
            }}
            onFocus={() => setShowCityDropdown(true)}
            onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
            placeholder="ابحث عن المدينة..."
            className="vr-input"
          />
          {showCityDropdown && filteredCities.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="vr-dropdown"
              style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50 }}
            >
              {filteredCities.map((city) => (
                <div
                  key={city}
                  className="vr-dropdown-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    updateFormData({ primary_city: city });
                    setCitySearch('');
                    setShowCityDropdown(false);
                  }}
                >
                  <MapPin className="w-4 h-4 inline-block ml-2" style={{ color: 'var(--vr-accent-lighter)' }} />
                  {city}
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Available in other cities toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between p-4"
        style={{
          background: 'var(--vr-bg-card)',
          borderRadius: 'var(--vr-radius-lg)',
          border: '1px solid var(--vr-border-subtle)',
        }}
      >
        <div>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--vr-text-primary)' }}>
            متاح للعمل في مدن أخرى؟
          </h3>
          <p className="text-sm" style={{ color: 'var(--vr-text-muted)' }}>
            هل تستطيع العمل في مدن أخرى غير مدينتك الأساسية؟
          </p>
        </div>
        <motion.div
          whileTap={{ scale: 0.9 }}
          onClick={() => updateFormData({ available_other_cities: !formData.available_other_cities })}
          className={`vr-toggle ${formData.available_other_cities ? 'on' : ''}`}
        />
      </motion.div>

      {/* Other cities — all cities, scrollable, chip style like vendor dashboard */}
      {formData.available_other_cities && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ delay: 0.35 }}
        >
          <label className="vr-input-label block mb-3">
            اختر المدن الأخرى
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 200, overflowY: 'auto', padding: '4px 0' }}>
            {cities.filter(c => c !== formData.primary_city).map((city) => {
              const isSel = formData.other_cities?.includes(city);
              return (
                <motion.button
                  key={city}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const otherCities = formData.other_cities || [];
                    if (isSel) {
                      updateFormData({ other_cities: otherCities.filter(c => c !== city) });
                    } else {
                      updateFormData({ other_cities: [...otherCities, city] });
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 14px', borderRadius: 8, fontSize: '13px', fontWeight: 600,
                    fontFamily: "'Cairo', sans-serif", cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: isSel ? 'var(--vr-accent-glow-md)' : 'transparent',
                    border: `1.5px solid ${isSel ? 'var(--vr-border-accent)' : 'var(--vr-border-soft)'}`,
                    color: isSel ? 'var(--vr-accent-lighter)' : 'var(--vr-text-secondary)',
                  }}
                >
                  {isSel && <Check size={13} />}
                  {city}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};
