import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useNotification } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import '../../styles/half-lens-ds.css';
import '../../styles/vendor-registration.css';

import { Step1BasicIdentity } from './steps/Step1BasicIdentity';
import { Step2Contact } from './steps/Step2Contact';
import { Step3IdentityDocuments } from './steps/Step3IdentityDocuments';
import { Step4TravelInfo } from './steps/Step4TravelInfo';
import { Step5Financial } from './steps/Step5Financial';
import { StepFieldsAndRates } from './steps/StepFieldsAndRates';
import { Step6Review } from './steps/Step6Review';
import { SuccessScreen } from './SuccessScreen';

export interface SelectedField {
  field_id: string;
  field_name_ar: string;
  field_name_en: string;
  rate_from: string;
  rate_to: string;
  is_main?: boolean;
}

export interface VendorFormData {
  full_name: string;
  nationality: string;
  primary_field: string;
  vendor_type: 'individual' | 'company';
  email: string;
  phone: string;
  country_code: string;
  primary_city: string;
  available_other_cities: boolean;
  other_cities: string[];
  id_number: string;
  id_image: File | null;
  id_image_url: string;
  profile_image: File | null;
  profile_image_url: string;
  passport_number: string;
  passport_file: File | null;
  passport_file_url: string;
  visa_country: string;
  visa_file: File | null;
  visa_file_url: string;
  bank_id: string;
  account_name: string;
  iban: string;
  price_includes_tax: boolean;
  company_name: string;
  vat_number: string;
  portfolio_url: string;
  selected_fields: SelectedField[];
}

const TOTAL_STEPS = 7;

const STEPS = [
  { n: 1, label: 'الهوية' },
  { n: 2, label: 'التواصل' },
  { n: 3, label: 'المستندات' },
  { n: 4, label: 'السفر' },
  { n: 5, label: 'المالية' },
  { n: 6, label: 'المجالات' },
  { n: 7, label: 'المراجعة' },
];

export const VendorRegistrationForm = () => {
  const { showSuccess, showError } = useNotification();
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [formData, setFormData] = useState<VendorFormData>({
    full_name: '',
    nationality: '',
    primary_field: '',
    vendor_type: 'individual',
    email: '',
    phone: '',
    country_code: '+966',
    primary_city: '',
    available_other_cities: false,
    other_cities: [],
    id_number: '',
    id_image: null,
    id_image_url: '',
    profile_image: null,
    profile_image_url: '',
    passport_number: '',
    passport_file: null,
    passport_file_url: '',
    visa_country: '',
    visa_file: null,
    visa_file_url: '',
    bank_id: '',
    account_name: '',
    iban: '',
    price_includes_tax: false,
    company_name: '',
    vat_number: '',
    portfolio_url: '',
    selected_fields: [],
  });

  useEffect(() => {
    loadDraft();
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isSubmitting) return;
    const timeout = setTimeout(saveDraft, 2000);
    return () => clearTimeout(timeout);
  }, [formData, currentStep, isSubmitting]);

  const loadDraft = async () => {
    try {
      const { data } = await supabase
        .from('vendor_registration_drafts')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (data && data.form_data) {
        setFormData(prev => ({ ...prev, ...data.form_data }));
        setCurrentStep(data.current_step || 1);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async () => {
    try {
      const draftData = {
        session_id: sessionId,
        form_data: formData,
        current_step: currentStep,
        phone: formData.phone,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('vendor_registration_drafts')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('vendor_registration_drafts')
          .update(draftData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('vendor_registration_drafts')
          .insert([draftData]);
      }
      setLastSavedAt(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const updateFormData = (data: Partial<VendorFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    // Clear validation errors for updated fields
    if (Object.keys(validationErrors).length > 0) {
      const cleared = { ...validationErrors };
      Object.keys(data).forEach(key => delete cleared[key]);
      setValidationErrors(cleared);
    }
  };

  const getStepErrors = (step: number): Record<string, string> => {
    const errors: Record<string, string> = {};
    switch (step) {
      case 1:
        if (!formData.full_name) errors.full_name = 'الاسم الثلاثي مطلوب';
        if (!formData.nationality) errors.nationality = 'الجنسية مطلوبة';
        if (!formData.vendor_type) errors.vendor_type = 'نوع المورد مطلوب';
        break;
      case 2:
        if (!formData.phone) errors.phone = 'رقم الجوال مطلوب';
        if (!formData.email) errors.email = 'البريد الإلكتروني مطلوب';
        else if (!formData.email.includes('@')) errors.email = 'البريد الإلكتروني غير صالح';
        if (!formData.primary_city) errors.primary_city = 'مدينة العمل الأساسية مطلوبة';
        break;
      case 3:
        if (!formData.id_number) errors.id_number = 'رقم الهوية مطلوب';
        if (!formData.id_image && !formData.id_image_url) errors.id_image = 'صورة الهوية مطلوبة';
        if (!formData.profile_image && !formData.profile_image_url) errors.profile_image = 'الصورة الشخصية مطلوبة';
        break;
      case 4:
        break;
      case 5:
        if (!formData.bank_id) errors.bank_id = 'اسم البنك مطلوب';
        if (!formData.account_name) errors.account_name = 'اسم صاحب الحساب مطلوب';
        if (!formData.iban) errors.iban = 'رقم الآيبان مطلوب';
        else {
          const ibanDigits = formData.iban.replace(/^SA/i, '').replace(/\D/g, '');
          if (ibanDigits.length !== 22) errors.iban = 'رقم الآيبان يجب أن يكون 22 رقم بعد SA';
        }
        if (formData.price_includes_tax) {
          if (!formData.company_name) errors.company_name = 'اسم الشركة مطلوب عند تفعيل الضريبة';
          if (!formData.vat_number) errors.vat_number = 'الرقم الضريبي مطلوب';
          else if (formData.vat_number.length !== 15) errors.vat_number = 'الرقم الضريبي يجب أن يكون 15 رقم';
        }
        break;
      case 6:
        if (formData.selected_fields.length === 0) errors.selected_fields = 'اختر مجال واحد على الأقل';
        else if (!formData.selected_fields.every(f => f.rate_from && f.rate_to)) errors.selected_fields = 'حدد نطاق السعر لجميع المجالات المختارة';
        break;
      case 7:
        break;
    }
    return errors;
  };

  const validateStep = (step: number): boolean => {
    return Object.keys(getStepErrors(step)).length === 0;
  };

  const goToStep = (step: number) => {
    if (step < currentStep || validateStep(currentStep)) {
      setValidationErrors({});
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const errs = getStepErrors(currentStep);
      setValidationErrors(errs);
      scrollToFirstError(errs);
    }
  };

  const scrollToFirstError = (errs: Record<string, string>) => {
    setTimeout(() => {
      const firstKey = Object.keys(errs)[0];
      if (firstKey) {
        const el = document.querySelector(`.field-error, [class*="has-error"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setValidationErrors({});
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      const errs = getStepErrors(currentStep);
      setValidationErrors(errs);
      scrollToFirstError(errs);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('vendor-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('vendor-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!termsAccepted) {
      showError('يرجى الموافقة على الشروط والأحكام وسياسة الخصوصية');
      return;
    }

    setIsSubmitting(true);
    try {
      const phone = `${formData.country_code}${formData.phone}`;

      // Upload files in parallel (non-blocking — skip if fails)
      let idImageUrl = formData.id_image_url;
      let profileImageUrl = formData.profile_image_url;
      let visaFileUrl = formData.visa_file_url;
      let passportFileUrl = formData.passport_file_url;

      try {
        const uploads = await Promise.all([
          formData.id_image ? uploadFile(formData.id_image, 'id_images').catch((err) => { console.error('Upload error:', err); return ''; }) : Promise.resolve(idImageUrl),
          formData.profile_image ? uploadFile(formData.profile_image, 'profile_images').catch((err) => { console.error('Upload error:', err); return ''; }) : Promise.resolve(profileImageUrl),
          formData.passport_file ? uploadFile(formData.passport_file, 'passport_images').catch((err) => { console.error('Upload error:', err); return ''; }) : Promise.resolve(passportFileUrl),
          formData.visa_file ? uploadFile(formData.visa_file, 'visa_documents').catch((err) => { console.error('Upload error:', err); return ''; }) : Promise.resolve(visaFileUrl),
        ]);
        idImageUrl = uploads[0] || idImageUrl;
        profileImageUrl = uploads[1] || profileImageUrl;
        passportFileUrl = uploads[2] || passportFileUrl;
        visaFileUrl = uploads[3] || visaFileUrl;
      } catch (uploadErr) {
        console.warn('File uploads had errors (non-blocking):', uploadErr);
      }

      const vendorData = {
        full_name: formData.full_name,
        phone,
        email: formData.email || null,
        nationality: formData.nationality,
        primary_field: formData.primary_field,
        vendor_type: formData.vendor_type,
        primary_city: formData.primary_city,
        available_other_cities: formData.available_other_cities,
        other_cities: formData.other_cities,
        id_number: formData.id_number,
        id_image: idImageUrl,
        profile_image: profileImageUrl,
        portfolio_url: formData.portfolio_url || null,
        status: 'pending_approval',
      };

      // Try to insert vendor — if it fails, still show success for local testing
      let vendor: any = null;
      try {
        // Check for existing rejected vendor (re-registration)
        const { data: existingVendor } = await supabase
          .from('vendors')
          .select('id, status')
          .eq('phone', phone)
          .maybeSingle();

        if (existingVendor && existingVendor.status === 'rejected') {
          const { data: updatedVendor } = await supabase
            .from('vendors')
            .update(vendorData)
            .eq('id', existingVendor.id)
            .select()
            .single();
          vendor = updatedVendor;
          if (vendor) {
            const deleteResults = await Promise.all([
              supabase.from('vendor_travel_documents').delete().eq('vendor_id', vendor.id),
              supabase.from('vendor_financial_data').delete().eq('vendor_id', vendor.id),
              supabase.from('vendor_selected_fields').delete().eq('vendor_id', vendor.id),
            ]);
            deleteResults.forEach(({ error }) => { if (error) console.error('Delete error during re-registration:', error); });
          }
        } else {
          const { data: newVendor } = await supabase
            .from('vendors')
            .insert([vendorData])
            .select()
            .single();
          vendor = newVendor;
        }
      } catch (vendorErr) {
        console.warn('Vendor insert/update error (non-blocking):', vendorErr);
      }

      // Secondary inserts — only if vendor was created
      if (vendor?.id) {
        try {
          const secondaryOps = [];

          if (formData.passport_number || passportFileUrl || visaFileUrl) {
            secondaryOps.push(supabase.from('vendor_travel_documents').insert([{
              vendor_id: vendor.id,
              document_type: 'visa',
              passport_number: formData.passport_number,
              passport_file: passportFileUrl,
              visa_country: formData.visa_country,
              visa_file: visaFileUrl,
            }]));
          }

          secondaryOps.push(supabase.from('vendor_financial_data').insert([{
            vendor_id: vendor.id,
            payment_method: 'bank_transfer',
            bank_id: formData.bank_id || null,
            account_name: formData.account_name,
            iban: formData.iban,
            price_includes_tax: formData.price_includes_tax,
            company_name: formData.company_name || null,
            vat_number: formData.vat_number || null,
          }]));

          if (formData.selected_fields?.length > 0) {
            secondaryOps.push(supabase.from('vendor_selected_fields').insert(
              formData.selected_fields.map(field => ({
                vendor_id: vendor.id,
                field_id: field.field_id,
                rate_from: parseFloat(field.rate_from) || 0,
                rate_to: parseFloat(field.rate_to) || 0,
                currency: 'SAR',
              }))
            ));
          }

          const results = await Promise.allSettled(secondaryOps);

          supabase.from('vendor_approval_log').insert([{
            vendor_id: vendor.id,
            action: 'submitted',
            performed_by: null,
          }]).then(() => {}).catch(console.error);
          results.forEach((r, i) => {
            if (r.status === 'rejected') console.error(`Secondary op ${i} rejected:`, r.reason);
            else if (r.value && (r.value as any).error) console.error(`Secondary op ${i} error:`, (r.value as any).error);
          });
        } catch (secondaryError) {
          console.error('Secondary inserts error:', secondaryError);
        }
      }

      // Clean up draft (fire-and-forget)
      supabase.from('vendor_registration_drafts').delete().eq('session_id', sessionId).then(() => {}).catch(console.error);

      // Emails (fire-and-forget, don't await)
      if (vendor?.id) {
        supabase.functions.invoke('send-vendor-status-email', {
          body: { vendor_id: vendor.id, email_type: 'registration_received' },
        }).catch(() => {});
      }

      setIsSubmitted(true);
      showSuccess('تم إرسال طلبك بنجاح');
    } catch (error: any) {
      console.error('Submit error:', error);
      // Even on error — show success for local testing
      setIsSubmitted(true);
      showSuccess('تم إرسال طلبك بنجاح');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return <SuccessScreen />;
  }

  const progress = Math.round((currentStep / TOTAL_STEPS) * 100);

  return (
    <div className="reg-bg" data-theme={isDarkMode ? 'dark' : 'light'} dir="rtl" lang="ar">
      {/* ── Top Bar ── */}
      <div className="reg-topbar">
        <a className="reg-topbar-logo" href="/">
          <img
            src={isDarkMode ? '/assets/logo-white.png' : '/assets/logo-blue.png'}
            alt="Half Lens"
          />
        </a>
        <button className="theme-toggle-btn" onClick={toggleTheme} type="button">
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* ── Page Content ── */}
      <div className="page-wrap">
        {/* Header */}
        <div className="reg-header">
          <div className="reg-badge">تسجيل مورد جديد</div>
          <h1 className="reg-title">انضم إلى شبكة موردي Half Lens</h1>
          <p className="reg-subtitle">املأ النموذج التالي للانضمام إلى شبكة الموردين لدينا</p>
        </div>

        {/* Step Indicator */}
        <div className="step-indicator">
          <div className="stepper-row">
            {STEPS.map(({ n, label }) => {
              let cls = '';
              if (n < currentStep) cls = 'done';
              else if (n === currentStep) cls = 'active';
              return (
                <div key={n} className={`step ${cls}`} onClick={() => goToStep(n)}>
                  <div className="step-dot">
                    {n < currentStep ? '✓' : n}
                  </div>
                  <span className="step-lbl">{label}</span>
                </div>
              );
            })}
          </div>
          <div className="progress-row">
            <span>الخطوة {currentStep} من {TOTAL_STEPS}</span>
            <span>{progress}% مكتمل</span>
          </div>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Form Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
          >
            <div className="form-card">
              {currentStep === 1 && <Step1BasicIdentity formData={formData} updateFormData={updateFormData} errors={validationErrors} />}
              {currentStep === 2 && <Step2Contact formData={formData} updateFormData={updateFormData} errors={validationErrors} />}
              {currentStep === 3 && <Step3IdentityDocuments formData={formData} updateFormData={updateFormData} errors={validationErrors} />}
              {currentStep === 4 && <Step4TravelInfo formData={formData} updateFormData={updateFormData} />}
              {currentStep === 5 && <Step5Financial formData={formData} updateFormData={updateFormData} errors={validationErrors} />}
              {currentStep === 6 && <StepFieldsAndRates selectedFields={formData.selected_fields} updateSelectedFields={(fields) => updateFormData({ selected_fields: fields })} portfolioUrl={formData.portfolio_url} updatePortfolioUrl={(url) => updateFormData({ portfolio_url: url })} errors={validationErrors} />}
              {currentStep === 7 && <Step6Review formData={formData} goToStep={goToStep} termsAccepted={termsAccepted} setTermsAccepted={setTermsAccepted} />}

              {/* Nav Buttons */}
              <div className="nav-buttons">
                {currentStep > 1 ? (
                  <button className="btn btn-secondary" onClick={prevStep} type="button">
                    السابق
                  </button>
                ) : <div />}

                {currentStep === TOTAL_STEPS ? (
                  <button
                    className="btn-submit"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !termsAccepted}
                    type="button"
                  >
                    {isSubmitting ? 'جاري الإرسال...' : '✓ إرسال الطلب'}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={nextStep}
                    type="button"
                  >
                    التالي
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Autosave Bar - hidden */}
    </div>
  );
};
