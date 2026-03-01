import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabaseClient';
import { VendorFormData } from '../VendorRegistrationForm';
import { Phone, MapPin } from 'lucide-react';

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

    if (data) {
      setCities(data.map(c => c.name));
    }
  };

  const filteredCities = cities.filter(c =>
    c.includes(citySearch)
  );

  return (
    <div className="space-y-6">
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="block mb-3" style={{ color: 'var(--vr-text-secondary)' }}>
          رقم الجوال *
        </label>
        <div className="flex gap-3">
          <div className="w-32">
            <div className="vr-input-group">
              <select
                value={formData.country_code}
                onChange={(e) => updateFormData({ country_code: e.target.value })}
                className="vr-input"
                style={{ paddingRight: '12px' }}
              >
                <option value="+966">🇸🇦 +966</option>
                <option value="+20">🇪🇬 +20</option>
                <option value="+971">🇦🇪 +971</option>
                <option value="+965">🇰🇼 +965</option>
                <option value="+962">🇯🇴 +962</option>
                <option value="+961">🇱🇧 +961</option>
              </select>
            </div>
          </div>
          <div className="flex-1 vr-input-group">
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateFormData({ phone: e.target.value.replace(/\D/g, '') })}
              placeholder=" "
              className="vr-input"
              dir="ltr"
              style={{ textAlign: 'left' }}
            />
            <label className="vr-input-label">رقم الجوال</label>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="relative"
      >
        <div className="vr-input-group">
          <input
            type="text"
            value={formData.primary_city || citySearch}
            onChange={(e) => {
              setCitySearch(e.target.value);
              setShowCityDropdown(true);
              updateFormData({ primary_city: '' });
            }}
            onFocus={() => setShowCityDropdown(true)}
            placeholder=" "
            className="vr-input"
          />
          <label className="vr-input-label">مدينة العمل الأساسية *</label>
        </div>

        {showCityDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="vr-dropdown absolute top-full left-0 right-0 mt-2 z-10"
          >
            {filteredCities.map((city) => (
              <div
                key={city}
                className="vr-dropdown-item"
                onClick={() => {
                  updateFormData({ primary_city: city });
                  setCitySearch('');
                  setShowCityDropdown(false);
                }}
              >
                <MapPin className="w-4 h-4 inline-block ml-2" />
                {city}
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between p-4 rounded-xl"
        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
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
          className={`vr-toggle ${formData.available_other_cities ? 'active' : ''}`}
        >
          <div className="vr-toggle-knob" />
        </motion.div>
      </motion.div>

      {formData.available_other_cities && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ delay: 0.35 }}
        >
          <label className="block mb-3" style={{ color: 'var(--vr-text-secondary)' }}>
            اختر المدن الأخرى
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {cities.filter(c => c !== formData.primary_city).slice(0, 12).map((city) => (
              <motion.div
                key={city}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const otherCities = formData.other_cities || [];
                  if (otherCities.includes(city)) {
                    updateFormData({
                      other_cities: otherCities.filter(c => c !== city)
                    });
                  } else {
                    updateFormData({
                      other_cities: [...otherCities, city]
                    });
                  }
                }}
                className={`p-3 rounded-lg text-center cursor-pointer transition-all ${
                  formData.other_cities?.includes(city)
                    ? 'border-2'
                    : 'border'
                }`}
                style={{
                  background: formData.other_cities?.includes(city)
                    ? 'rgba(59, 130, 246, 0.1)'
                    : 'rgba(255, 255, 255, 0.03)',
                  borderColor: formData.other_cities?.includes(city)
                    ? 'var(--vr-primary)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--vr-text-primary)',
                }}
              >
                <MapPin className="w-4 h-4 mx-auto mb-1" />
                <span className="text-sm">{city}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
