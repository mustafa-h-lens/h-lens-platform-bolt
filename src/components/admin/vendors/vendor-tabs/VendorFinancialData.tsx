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

const SAUDI_BANKS = [
  'البنك الأهلي السعودي',
  'بنك الرياض',
  'بنك الراجحي',
  'بنك ساب',
  'البنك السعودي للاستثمار',
  'البنك السعودي الفرنسي',
  'البنك السعودي البريطاني (ساب)',
  'بنك البلاد',
  'بنك الجزيرة',
  'بنك الإنماء',
  'بنك سامبا',
  'البنك العربي الوطني',
  'مصرف الإنماء',
];

export const VendorFinancialData = ({ vendorId }: VendorFinancialDataProps) => {
  const { showSuccess, showError } = useNotification();
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

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
  }, [vendorId]);

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">البيانات المالية</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            {financialData ? 'تعديل' : 'إضافة'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-slate-50 rounded-lg p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                طريقة الدفع
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="rtl"
              >
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="cash">نقدي</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.price_includes_tax}
                  onChange={(e) => setFormData({ ...formData, price_includes_tax: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">السعر يشمل الضريبة</span>
              </label>
            </div>
          </div>

          {formData.payment_method === 'bank_transfer' && (
            <div className="space-y-4 pt-4 border-t border-slate-300">
              <h3 className="text-lg font-semibold text-slate-900">البيانات البنكية</h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  اسم البنك
                </label>
                <select
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="rtl"
                >
                  <option value="">اختر بنك</option>
                  {SAUDI_BANKS.map((bank) => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  اسم المستفيد
                </label>
                <input
                  type="text"
                  value={formData.beneficiary_name}
                  onChange={(e) => setFormData({ ...formData, beneficiary_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="rtl"
                  placeholder="الاسم كما يظهر في الحساب البنكي"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  رقم الآيبان (IBAN)
                </label>
                <input
                  type="text"
                  value={formData.iban}
                  onChange={(e) => setFormData({ ...formData, iban: toEnglishNumbers(e.target.value).toUpperCase() })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  dir="ltr"
                  placeholder="SA00 0000 0000 0000 0000 0000"
                  maxLength={29}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  رقم الحساب (اختياري)
                </label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: toEnglishNumbers(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  dir="ltr"
                  placeholder="Account Number"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              حفظ
            </button>
          </div>
        </div>
      ) : financialData ? (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-600 mb-1">طريقة الدفع</p>
                <p className="text-slate-900 font-medium">
                  {financialData.payment_method === 'bank_transfer' && 'تحويل بنكي'}
                  {financialData.payment_method === 'cash' && 'نقدي'}
                  {financialData.payment_method === 'other' && 'أخرى'}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">السعر</p>
                <p className="text-slate-900 font-medium">
                  {financialData.price_includes_tax ? 'يشمل الضريبة' : 'لا يشمل الضريبة'}
                </p>
              </div>
            </div>
          </div>

          {financialData.payment_method === 'bank_transfer' && (
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">البيانات البنكية</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-600 mb-1">اسم البنك</p>
                  <p className="text-slate-900 font-medium">{financialData.bank_name || '-'}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 mb-1">اسم المستفيد</p>
                  <p className="text-slate-900 font-medium">{financialData.beneficiary_name || '-'}</p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm text-slate-600 mb-1">رقم الآيبان (IBAN)</p>
                  <p className="text-slate-900 font-medium font-mono" dir="ltr">
                    {financialData.iban || '-'}
                  </p>
                </div>

                {financialData.account_number && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-600 mb-1">رقم الحساب</p>
                    <p className="text-slate-900 font-medium font-mono" dir="ltr">
                      {financialData.account_number}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-lg p-12 text-center">
          <p className="text-slate-600 mb-4">لم يتم إضافة البيانات المالية بعد</p>
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            إضافة البيانات المالية
          </button>
        </div>
      )}
    </div>
  );
};
