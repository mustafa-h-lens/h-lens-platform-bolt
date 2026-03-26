import { useState, useEffect } from 'react';
import { Save, Edit2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { toEnglishNumbers } from '../../../../lib/numberUtils';
import { useNotification } from '../../../../contexts/NotificationContext';

interface FinancialData {
  id: string;
  vendor_id: string;
  payment_method: 'bank_transfer' | 'cash' | 'other';
  price_includes_tax: boolean;
  bank_name?: string;
  beneficiary_name?: string;
  iban?: string;
  account_number?: string;
  created_at: string;
  updated_at: string;
}

interface VendorFinancialDataProps {
  vendorId: string;
}

export const VendorFinancialData = ({ vendorId }: VendorFinancialDataProps) => {
  const { showSuccess, showError } = useNotification();
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [banksList, setBanksList] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    payment_method: 'bank_transfer' as 'bank_transfer' | 'cash' | 'other',
    price_includes_tax: false,
    bank_name: '',
    beneficiary_name: '',
    iban: '',
    account_number: '',
  });

  useEffect(() => {
    fetchFinancialData();
    fetchBanks();
  }, [vendorId]);

  const fetchBanks = async () => {
    try {
      const { data } = await supabase
        .from('banks')
        .select('name_ar')
        .eq('is_active', true)
        .order('name_ar');
      if (data) setBanksList(data.map(b => b.name_ar));
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  };

  const fetchFinancialData = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_financial_data')
        .select('*')
        .eq('vendor_id', vendorId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFinancialData(data);
        setFormData({
          payment_method: data.payment_method,
          price_includes_tax: data.price_includes_tax,
          bank_name: data.bank_name || '',
          beneficiary_name: data.beneficiary_name || '',
          iban: data.iban || '',
          account_number: data.account_number || '',
        });
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const saveData = {
        payment_method: formData.payment_method,
        price_includes_tax: formData.price_includes_tax,
        bank_name: formData.bank_name.trim() || null,
        beneficiary_name: formData.beneficiary_name.trim() || null,
        iban: formData.iban.trim() || null,
        account_number: formData.account_number.trim() || null,
      };

      if (financialData) {
        const { error } = await supabase
          .from('vendor_financial_data')
          .update({
            ...saveData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', financialData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendor_financial_data')
          .insert([
            {
              vendor_id: vendorId,
              ...saveData,
            },
          ]);

        if (error) throw error;
      }

      setIsEditing(false);
      fetchFinancialData();
      showSuccess('تم حفظ البيانات المالية بنجاح');
    } catch (error) {
      console.error('Error saving financial data:', error);
      showError('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleCancel = () => {
    if (financialData) {
      setFormData({
        payment_method: financialData.payment_method,
        price_includes_tax: financialData.price_includes_tax,
        bank_name: financialData.bank_name || '',
        beneficiary_name: financialData.beneficiary_name || '',
        iban: financialData.iban || '',
        account_number: financialData.account_number || '',
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return <div className="dash-empty" style={{ height: 256 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>البيانات المالية</h2>
        {!isEditing && (
          <button className="btn btn-primary btn-sm" onClick={() => setIsEditing(true)} style={{ gap: 6 }}>
            <Edit2 size={13} />
            {financialData ? 'تعديل' : 'إضافة'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="card" style={{ cursor: 'default' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="input-group">
              <label className="input-label">طريقة الدفع</label>
              <select
                className="input"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                dir="rtl"
              >
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="cash">نقدي</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  className="tbl-check"
                  checked={formData.price_includes_tax}
                  onChange={(e) => setFormData({ ...formData, price_includes_tax: e.target.checked })}
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>السعر يشمل الضريبة</span>
              </label>
            </div>
          </div>

          {formData.payment_method === 'bank_transfer' && (
            <div style={{ borderTop: '1px solid var(--border-soft)', marginTop: 20, paddingTop: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>البيانات البنكية</h3>
              <div className="form-grid">
                <div className="input-group">
                  <label className="input-label">اسم البنك</label>
                  <select
                    className="input"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    dir="rtl"
                  >
                    <option value="">اختر بنك</option>
                    {banksList.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">اسم المستفيد</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.beneficiary_name}
                    onChange={(e) => setFormData({ ...formData, beneficiary_name: e.target.value })}
                    dir="rtl"
                    placeholder="الاسم كما يظهر في الحساب البنكي"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">رقم الآيبان (IBAN)</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.iban}
                    onChange={(e) => setFormData({ ...formData, iban: toEnglishNumbers(e.target.value).toUpperCase() })}
                    dir="ltr"
                    placeholder="SA00 0000 0000 0000 0000 0000"
                    maxLength={29}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">رقم الحساب (اختياري)</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: toEnglishNumbers(e.target.value) })}
                    dir="ltr"
                    placeholder="رقم الحساب"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
              إلغاء
            </button>
            <button className="btn btn-sm" onClick={handleSave} style={{ background: 'var(--success)', color: '#fff', gap: 6 }}>
              <Save size={14} />
              حفظ
            </button>
          </div>
        </div>
      ) : financialData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ cursor: 'default' }}>
            <div className="form-grid">
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>طريقة الدفع</p>
                <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {financialData.payment_method === 'bank_transfer' && 'تحويل بنكي'}
                  {financialData.payment_method === 'cash' && 'نقدي'}
                  {financialData.payment_method === 'other' && 'أخرى'}
                </p>
              </div>

              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>السعر</p>
                <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {financialData.price_includes_tax ? 'يشمل الضريبة' : 'لا يشمل الضريبة'}
                </p>
              </div>
            </div>
          </div>

          {financialData.payment_method === 'bank_transfer' && (
            <div className="card" style={{ cursor: 'default' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>البيانات البنكية</h3>

              <div className="form-grid">
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>اسم البنك</p>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{financialData.bank_name || '-'}</p>
                </div>

                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>اسم المستفيد</p>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{financialData.beneficiary_name || '-'}</p>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>رقم الآيبان (IBAN)</p>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'monospace' }} dir="ltr">
                    {financialData.iban || '-'}
                  </p>
                </div>

                {financialData.account_number && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>رقم الحساب</p>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'monospace' }} dir="ltr">
                      {financialData.account_number}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>لم يتم إضافة البيانات المالية بعد</p>
          <button className="btn btn-primary btn-sm" onClick={() => setIsEditing(true)}>
            إضافة البيانات المالية
          </button>
        </div>
      )}
    </div>
  );
};
