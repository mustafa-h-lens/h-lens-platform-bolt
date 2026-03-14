import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { useNotification } from '../../contexts/NotificationContext';
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
}

export interface VendorFormData {
  full_name: string;
  nationality: string;
  primary_field: string;
  vendor_type: 'individual' | 'company';
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
  visa_country: string;
  visa_file: File | null;
  visa_file_url: string;
  bank_id: string;
  account_name: string;
  iban: string;
  price_includes_tax: boolean;
  selected_fields: SelectedField[];
}

const TOTAL_STEPS = 7;

export const VendorRegistrationForm = () => {
  const { showSuccess, showError } = useNotification();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [formData, setFormData] = useState<VendorFormData>({
    full_name: '',
    nationality: '',
    primary_field: '',
    vendor_type: 'individual',
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
    visa_country: '',
    visa_file: null,
    visa_file_url: '',
    bank_id: '',
    account_name: '',
    iban: '',
    price_includes_tax: false,
    selected_fields: [],
  });

  useEffect(() => {
    loadDraft();
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    saveDraft();
  }, [formData, currentStep]);

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
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const updateFormData = (data: Partial<VendorFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.full_name && formData.nationality && formData.vendor_type);
      case 2:
        return !!(formData.phone && formData.primary_city);
      case 3:
        return !!(formData.id_number && (formData.id_image || formData.id_image_url) && (formData.profile_image || formData.profile_image_url));
      case 4:
        return true;
      case 5:
        return !!(formData.bank_id && formData.account_name && formData.iban);
      case 6:
        return formData.selected_fields.length > 0 && formData.selected_fields.every(f => f.rate_from && f.rate_to);
      case 7:
        return true;
      default:
        return false;
    }
  };

  const goToStep = (step: number) => {
    if (step < currentStep || validateStep(currentStep)) {
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      showError('يرجى إكمال جميع الحقول المطلوبة');
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      showError('يرجى إكمال جميع الحقول المطلوبة');
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
    if (!validateStep(7)) {
      showError('يرجى إكمال جميع الحقول المطلوبة');
      return;
    }

    try {
      let idImageUrl = formData.id_image_url;
      let profileImageUrl = formData.profile_image_url;
      let visaFileUrl = formData.visa_file_url;

      if (formData.id_image) {
        idImageUrl = await uploadFile(formData.id_image, 'id_images');
      }

      if (formData.profile_image) {
        profileImageUrl = await uploadFile(formData.profile_image, 'profile_images');
      }

      if (formData.visa_file) {
        visaFileUrl = await uploadFile(formData.visa_file, 'visa_documents');
      }

      const vendorData = {
        full_name: formData.full_name,
        phone: `${formData.country_code}${formData.phone}`,
        nationality: formData.nationality,
        primary_field: formData.primary_field,
        vendor_type: formData.vendor_type,
        primary_city: formData.primary_city,
        available_other_cities: formData.available_other_cities,
        other_cities: formData.other_cities,
        id_number: formData.id_number,
        id_image: idImageUrl,
        profile_image: profileImageUrl,
        status: 'pending_approval',
      };

      // Check if this email is a re-registration for a rejected vendor
      const vendorEmail = formData.phone; // phone is used as identifier
      const { data: existingVendor } = await supabase
        .from('vendors')
        .select('id, status, email')
        .eq('phone', `${formData.country_code}${formData.phone}`)
        .maybeSingle();

      let vendor: any;

      if (existingVendor && existingVendor.status === 'rejected') {
        // Reset rejected vendor — reuse existing record
        const { data: updatedVendor, error: updateError } = await supabase
          .from('vendors')
          .update(vendorData)
          .eq('id', existingVendor.id)
          .select()
          .single();

        if (updateError) throw updateError;
        vendor = updatedVendor;

        // Clean up old related data before re-inserting
        await supabase.from('vendor_travel_documents').delete().eq('vendor_id', vendor.id);
        await supabase.from('vendor_financial_data').delete().eq('vendor_id', vendor.id);
        await supabase.from('vendor_selected_fields').delete().eq('vendor_id', vendor.id);
      } else {
        const { data: newVendor, error: vendorError } = await supabase
          .from('vendors')
          .insert([vendorData])
          .select()
          .single();

        if (vendorError) throw vendorError;
        vendor = newVendor;
      }

      if (formData.passport_number || visaFileUrl) {
        await supabase.from('vendor_travel_documents').insert([{
          vendor_id: vendor.id,
          document_type: 'visa',
          passport_number: formData.passport_number,
          visa_country: formData.visa_country,
          visa_file: visaFileUrl,
        }]);
      }

      await supabase.from('vendor_financial_data').insert([{
        vendor_id: vendor.id,
        payment_method: 'bank_transfer',
        bank_id: formData.bank_id,
        account_name: formData.account_name,
        iban: formData.iban,
        price_includes_tax: formData.price_includes_tax,
      }]);

      if (formData.selected_fields && formData.selected_fields.length > 0) {
        const selectedFieldsData = formData.selected_fields.map(field => ({
          vendor_id: vendor.id,
          field_id: field.field_id,
          rate_from: parseFloat(field.rate_from),
          rate_to: parseFloat(field.rate_to),
          currency: 'SAR',
        }));

        await supabase.from('vendor_selected_fields').insert(selectedFieldsData);
      }

      // Delete registration draft
      await supabase
        .from('vendor_registration_drafts')
        .delete()
        .eq('session_id', sessionId);

      // Log submission in approval log
      await supabase.from('vendor_approval_log').insert([{
        vendor_id: vendor.id,
        action: existingVendor?.status === 'rejected' ? 'resubmitted' : 'submitted',
        performed_by: null,
      }]);

      // Send notification emails (fire-and-forget, don't block submission)
      try {
        await supabase.functions.invoke('send-vendor-status-email', {
          body: { vendor_id: vendor.id, email_type: 'registration_received' },
        });
        await supabase.functions.invoke('send-vendor-status-email', {
          body: { vendor_id: vendor.id, email_type: 'admin_new_registration' },
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }

      setIsSubmitted(true);
      showSuccess('تم إرسال طلبك بنجاح');
    } catch (error) {
      console.error('Error submitting form:', error);
      showError('حدث خطأ أثناء إرسال الطلب');
    }
  };

  if (isSubmitted) {
    return <SuccessScreen />;
  }

  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="vr-background min-h-screen relative">
      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ color: 'var(--vr-text-primary)' }}>
            انضم إلى فريق Half Lens
          </h1>
          <p className="text-lg" style={{ color: 'var(--vr-text-secondary)' }}>
            املأ النموذج التالي للانضمام إلى شبكة الموردين لدينا
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-3xl mx-auto mb-8"
        >
          <div className="flex items-center justify-between mb-4 px-4">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <motion.div
                  onClick={() => goToStep(step)}
                  whileHover={{ scale: step <= currentStep ? 1.1 : 1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                    step === currentStep
                      ? 'shadow-lg'
                      : step < currentStep
                      ? ''
                      : 'bg-gray-700'
                  }`}
                  style={{
                    color: 'var(--vr-text-primary)',
                    ...(step <= currentStep ? { backgroundColor: 'var(--color-primary)' } : {})
                  }}
                >
                  {step < currentStep ? '✓' : step}
                </motion.div>
                <span className="text-xs mt-2 hidden md:block" style={{ color: 'var(--vr-text-muted)' }}>
                  {step === 1 && 'الهوية'}
                  {step === 2 && 'التواصل'}
                  {step === 3 && 'المستندات'}
                  {step === 4 && 'السفر'}
                  {step === 5 && 'المالية'}
                  {step === 6 && 'المجالات'}
                  {step === 7 && 'المراجعة'}
                </span>
              </div>
            ))}
          </div>

          <div className="vr-progress-bar">
            <motion.div
              className="vr-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="vr-glass-card p-8 md:p-12"
            >
              {currentStep === 1 && <Step1BasicIdentity formData={formData} updateFormData={updateFormData} />}
              {currentStep === 2 && <Step2Contact formData={formData} updateFormData={updateFormData} />}
              {currentStep === 3 && <Step3IdentityDocuments formData={formData} updateFormData={updateFormData} />}
              {currentStep === 4 && <Step4TravelInfo formData={formData} updateFormData={updateFormData} />}
              {currentStep === 5 && <Step5Financial formData={formData} updateFormData={updateFormData} />}
              {currentStep === 6 && <StepFieldsAndRates selectedFields={formData.selected_fields} updateSelectedFields={(fields) => updateFormData({ selected_fields: fields })} />}
              {currentStep === 7 && <Step6Review formData={formData} goToStep={goToStep} />}

              <div className="flex gap-4 mt-8">
                {currentStep > 1 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={prevStep}
                    className="flex-1 py-4 rounded-xl font-semibold transition-all border-2"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'var(--vr-text-primary)',
                    }}
                  >
                    السابق
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={currentStep === TOTAL_STEPS ? handleSubmit : nextStep}
                  disabled={!validateStep(currentStep)}
                  className="vr-button vr-glow flex-1 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--vr-text-primary)',
                  }}
                >
                  {currentStep === TOTAL_STEPS ? 'إرسال الطلب' : 'التالي'}
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
