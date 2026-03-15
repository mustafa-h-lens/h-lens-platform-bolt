import { useState } from 'react';
import { VendorFormData, SelectedField } from '../VendorRegistrationForm';

interface Props {
  formData: VendorFormData;
  goToStep: (step: number) => void;
}

export const Step6Review = ({ formData, goToStep }: Props) => {
  const [termsAccepted, setTermsAccepted] = useState(false);

  const vendorTypeLabel = formData.vendor_type === 'individual' ? 'فرد' : formData.vendor_type === 'company' ? 'شركة' : '—';

  return (
    <>
      <h2 className="step-title">✅ المراجعة</h2>
      <p className="step-subtitle">راجع بياناتك قبل إرسال الطلب</p>
      <div className="form-section">
        {/* Identity */}
        <div className="review-section">
          <div className="review-card">
            <div className="review-card-hdr">
              <span className="review-card-title">👤 الهوية</span>
              <button className="review-card-edit" onClick={() => goToStep(1)} type="button">✏️ تعديل</button>
            </div>
            <div className="review-row">
              <span className="rv-label">الاسم</span>
              <span className="rv-value">{formData.full_name || '—'}</span>
            </div>
            <div className="review-row">
              <span className="rv-label">الجنسية</span>
              <span className="rv-value">{formData.nationality || '—'}</span>
            </div>
            <div className="review-row">
              <span className="rv-label">نوع المورد</span>
              <span className="rv-value">{vendorTypeLabel}</span>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="review-section">
          <div className="review-card">
            <div className="review-card-hdr">
              <span className="review-card-title">📞 التواصل</span>
              <button className="review-card-edit" onClick={() => goToStep(2)} type="button">✏️ تعديل</button>
            </div>
            <div className="review-row">
              <span className="rv-label">الجوال</span>
              <span className="rv-value" dir="ltr" style={{ fontFamily: 'var(--font-mono)' }}>
                {formData.country_code}{formData.phone || '—'}
              </span>
            </div>
            <div className="review-row">
              <span className="rv-label">المدينة</span>
              <span className="rv-value">{formData.primary_city || '—'}</span>
            </div>
            {formData.other_cities && formData.other_cities.length > 0 && (
              <div className="review-row">
                <span className="rv-label">مدن أخرى</span>
                <span className="rv-value">{formData.other_cities.join('، ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="review-section">
          <div className="review-card">
            <div className="review-card-hdr">
              <span className="review-card-title">🪪 المستندات</span>
              <button className="review-card-edit" onClick={() => goToStep(3)} type="button">✏️ تعديل</button>
            </div>
            <div className="review-row">
              <span className="rv-label">رقم الهوية</span>
              <span className="rv-value" dir="ltr" style={{ fontFamily: 'var(--font-mono)' }}>{formData.id_number || '—'}</span>
            </div>
            <div className="review-row">
              <span className="rv-label">صورة الهوية</span>
              <span className="rv-value">{(formData.id_image || formData.id_image_url) ? '✓ مرفق' : '—'}</span>
            </div>
            <div className="review-row">
              <span className="rv-label">الصورة الشخصية</span>
              <span className="rv-value">{(formData.profile_image || formData.profile_image_url) ? '✓ مرفق' : '—'}</span>
            </div>
          </div>
        </div>

        {/* Travel (conditional) */}
        {(formData.passport_number || formData.visa_country) && (
          <div className="review-section">
            <div className="review-card">
              <div className="review-card-hdr">
                <span className="review-card-title">✈️ السفر</span>
                <button className="review-card-edit" onClick={() => goToStep(4)} type="button">✏️ تعديل</button>
              </div>
              {formData.passport_number && (
                <div className="review-row">
                  <span className="rv-label">جواز السفر</span>
                  <span className="rv-value" dir="ltr" style={{ fontFamily: 'var(--font-mono)' }}>{formData.passport_number}</span>
                </div>
              )}
              {formData.visa_country && (
                <div className="review-row">
                  <span className="rv-label">التأشيرات</span>
                  <span className="rv-value">{formData.visa_country}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial */}
        <div className="review-section">
          <div className="review-card">
            <div className="review-card-hdr">
              <span className="review-card-title">🏦 المالية</span>
              <button className="review-card-edit" onClick={() => goToStep(5)} type="button">✏️ تعديل</button>
            </div>
            <div className="review-row">
              <span className="rv-label">البنك</span>
              <span className="rv-value">{formData.bank_id || '—'}</span>
            </div>
            <div className="review-row">
              <span className="rv-label">صاحب الحساب</span>
              <span className="rv-value">{formData.account_name || '—'}</span>
            </div>
            <div className="review-row">
              <span className="rv-label">IBAN</span>
              <span className="rv-value" dir="ltr" style={{ fontFamily: 'var(--font-mono)' }}>{formData.iban || '—'}</span>
            </div>
            <div className="review-row">
              <span className="rv-label">شامل الضريبة</span>
              <span className="rv-value">{formData.price_includes_tax ? 'نعم' : 'لا'}</span>
            </div>
          </div>
        </div>

        {/* Selected Fields */}
        {formData.selected_fields && formData.selected_fields.length > 0 && (
          <div className="review-section">
            <div className="review-card">
              <div className="review-card-hdr">
                <span className="review-card-title">💼 المجالات</span>
                <button className="review-card-edit" onClick={() => goToStep(6)} type="button">✏️ تعديل</button>
              </div>
              <div className="review-fields">
                {formData.selected_fields.map((field: SelectedField) => (
                  <span key={field.field_id} className="review-field-tag">
                    {field.field_name_ar} · {field.rate_from}-{field.rate_to} ر.س/يوم
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Terms */}
        <div
          className={`terms-wrap ${termsAccepted ? 'checked' : ''}`}
          onClick={() => setTermsAccepted(!termsAccepted)}
        >
          <div className="terms-checkbox" />
          <div className="terms-text">
            أوافق على <strong>الشروط والأحكام</strong> وسياسة الخصوصية الخاصة بمنصة Half Lens، وأقر بأن جميع البيانات المدخلة صحيحة ودقيقة.
          </div>
        </div>
      </div>
    </>
  );
};
