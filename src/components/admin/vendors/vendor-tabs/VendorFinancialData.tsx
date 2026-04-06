import { useState, useEffect } from 'react';
import { Save, Pencil } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { toEnglishNumbers } from '../../../../lib/numberUtils';
import { useNotification } from '../../../../contexts/NotificationContext';

interface Bank {
  id: string;
  name_ar: string;
  name_en: string | null;
}

interface VendorFinancialDataProps {
  vendorId: string;
}

export const VendorFinancialData = ({ vendorId }: VendorFinancialDataProps) => {
  const { showSuccess, showError } = useNotification();
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);

  const [formData, setFormData] = useState({
    payment_method: 'bank_transfer' as 'bank_transfer' | 'cash' | 'other',
    price_includes_tax: false,
    bank_id: '',
    account_name: '',
    iban: '',
    company_name: '',
    vat_number: '',
  });

  useEffect(() => {
    fetchFinancialData();
    fetchBanks();
  }, [vendorId]);

  const fetchBanks = async () => {
    try {
      const { data } = await supabase
        .from('banks')
        .select('id, name_ar, name_en')
        .eq('is_active', true)
        .order('name_ar');
      if (data) setBanks(data);
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  };

  const fetchFinancialData = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_financial_data')
        .select('*, banks:bank_id(name_ar, name_en)')
        .eq('vendor_id', vendorId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRawData(data);
        // Handle both old (bank_name) and new (bank_id) column formats
        const bankId = data.bank_id || '';
        const accountName = data.account_name || data.beneficiary_name || '';
        setFormData({
          payment_method: data.payment_method || 'bank_transfer',
          price_includes_tax: data.price_includes_tax || false,
          bank_id: bankId,
          account_name: accountName,
          iban: data.iban || '',
          company_name: data.company_name || '',
          vat_number: data.vat_number || '',
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
        bank_id: formData.bank_id || null,
        account_name: formData.account_name.trim() || null,
        iban: formData.iban.trim() || null,
        company_name: formData.price_includes_tax ? (formData.company_name.trim() || null) : null,
        vat_number: formData.price_includes_tax ? (formData.vat_number.trim() || null) : null,
        // Also update old columns for backward compatibility
        bank_name: formData.bank_id ? (banks.find(b => b.id === formData.bank_id)?.name_ar || null) : null,
        beneficiary_name: formData.account_name.trim() || null,
      };

      if (rawData?.id) {
        const { error } = await supabase
          .from('vendor_financial_data')
          .update({ ...saveData, updated_at: new Date().toISOString() })
          .eq('id', rawData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendor_financial_data')
          .insert([{ vendor_id: vendorId, ...saveData }]);
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
    if (rawData) {
      setFormData({
        payment_method: rawData.payment_method || 'bank_transfer',
        price_includes_tax: rawData.price_includes_tax || false,
        bank_id: rawData.bank_id || '',
        account_name: rawData.account_name || rawData.beneficiary_name || '',
        iban: rawData.iban || '',
        company_name: rawData.company_name || '',
        vat_number: rawData.vat_number || '',
      });
    }
    setIsEditing(false);
  };

  // Resolve display bank name from bank_id or old bank_name column
  const displayBankName = rawData?.banks?.name_ar || rawData?.bank_name || '-';
  const displayAccountName = rawData?.account_name || rawData?.beneficiary_name || '-';

  if (loading) {
    return <div className="dash-empty" style={{ height: 256 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>البيانات المالية</h2>
        {!isEditing && (
          <button className="btn btn-primary btn-sm" onClick={() => setIsEditing(true)} style={{ gap: 6 }}>
            <Pencil size={13} />
            {rawData ? 'تعديل' : 'إضافة'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="card" style={{ cursor: 'default' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-grid">
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

              <div className="input-group" style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 24 }}>
                  <input
                    type="checkbox"
                    className="tbl-check"
                    checked={formData.price_includes_tax}
                    onChange={(e) => setFormData({ ...formData, price_includes_tax: e.target.checked })}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>الأسعار تشمل الضريبة</span>
                </label>
              </div>
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
                    value={formData.bank_id}
                    onChange={(e) => setFormData({ ...formData, bank_id: e.target.value })}
                    dir="rtl"
                  >
                    <option value="">اختر بنك</option>
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>{bank.name_ar}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">اسم صاحب الحساب</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                    dir="rtl"
                    placeholder="الاسم كما يظهر في الحساب البنكي"
                  />
                </div>

                <div className="input-group" style={{ gridColumn: 'span 2' }}>
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
              </div>
            </div>
          )}

          {formData.price_includes_tax && (
            <div style={{ borderTop: '1px solid var(--border-soft)', marginTop: 20, paddingTop: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>بيانات الضريبة</h3>
              <div className="form-grid">
                <div className="input-group">
                  <label className="input-label">اسم الشركة</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    dir="rtl"
                    placeholder="اسم الشركة المسجلة"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">الرقم الضريبي</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.vat_number}
                    onChange={(e) => setFormData({ ...formData, vat_number: toEnglishNumbers(e.target.value) })}
                    dir="ltr"
                    placeholder="15 رقم"
                    maxLength={15}
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
      ) : rawData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ cursor: 'default' }}>
            <div className="form-grid">
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>طريقة الدفع</p>
                <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {rawData.payment_method === 'bank_transfer' && 'تحويل بنكي'}
                  {rawData.payment_method === 'cash' && 'نقدي'}
                  {rawData.payment_method === 'other' && 'أخرى'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>الضريبة</p>
                <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {rawData.price_includes_tax ? 'الأسعار تشمل الضريبة' : 'لا تشمل الضريبة'}
                </p>
              </div>
            </div>
          </div>

          {rawData.payment_method === 'bank_transfer' && (
            <div className="card" style={{ cursor: 'default' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>البيانات البنكية</h3>
              <div className="form-grid">
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>اسم البنك</p>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{displayBankName}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>اسم صاحب الحساب</p>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{displayAccountName}</p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>رقم الآيبان (IBAN)</p>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'monospace' }} dir="ltr">
                    {rawData.iban || '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {rawData.price_includes_tax && (rawData.company_name || rawData.vat_number) && (
            <div className="card" style={{ cursor: 'default' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>بيانات الضريبة</h3>
              <div className="form-grid">
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>اسم الشركة</p>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{rawData.company_name || '-'}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>الرقم الضريبي</p>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'monospace' }} dir="ltr">{rawData.vat_number || '-'}</p>
                </div>
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
