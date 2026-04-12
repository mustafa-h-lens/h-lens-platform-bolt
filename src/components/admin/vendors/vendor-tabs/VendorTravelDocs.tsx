import { useState, useEffect, useRef } from 'react';
import { Plus, Save, Edit2, Trash2, Upload, FileText } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { toEnglishNumbers } from '../../../../lib/numberUtils';
import { useNotification } from '../../../../contexts/NotificationContext';

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

interface UploadedTravelFile {
  id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

const TRAVEL_DOC_TYPES = ['passport', 'visa', 'travel', 'visa_usa', 'visa_uk', 'visa_schengen', 'visa_japan'];

const getTravelDocLabel = (type: string): string => {
  const labels: Record<string, string> = {
    passport: 'جواز السفر',
    visa: 'تأشيرة',
    travel: 'وثيقة سفر',
    visa_usa: 'تأشيرة أمريكا',
    visa_uk: 'تأشيرة بريطانيا',
    visa_schengen: 'تأشيرة شنغن',
    visa_japan: 'تأشيرة اليابان',
  };
  return labels[type] || type;
};

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

  const [uploadedTravelFiles, setUploadedTravelFiles] = useState<UploadedTravelFile[]>([]);
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
      const [travelResult, docsResult] = await Promise.all([
        supabase
          .from('vendor_travel_documents')
          .select('*')
          .eq('vendor_id', vendorId),
        supabase
          .from('vendor_documents')
          .select('id, document_type, file_url, file_name, created_at')
          .eq('vendor_id', vendorId)
          .in('document_type', TRAVEL_DOC_TYPES)
          .order('created_at', { ascending: false }),
      ]);

      if (travelResult.error) throw travelResult.error;

      const data = travelResult.data;
      const passport = data?.find(doc => doc.document_type === 'passport');
      const visas = data?.filter(doc => doc.document_type === 'visa') || [];

      setPassportDoc(passport || null);
      setVisaDocs(visas);
      setUploadedTravelFiles(docsResult.data || []);

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
        return <span className="badge badge-green">سارية</span>;
      case 'expired':
        return <span className="badge badge-red">منتهية</span>;
      case 'expiring_soon':
        return <span className="badge badge-amber">تنتهي قريباً</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="dash-empty" style={{ height: 256 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>جاري التحميل...</span></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Passport Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>جواز السفر</h3>
          {!editingPassport && (
            <button className="btn btn-primary btn-sm" onClick={() => setEditingPassport(true)} style={{ gap: 6 }}>
              <Edit2 size={13} />
              {passportDoc ? 'تعديل' : 'إضافة'}
            </button>
          )}
        </div>

        {editingPassport ? (
          <div className="card" style={{ cursor: 'default' }}>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">رقم الجواز</label>
                <input
                  type="text"
                  className="input"
                  value={passportForm.passport_number}
                  onChange={(e) => setPassportForm({ ...passportForm, passport_number: toEnglishNumbers(e.target.value) })}
                  dir="ltr"
                />
              </div>

              <div className="input-group">
                <label className="input-label">دولة الإصدار</label>
                <select
                  className="input"
                  value={passportForm.passport_issuing_country}
                  onChange={(e) => setPassportForm({ ...passportForm, passport_issuing_country: e.target.value })}
                  dir="rtl"
                >
                  <option value="">اختر دولة</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">تاريخ الإصدار</label>
                <input
                  type="date"
                  className="input"
                  value={passportForm.passport_issue_date}
                  onChange={(e) => setPassportForm({ ...passportForm, passport_issue_date: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">تاريخ الانتهاء</label>
                <input
                  type="date"
                  className="input"
                  value={passportForm.passport_expiry_date}
                  onChange={(e) => setPassportForm({ ...passportForm, passport_expiry_date: e.target.value })}
                />
              </div>

              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label className="input-label">رفع ملف الجواز</label>
                <input
                  ref={passportFileRef}
                  type="file"
                  style={{ display: 'none' }}
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
                  className="btn btn-secondary btn-sm"
                  onClick={() => passportFileRef.current?.click()}
                  disabled={uploadingPassport}
                  style={{ gap: 6 }}
                >
                  <Upload size={14} />
                  {uploadingPassport ? 'جاري الرفع...' : 'اختيار ملف'}
                </button>
                {passportForm.passport_file && (
                  <span style={{ fontSize: 12, color: 'var(--success-text)', marginTop: 8 }}>تم رفع الملف بنجاح</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingPassport(false)}>
                إلغاء
              </button>
              <button className="btn btn-sm" onClick={savePassport} style={{ background: 'var(--success)', color: '#fff', gap: 6 }}>
                <Save size={14} />
                حفظ
              </button>
            </div>
          </div>
        ) : passportDoc ? (
          <div className="card" style={{ cursor: 'default' }}>
            <div className="form-grid">
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>رقم الجواز</p>
                <p style={{ color: 'var(--text-primary)', fontWeight: 500 }} dir="ltr">{passportDoc.passport_number || '-'}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>دولة الإصدار</p>
                <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{passportDoc.passport_issuing_country || '-'}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>تاريخ الإصدار</p>
                <p style={{ color: 'var(--text-primary)', fontWeight: 500 }} dir="ltr">{passportDoc.passport_issue_date || '-'}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>تاريخ الانتهاء</p>
                <p style={{ color: 'var(--text-primary)', fontWeight: 500 }} dir="ltr">{passportDoc.passport_expiry_date || '-'}</p>
              </div>
              {passportDoc.passport_file && (
                <div style={{ gridColumn: 'span 2' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>الملف المرفق</p>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => window.open(passportDoc.passport_file, '_blank')}
                    style={{ gap: 6, color: 'var(--accent-lighter)' }}
                  >
                    <FileText size={14} />
                    عرض الملف
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 32 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>لم يتم إضافة بيانات جواز السفر بعد</p>
          </div>
        )}
      </div>

      {/* Visa Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>الفيزا</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setAddingVisa(true)} style={{ gap: 6 }}>
            <Plus size={13} />
            إضافة فيزا
          </button>
        </div>

        {addingVisa && (
          <div className="card" style={{ cursor: 'default' }}>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">الدولة <span className="req">*</span></label>
                <select
                  className="input"
                  value={visaForm.visa_country}
                  onChange={(e) => setVisaForm({ ...visaForm, visa_country: e.target.value })}
                  dir="rtl"
                  required
                >
                  <option value="">اختر دولة</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">نوع الفيزا</label>
                <input
                  type="text"
                  className="input"
                  value={visaForm.visa_type}
                  onChange={(e) => setVisaForm({ ...visaForm, visa_type: e.target.value })}
                  dir="rtl"
                  placeholder="مثال: سياحية، عمل، دراسة"
                />
              </div>

              <div className="input-group">
                <label className="input-label">تاريخ البداية</label>
                <input
                  type="date"
                  className="input"
                  value={visaForm.visa_start_date}
                  onChange={(e) => setVisaForm({ ...visaForm, visa_start_date: e.target.value })}
                  dir="ltr"
                />
              </div>

              <div className="input-group">
                <label className="input-label">تاريخ الانتهاء <span className="req">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={visaForm.visa_expiry_date}
                  onChange={(e) => setVisaForm({ ...visaForm, visa_expiry_date: e.target.value })}
                  dir="ltr"
                  required
                />
              </div>

              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label className="input-label">رفع إثبات الفيزا</label>
                <input
                  ref={visaFileRef}
                  type="file"
                  style={{ display: 'none' }}
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
                  className="btn btn-secondary btn-sm"
                  onClick={() => visaFileRef.current?.click()}
                  disabled={uploadingVisa}
                  style={{ gap: 6 }}
                >
                  <Upload size={14} />
                  {uploadingVisa ? 'جاري الرفع...' : 'اختيار ملف'}
                </button>
                {visaForm.visa_file && (
                  <span style={{ fontSize: 12, color: 'var(--success-text)', marginTop: 8 }}>تم رفع الملف بنجاح</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-secondary btn-sm"
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
              >
                إلغاء
              </button>
              <button
                className="btn btn-sm"
                onClick={saveVisa}
                disabled={!visaForm.visa_country || !visaForm.visa_expiry_date}
                style={{ background: 'var(--success)', color: '#fff', gap: 6 }}
              >
                <Save size={14} />
                حفظ
              </button>
            </div>
          </div>
        )}

        {visaDocs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visaDocs.map((visa) => (
              <div key={visa.id} className="card" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{visa.visa_country}</h4>
                    {visa.visa_type && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{visa.visa_type}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {getVisaStatusBadge(visa.visa_status)}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteVisa(visa.id)}
                      style={{ color: 'var(--danger-text)', padding: 6 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>تاريخ البداية</p>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 500 }} dir="ltr">{visa.visa_start_date || '-'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>تاريخ الانتهاء</p>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 500 }} dir="ltr">{visa.visa_expiry_date || '-'}</p>
                  </div>
                  {visa.visa_file && (
                    <div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>الملف المرفق</p>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => window.open(visa.visa_file, '_blank')}
                        style={{ gap: 6, color: 'var(--accent-lighter)', fontSize: 12 }}
                      >
                        <FileText size={14} />
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
            <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 32 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>لم يتم إضافة فيزا بعد</p>
            </div>
          )
        )}
      </div>

      {/* Uploaded Travel Files from vendor_documents */}
      {uploadedTravelFiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>ملفات السفر المرفوعة</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {uploadedTravelFiles.map((doc) => (
              <div key={doc.id} className="card" style={{ cursor: 'default', padding: 12 }}>
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  {getTravelDocLabel(doc.document_type)}
                </p>
                {doc.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img
                    src={doc.file_url}
                    alt={doc.file_name}
                    className="w-full h-32 object-cover rounded-lg border cursor-pointer"
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => window.open(doc.file_url, '_blank')}
                  />
                ) : (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm underline" style={{ color: 'var(--accent-lighter)' }}>
                    <FileText size={14} /> {doc.file_name}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
