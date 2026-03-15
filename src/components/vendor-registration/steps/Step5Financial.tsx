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

  useEffect(() => { fetchBanks(); }, []);

  const fetchBanks = async () => {
    try {
      const { data, error } = await supabase.from('banks').select('id, name_ar, name_en').eq('is_active', true).order('name_ar');
      if (error) throw error;
      setBanks(data || []);
    } catch (error) { console.error('Error fetching banks:', error); }
    finally { setLoading(false); }
  };

  // Extract IBAN digits (without SA prefix)
  const ibanDigits = (formData.iban?.startsWith('SA') ? formData.iban.slice(2) : formData.iban || '').replace(/\D/g, '');

  return (
    <div className="space-y-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--vr-text-primary)' }}>المعلومات المالية</h2>
        <p style={{ color: 'var(--vr-text-secondary)' }}>معلومات حسابك البنكي لتحويل المستحقات</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="vr-banner info" style={{ background: 'var(--vr-success-bg)', borderColor: 'var(--vr-success-border)', color: 'var(--vr-success-text)' }}>
        <Banknote className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--vr-success)' }} />
        <div>
          <h3 className="font-semibold mb-2" style={{ color: 'var(--vr-text-primary)' }}>طريقة الدفع: تحويل بنكي</h3>
          <p className="text-sm" style={{ color: 'var(--vr-text-secondary)' }}>سيتم تحويل مستحقاتك مباشرة إلى حسابك البنكي بعد كل مشروع</p>
        </div>
      </motion.div>

      {/* Bank select */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="vr-input-group">
        <label className="vr-input-label">اسم البنك <span className="req">*</span></label>
        <select value={formData.bank_id || ''} onChange={(e) => updateFormData({ bank_id: e.target.value })} className="vr-input select" disabled={loading}>
          <option value="">اختر البنك</option>
          {banks.map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
        </select>
      </motion.div>

      {/* Account holder name */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="vr-input-group">
        <label className="vr-input-label">اسم صاحب الحساب <span className="req">*</span></label>
        <input type="text" value={formData.account_name} onChange={(e) => updateFormData({ account_name: e.target.value })} placeholder="كما في كشف الحساب البنكي" className="vr-input" />
      </motion.div>

      {/* IBAN with SA prefix */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="vr-input-group">
        <label className="vr-input-label">رقم الآيبان (SA + رقم 22) <span className="req">*</span></label>
        <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.12)', direction: 'ltr' }}>
          <div style={{
            padding: '0 14px', background: 'var(--vr-accent-glow-md)',
            borderLeft: '1px solid var(--vr-border-accent)',
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--vr-accent-lighter)' }}>SA</span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={ibanDigits}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 22);
              updateFormData({ iban: 'SA' + digits });
            }}
            placeholder="0380000000608010167519"
            dir="ltr"
            maxLength={22}
            style={{
              flex: 1, padding: '11px 14px', border: 'none', outline: 'none',
              background: 'rgba(255,255,255,0.03)', color: 'var(--vr-text-primary)',
              fontFamily: "'Cairo', sans-serif", fontSize: 14, letterSpacing: '0.05em',
            }}
          />
          <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--vr-text-muted)', flexShrink: 0 }}>
            {ibanDigits.length}/22
          </div>
        </div>
        {ibanDigits.length === 22 && (
          <div className="vr-input-hint" style={{ color: 'var(--vr-success-text)' }}>✓ رقم الآيبان مكتمل</div>
        )}
      </motion.div>

      {/* Tax toggle */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="flex items-center justify-between p-4"
        style={{ background: 'var(--vr-bg-card)', borderRadius: 'var(--vr-radius-lg)', border: '1px solid var(--vr-border-subtle)' }}>
        <div>
          <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--vr-text-primary)' }}>
            <DollarSign className="w-5 h-5" /> السعر يشمل الضريبة؟
          </h3>
          <p className="text-sm" style={{ color: 'var(--vr-text-muted)' }}>هل الأسعار التي تقدمها تشمل ضريبة القيمة المضافة؟</p>
        </div>
        <motion.div whileTap={{ scale: 0.9 }} onClick={() => updateFormData({ price_includes_tax: !formData.price_includes_tax })}
          className={`vr-toggle ${formData.price_includes_tax ? 'on' : ''}`} />
      </motion.div>

      {/* Privacy note */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="vr-banner info">
        <div>
          <p className="text-sm" style={{ color: 'var(--vr-text-secondary)' }}>
            <strong style={{ color: 'var(--vr-text-primary)' }}>ملاحظة:</strong> جميع معلوماتك المالية محمية ومشفرة. لن يتم مشاركتها مع أي طرف ثالث.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
