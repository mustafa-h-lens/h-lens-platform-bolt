import { useState, useEffect, useRef } from 'react';
import { Plus, Save, Edit2, Trash2, Upload, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import { useNotification } from '../../../contexts/NotificationContext';

interface TravelDocument {
  id: string;
  vendor_id: string;
  document_type: 'passport' | 'visa';
  passport_number?: string;
  passport_issuing_country?: string;
  passport_issue_date?: string;
  passport_expiry_date?: string;
  passport_file?: string;
  visa_country?: string;
  visa_type?: string;
  visa_start_date?: string;
  visa_expiry_date?: string;
  visa_file?: string;
  visa_status?: string;
  created_at: string;
  updated_at: string;
}

interface VendorTravelDocsProps {
  vendorId: string;
}

const COUNTRIES = [
  'السعودية', 'الإمارات', 'الكويت', 'قطر', 'البحرين', 'عمان', 'مصر', 'الأردن',
  'لبنان', 'سوريا', 'العراق', 'اليمن', 'ليبيا', 'تونس', 'الجزائر', 'المغرب',
  'السودان', 'فلسطين', 'الصومال', 'جيبوتي', 'موريتانيا', 'جزر القمر',
  'الولايات المتحدة', 'المملكة المتحدة', 'كندا', 'أستراليا', 'فرنسا', 'ألمانيا',
  'إيطاليا', 'إسبانيا', 'الهند', 'الصين', 'اليابان', 'كوريا الجنوبية'
];

export const VendorTravelDocs = ({ vendorId }: VendorTravelDocsProps) => {
  const { showSuccess, showError, confirm } = useNotification();
  const [passportDoc, setPassportDoc] = useState<TravelDocument | null>(null);
  const [visaDocs, setVisaDocs] = useState<TravelDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPassport, setEditingPassport] = useState(false);
  const [editingVisa, setEditingVisa] = useState<string | null>(null);
  const [addingVisa, setAddingVisa] = useState(false);

  const [passportForm, setPassportForm] = useState({
    passport_number: '',
    passport_issuing_country: '',
    passport_issue_date: '',
    passport_expiry_date: '',
    passport_file: '',
  });

  const [visaForm, setVisaForm] = useState({
    visa_country: '',
    visa_type: '',
    visa_start_date: '',
    visa_expiry_date: '',
    visa_file: '',
  });

  const [uploadingPassport, setUploadingPassport] = useState(false);
  const [uploadingVisa, setUploadingVisa] = useState(false);
  const passportFileRef = useRef<HTMLInputElement>(null);
  const visaFileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    file: File,
    folder: string,
    onSuccess: (url: string) => void,
    setUploading: (v: boolean) => void,
  ) => {
    setUploading(true);
    try {
      const filePath = `vendors/${vendorId}/${folder}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('vendor-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('vendor-images')
        .getPublicUrl(filePath);

      onSuccess(urlData.publicUrl);
      showSuccess('تم رفع الملف بنجاح');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      showError(error.message || 'حدث خطأ أثناء رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [vendorId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_travel_documents')
        .select('*')
        .eq('vendor_id', vendorId);

      if (error) throw error;

      const passport = data?.find(doc => doc.document_type === 'passport');
      const visas = data?.filter(doc => doc.document_type === 'visa') || [];

      setPassportDoc(passport || null);
      setVisaDocs(visas);

      if (passport) {
        setPassportForm({
          passport_number: passport.passport_number || '',
          passport_issuing_country: passport.passport_issuing_country || '',
          passport_issue_date: passport.passport_issue_date || '',
          passport_expiry_date: passport.passport_expiry_date || '',
          passport_file: passport.passport_file || '',
        });
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateVisaStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring_soon';
    return 'valid';
  };

  const savePassport = async () => {
    try {
      const saveData = {
        passport_number: passportForm.passport_number.trim() || null,
        passport_issuing_country: passportForm.passport_issuing_country.trim() || null,
        passport_issue_date: passportForm.passport_issue_date || null,
        passport_expiry_date: passportForm.passport_expiry_date || null,
        passport_file: passportForm.passport_file.trim() || null,
      };

      if (passportDoc) {
        const { error } = await supabase
          .from('vendor_travel_documents')
          .update({
            ...saveData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', passportDoc.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendor_travel_documents')
          .insert([
            {
              vendor_id: vendorId,
              document_type: 'passport',
              ...saveData,
            },
          ]);

        if (error) throw error;
      }

      setEditingPassport(false);
      fetchDocuments();
      showSuccess('تم حفظ بيانات الجواز بنجاح');
    } catch (error) {
      console.error('Error saving passport:', error);
      showError('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const saveVisa = async () => {
    if (!visaForm.visa_country.trim() || !visaForm.visa_expiry_date) {
      showError('يرجى إدخال دولة التأشيرة وتاريخ الانتهاء');
      return;
    }

    try {
      const visaStatus = calculateVisaStatus(visaForm.visa_expiry_date);

      const insertData = {
        vendor_id: vendorId,
        document_type: 'visa' as const,
        visa_country: visaForm.visa_country.trim(),
        visa_type: visaForm.visa_type.trim() || null,
        visa_start_date: visaForm.visa_start_date || null,
        visa_expiry_date: visaForm.visa_expiry_date,
        visa_file: visaForm.visa_file.trim() || null,
        visa_status: visaStatus,
      };

      const { error } = await supabase
        .from('vendor_travel_documents')
        .insert([insertData]);

      if (error) throw error;

      setAddingVisa(false);
      setVisaForm({
        visa_country: '',
        visa_type: '',
        visa_start_date: '',
        visa_expiry_date: '',
        visa_file: '',
      });
      fetchDocuments();
      showSuccess('تم إضافة التأشيرة بنجاح');
    } catch (error) {
      console.error('Error saving visa:', error);
      showError('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const deleteVisa = async (visaId: string) => {
    const confirmed = await confirm({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف هذه التأشيرة؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('vendor_travel_documents')
        .delete()
        .eq('id', visaId);

      if (error) throw error;
      showSuccess('تم حذف التأشيرة بنجاح');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting visa:', error);
      showError('حدث خطأ أثناء حذف التأشيرة');
    }
  };

  const getVisaStatusBadge = (status?: string) => {
    switch (status) {
      case 'valid':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">سارية</span>;
      case 'expired':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">منتهية</span>;
      case 'expiring_soon':
        return <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">تنتهي قريباً</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">جواز السفر</h3>
          {!editingPassport && (
            <button
              onClick={() => setEditingPassport(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              {passportDoc ? 'تعديل' : 'إضافة'}
            </button>
          )}
        </div>

        {editingPassport ? (
          <div className="bg-slate-50 rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  رقم الجواز
                </label>
                <input
                  type="text"
                  value={passportForm.passport_number}
                  onChange={(e) => setPassportForm({ ...passportForm, passport_number: toEnglishNumbers(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  دولة الإصدار
                </label>
                <select
                  value={passportForm.passport_issuing_country}
                  onChange={(e) => setPassportForm({ ...passportForm, passport_issuing_country: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="rtl"
                >
                  <option value="">اختر دولة</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  تاريخ الإصدار
                </label>
                <input
                  type="date"
                  value={passportForm.passport_issue_date}
                  onChange={(e) => setPassportForm({ ...passportForm, passport_issue_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  تاريخ الانتهاء
                </label>
                <input
                  type="date"
                  value={passportForm.passport_expiry_date}
                  onChange={(e) => setPassportForm({ ...passportForm, passport_expiry_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  رفع ملف الجواز
                </label>
                <input
                  ref={passportFileRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file, 'passport', (url) => {
                        setPassportForm({ ...passportForm, passport_file: url });
                      }, setUploadingPassport);
                    }
                    if (passportFileRef.current) passportFileRef.current.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => passportFileRef.current?.click()}
                  disabled={uploadingPassport}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingPassport ? 'جاري الرفع...' : 'اختيار ملف'}
                </button>
                {passportForm.passport_file && (
                  <p className="text-xs text-green-600 mt-2">تم رفع الملف بنجاح</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditingPassport(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={savePassport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                حفظ
              </button>
            </div>
          </div>
        ) : passportDoc ? (
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">رقم الجواز</p>
                <p className="text-slate-900 font-medium" dir="ltr">{passportDoc.passport_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">دولة الإصدار</p>
                <p className="text-slate-900 font-medium">{passportDoc.passport_issuing_country || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">تاريخ الإصدار</p>
                <p className="text-slate-900 font-medium" dir="ltr">{passportDoc.passport_issue_date || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">تاريخ الانتهاء</p>
                <p className="text-slate-900 font-medium" dir="ltr">{passportDoc.passport_expiry_date || '-'}</p>
              </div>
              {passportDoc.passport_file && (
                <div className="md:col-span-2">
                  <p className="text-sm text-slate-600 mb-2">الملف المرفق</p>
                  <button
                    onClick={() => window.open(passportDoc.passport_file, '_blank')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    عرض الملف
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg p-8 text-center">
            <p className="text-slate-600">لم يتم إضافة بيانات جواز السفر بعد</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">الفيزا</h3>
          <button
            onClick={() => setAddingVisa(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة فيزا
          </button>
        </div>

        {addingVisa && (
          <div className="bg-slate-50 rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  الدولة <span className="text-red-500">*</span>
                </label>
                <select
                  value={visaForm.visa_country}
                  onChange={(e) => setVisaForm({ ...visaForm, visa_country: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="rtl"
                  required
                >
                  <option value="">اختر دولة</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  نوع الفيزا
                </label>
                <input
                  type="text"
                  value={visaForm.visa_type}
                  onChange={(e) => setVisaForm({ ...visaForm, visa_type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="rtl"
                  placeholder="مثال: سياحية، عمل، دراسة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  تاريخ البداية
                </label>
                <input
                  type="date"
                  value={visaForm.visa_start_date}
                  onChange={(e) => setVisaForm({ ...visaForm, visa_start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  تاريخ الانتهاء <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={visaForm.visa_expiry_date}
                  onChange={(e) => setVisaForm({ ...visaForm, visa_expiry_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="ltr"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  رفع إثبات الفيزا
                </label>
                <input
                  ref={visaFileRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file, 'visa', (url) => {
                        setVisaForm({ ...visaForm, visa_file: url });
                      }, setUploadingVisa);
                    }
                    if (visaFileRef.current) visaFileRef.current.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => visaFileRef.current?.click()}
                  disabled={uploadingVisa}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingVisa ? 'جاري الرفع...' : 'اختيار ملف'}
                </button>
                {visaForm.visa_file && (
                  <p className="text-xs text-green-600 mt-2">تم رفع الملف بنجاح</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAddingVisa(false);
                  setVisaForm({
                    visa_country: '',
                    visa_type: '',
                    visa_start_date: '',
                    visa_expiry_date: '',
                    visa_file: '',
                  });
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={saveVisa}
                disabled={!visaForm.visa_country || !visaForm.visa_expiry_date}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                حفظ
              </button>
            </div>
          </div>
        )}

        {visaDocs.length > 0 ? (
          <div className="space-y-3">
            {visaDocs.map((visa) => (
              <div key={visa.id} className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">{visa.visa_country}</h4>
                    {visa.visa_type && (
                      <p className="text-sm text-slate-600">{visa.visa_type}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getVisaStatusBadge(visa.visa_status)}
                    <button
                      onClick={() => deleteVisa(visa.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">تاريخ البداية</p>
                    <p className="text-slate-900 font-medium" dir="ltr">{visa.visa_start_date || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">تاريخ الانتهاء</p>
                    <p className="text-slate-900 font-medium" dir="ltr">{visa.visa_expiry_date || '-'}</p>
                  </div>
                  {visa.visa_file && (
                    <div>
                      <p className="text-sm text-slate-600 mb-2">الملف المرفق</p>
                      <button
                        onClick={() => window.open(visa.visa_file, '_blank')}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        عرض
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !addingVisa && (
            <div className="bg-slate-50 rounded-lg p-8 text-center">
              <p className="text-slate-600">لم يتم إضافة فيزا بعد</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};
