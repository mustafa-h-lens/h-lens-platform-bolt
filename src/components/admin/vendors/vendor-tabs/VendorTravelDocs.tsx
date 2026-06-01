import { useState, useEffect } from 'react';
import { Plus, Save, Edit2, Trash2, FileText } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { SignedImage } from '../../../shared/SignedImage';
import { openSignedUrl } from '../../../../lib/storage';
import { toEnglishNumbers } from '../../../../lib/numberUtils';
import { useNotification } from '../../../../contexts/NotificationContext';
import { DatePicker } from '../../../ui/DatePicker';
import { FileUploader } from '../../../ui/FileUploader';

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

const PASSPORT_COUNTRIES = [
  'السعودية', 'الإمارات', 'الكويت', 'قطر', 'البحرين', 'عمان', 'مصر', 'الأردن',
  'لبنان', 'سوريا', 'العراق', 'اليمن', 'ليبيا', 'تونس', 'الجزائر', 'المغرب',
  'السودان', 'فلسطين', 'الصومال', 'جيبوتي', 'موريتانيا', 'جزر القمر',
];
const VISA_COUNTRIES = ['USA', 'Schengen', 'Japan', 'UK'];

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

  const handleFileUpload = async (
    file: File,
    folder: string,
    onSuccess: (url: string) => void,
    setUploading: (v: boolean) => void,
  ) => {
    setUploading(true);
    try {
      // Sanitize storage key — Supabase rejects non-ASCII, spaces, parens
      const lastDot = file.name.lastIndexOf('.');
      const ext = lastDot > -1 ? file.name.substring(lastDot) : '';
      const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
      const rand = Math.random().toString(36).substring(2, 10);
      const filePath = `vendors/${vendorId}/${folder}/${Date.now()}_${rand}${safeExt}`;
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
      if (docsResult.error) console.error('Error fetching vendor_documents:', docsResult.error);

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
                  {PASSPORT_COUNTRIES.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <DatePicker
                label="تاريخ الإصدار"
                value={passportForm.passport_issue_date}
                onChange={(date) => setPassportForm({ ...passportForm, passport_issue_date: date })}
              />

              <DatePicker
                label="تاريخ الانتهاء"
                value={passportForm.passport_expiry_date}
                onChange={(date) => setPassportForm({ ...passportForm, passport_expiry_date: date })}
              />

              <div style={{ gridColumn: 'span 2' }}>
                <FileUploader
                  label="رفع ملف الجواز"
                  value={passportForm.passport_file}
                  onChange={(url) => setPassportForm({ ...passportForm, passport_file: url })}
                  onFile={(file) => handleFileUpload(file, 'passport', (url) => {
                    setPassportForm({ ...passportForm, passport_file: url });
                  }, setUploadingPassport)}
                  accept="image/jpeg,image/png,image/webp"
                  preview="image"
                  uploading={uploadingPassport}
                />
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
              {(passportDoc.passport_file || uploadedTravelFiles.filter(f => f.document_type === 'passport').length > 0) && (
                <div style={{ gridColumn: 'span 2' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>الملفات المرفقة</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {passportDoc.passport_file && (
                      <div style={{ width: 140 }}>
                        {passportDoc.passport_file.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <SignedImage src={passportDoc.passport_file} alt="جواز السفر" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'pointer' }} onClick={() => openSignedUrl(passportDoc.passport_file)} />
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => openSignedUrl(passportDoc.passport_file)} style={{ gap: 4, color: 'var(--accent-lighter)', fontSize: 12 }}><FileText size={14} /> عرض الملف</button>
                        )}
                      </div>
                    )}
                    {uploadedTravelFiles.filter(f => f.document_type === 'passport').map(doc => (
                      <div key={doc.id} style={{ width: 140 }}>
                        {doc.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <SignedImage src={doc.file_url} alt={doc.file_name} style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'pointer' }} onClick={() => openSignedUrl(doc.file_url)} />
                        ) : (
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ gap: 4, color: 'var(--accent-lighter)', fontSize: 12 }}><FileText size={14} /> {doc.file_name}</a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card" style={{ cursor: 'default', padding: uploadedTravelFiles.filter(f => f.document_type === 'passport').length > 0 ? 16 : 32, textAlign: uploadedTravelFiles.filter(f => f.document_type === 'passport').length > 0 ? 'right' : 'center' }}>
            {uploadedTravelFiles.filter(f => f.document_type === 'passport').length > 0 ? (
              <>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>الملفات المرفقة</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {uploadedTravelFiles.filter(f => f.document_type === 'passport').map(doc => (
                    <div key={doc.id} style={{ width: 140 }}>
                      {doc.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <SignedImage src={doc.file_url} alt={doc.file_name} style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'pointer' }} onClick={() => openSignedUrl(doc.file_url)} />
                      ) : (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ gap: 4, color: 'var(--accent-lighter)', fontSize: 12 }}><FileText size={14} /> {doc.file_name}</a>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>لم يتم إضافة بيانات جواز السفر بعد</p>
            )}
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
                  {VISA_COUNTRIES.map((country) => (
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

              <DatePicker
                label="تاريخ البداية"
                value={visaForm.visa_start_date}
                onChange={(date) => setVisaForm({ ...visaForm, visa_start_date: date })}
              />

              <DatePicker
                label="تاريخ الانتهاء"
                required
                value={visaForm.visa_expiry_date}
                onChange={(date) => setVisaForm({ ...visaForm, visa_expiry_date: date })}
              />

              <div style={{ gridColumn: 'span 2' }}>
                <FileUploader
                  label="رفع إثبات الفيزا"
                  value={visaForm.visa_file}
                  onChange={(url) => setVisaForm({ ...visaForm, visa_file: url })}
                  onFile={(file) => handleFileUpload(file, 'visa', (url) => {
                    setVisaForm({ ...visaForm, visa_file: url });
                  }, setUploadingVisa)}
                  accept="image/jpeg,image/png,image/webp"
                  preview="image"
                  uploading={uploadingVisa}
                />
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

                <div className="form-grid">
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>تاريخ البداية</p>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 500 }} dir="ltr">{visa.visa_start_date || '-'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>تاريخ الانتهاء</p>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 500 }} dir="ltr">{visa.visa_expiry_date || '-'}</p>
                  </div>
                  {visa.visa_file && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>الملفات المرفقة</p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ width: 140 }}>
                          {visa.visa_file.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <SignedImage src={visa.visa_file} alt={visa.visa_country} style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'pointer' }} onClick={() => openSignedUrl(visa.visa_file)} />
                          ) : (
                            <button className="btn btn-ghost btn-sm" onClick={() => openSignedUrl(visa.visa_file)} style={{ gap: 4, color: 'var(--accent-lighter)', fontSize: 12 }}><FileText size={14} /> عرض الملف</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !addingVisa && uploadedTravelFiles.filter(f => f.document_type !== 'passport').length === 0 && (
            <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 32 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>لم يتم إضافة فيزا بعد</p>
            </div>
          )
        )}

        {/* Visa files uploaded by vendor */}
        {uploadedTravelFiles.filter(f => f.document_type !== 'passport').length > 0 && (
          <div className="card" style={{ cursor: 'default', padding: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>ملفات تأشيرات مرفوعة من المورد</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {uploadedTravelFiles.filter(f => f.document_type !== 'passport').map(doc => (
                <div key={doc.id} style={{ width: 160, textAlign: 'center' }}>
                  {doc.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <SignedImage src={doc.file_url} alt={doc.file_name} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'pointer', marginBottom: 4 }} onClick={() => openSignedUrl(doc.file_url)} />
                  ) : (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ gap: 4, color: 'var(--accent-lighter)', fontSize: 12 }}><FileText size={14} /> {doc.file_name}</a>
                  )}
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{getTravelDocLabel(doc.document_type)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
