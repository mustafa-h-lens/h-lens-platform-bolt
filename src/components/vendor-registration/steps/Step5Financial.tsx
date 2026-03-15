import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { VendorFormData } from '../VendorRegistrationForm';
import { Banknote, DollarSign } from 'lucide-react';
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

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('id, name_ar, name_en')
        .eq('is_active', true)
        .order('name_ar');

      if (error) throw error;
      setBanks(data || []);
    } catch (error) {
      console.error('Error fetching banks:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--vr-text-primary)' }}>
          المعلومات المالية
        </h2>
        <p style={{ color: 'var(--vr-text-secondary)' }}>
          معلومات حسابك البنكي لتحويل المستحقات
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="vr-banner info"
        style={{
          background: 'var(--vr-success-bg)',
          borderColor: 'var(--vr-success-border)',
          color: 'var(--vr-success-text)',
        }}
      >
        <Banknote className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--vr-success)' }} />
        <div>
          <h3 className="font-semibold mb-2" style={{ color: 'var(--vr-text-primary)' }}>
            طريقة الدفع: تحويل بنكي
          </h3>
          <p className="text-sm" style={{ color: 'var(--vr-text-secondary)' }}>
            سيتم تحويل مستحقاتك مباشرة إلى حسابك البنكي بعد كل مشروع
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="vr-input-group relative"
      >
        <label className="vr-input-label">اسم البنك <span className="req">*</span></label>
        <select
          value={formData.bank_id || ''}
          onChange={(e) => updateFormData({ bank_id: e.target.value })}
          className="vr-input select"
          disabled={loading}
        >
          <option value=""></option>
          {banks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name_ar}
            </option>
          ))}
        </select>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="vr-input-group"
      >
        <label className="vr-input-label">اسم صاحب الحساب <span className="req">*</span></label>
        <input
          type="text"
          value={formData.account_name}
          onChange={(e) => updateFormData({ account_name: e.target.value })}
          placeholder=" "
          className="vr-input"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="vr-input-group"
      >
        <label className="vr-input-label">رقم الآيبان (IBAN) <span className="req">*</span></label>
        <input
          type="text"
          value={formData.iban}
          onChange={(e) => {
            let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (value.length > 0 && !value.startsWith('SA')) {
              value = 'SA' + value;
            }
            if (value.length > 24) {
              value = value.substring(0, 24);
            }
            updateFormData({ iban: value });
          }}
          placeholder=" "
          className="vr-input"
          dir="ltr"
          style={{ textAlign: 'left', letterSpacing: '0.05em' }}
          maxLength={24}
        />
        {formData.iban && formData.iban.length > 0 && (
          <div className="vr-input-hint">
            {formData.iban.length} / 24 حرف
            {formData.iban.length === 24 && (
              <span className="mr-2" style={{ color: 'var(--vr-success)' }}>
                ✓ مكتمل
              </span>
            )}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-between p-4"
        style={{
          background: 'var(--vr-bg-card)',
          borderRadius: 'var(--vr-radius-lg)',
        }}
      >
        <div>
          <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--vr-text-primary)' }}>
            <DollarSign className="w-5 h-5" />
            السعر يشمل الضريبة؟
          </h3>
          <p className="text-sm" style={{ color: 'var(--vr-text-muted)' }}>
            هل الأسعار التي تقدمها تشمل ضريبة القيمة المضافة؟
          </p>
        </div>
        <motion.div
          whileTap={{ scale: 0.9 }}
          onClick={() => updateFormData({ price_includes_tax: !formData.price_includes_tax })}
          className={`vr-toggle ${formData.price_includes_tax ? 'on' : ''}`}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="vr-banner info"
      >
        <div>
          <p className="text-sm" style={{ color: 'var(--vr-text-secondary)' }}>
            <strong style={{ color: 'var(--vr-text-primary)' }}>ملاحظة:</strong> جميع معلوماتك المالية محمية
            ومشفرة. لن يتم مشاركتها مع أي طرف ثالث وستستخدم فقط لتحويل مستحقاتك.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
