import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useNotification } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDisablePullToRefresh } from '../shared/PullToRefresh';
import '../../styles/half-lens-ds.css';
import '../../styles/vendor-registration.css';

import { isValidEmail } from '../../lib/validators';
import { duplicateMessage, type DuplicateMatch } from '../../lib/vendorDuplicates';

import { Step1BasicIdentity } from './steps/Step1BasicIdentity';
import { Step2Contact } from './steps/Step2Contact';
import { Step3IdentityDocuments } from './steps/Step3IdentityDocuments';
import { Step4TravelInfo } from './steps/Step4TravelInfo';
import { Step5Financial } from './steps/Step5Financial';
import { StepFieldsAndRates } from './steps/StepFieldsAndRates';
import { Step6Review } from './steps/Step6Review';
import { SuccessScreen } from './SuccessScreen';

const Step7Equipment = lazy(() => import('./steps/Step7Equipment'));

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
  selected_equipment_ids: string[];
  custom_equipment_text: string[];
}

const TOTAL_STEPS = 8;

const STEPS = [
  { n: 1, label: 'الهوية' },
  { n: 2, label: 'التواصل' },
  { n: 3, label: 'المستندات' },
  { n: 4, label: 'السفر' },
  { n: 5, label: 'المالية' },
  { n: 6, label: 'المجالات' },
  { n: 7, label: 'المعدات' },
  { n: 8, label: 'المراجعة' },
];

export const VendorRegistrationForm = () => {
  // Pull-to-refresh on a long form is hostile — pulling up to scroll back to
  // the top fires a soft refresh that re-runs queries and feels broken. Off
  // for the entire registration page.
  useDisablePullToRefresh(true);

  const { showSuccess, showError } = useNotification();
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('vendor_reg_session_id');
    if (stored) return stored;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('vendor_reg_session_id', newId);
    return newId;
  });
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
    selected_equipment_ids: [],
    custom_equipment_text: [],
  });

  const saveDraftRef = useRef<() => Promise<void>>(null!);
  useEffect(() => { saveDraftRef.current = saveDraft; });

  useEffect(() => {
    loadDraft();
    const interval = setInterval(() => saveDraftRef.current(), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isSubmitting) return;
    const timeout = setTimeout(() => saveDraftRef.current(), 2000);
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

  const [validationErrors, setValidationErrors] = useState<Record<string, React.ReactNode>>({});

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
        else if (!isValidEmail(formData.email)) errors.email = 'البريد الإلكتروني غير صالح';
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
        if (!formData.portfolio_url || !formData.portfolio_url.trim()) {
          errors.portfolio_url = 'رابط البورتفوليو مطلوب';
        } else if (!/^https?:\/\/.+/i.test(formData.portfolio_url.trim())) {
          errors.portfolio_url = 'الرابط يجب أن يبدأ بـ http:// أو https://';
        }
        if (formData.selected_fields.length === 0) errors.selected_fields = 'اختر مجال واحد على الأقل';
        else if (!formData.selected_fields.every(f => f.rate_from && f.rate_to)) errors.selected_fields = 'حدد نطاق السعر لجميع المجالات المختارة';
        break;
      case 7:
        // Equipment step is optional — vendors with no equipment can skip
        break;
      case 8:
        break;
    }
    return errors;
  };

  const validateStep = (step: number): boolean => {
    return Object.keys(getStepErrors(step)).length === 0;
  };

  const goToStep = (step: number) => {
    if (step === currentStep) return;

    // Backward navigation — always allowed (users may want to review/edit
    // a previous step without re-validating their way back).
    if (step < currentStep) {
      setValidationErrors({});
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Forward navigation — first, block if there are UNRESOLVED errors
    // already visible on the current step. This catches async/server-side
    // validation failures that validateStep() doesn't know about (e.g. the
    // phone-duplicate check fires after Next is clicked and stores its error
    // in validationErrors — validateStep would still return true because the
    // phone format is locally valid).
    if (Object.keys(validationErrors).length > 0) {
      scrollToFirstError(validationErrors);
      showError('يرجى تصحيح الأخطاء قبل المتابعة');
      return;
    }

    // Then validate every step BETWEEN current and target via the sync rules.
    // If any fails, jump the user to the first invalid step (not the click
    // target) and surface its errors. Closes the stepper-click loophole
    // where users could skip ahead to step 8 with just step 1 filled.
    for (let i = currentStep; i < step; i++) {
      if (!validateStep(i)) {
        const errs = getStepErrors(i);
        setValidationErrors(errs);
        setCurrentStep(i);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        scrollToFirstError(errs);
        showError(`يرجى إكمال الخطوة ${i} أولاً`);
        return;
      }
    }

    // All intermediate steps valid — allow the jump.
    setValidationErrors({});
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToFirstError = (errs: Record<string, unknown>) => {
    setTimeout(() => {
      const firstKey = Object.keys(errs)[0];
      if (firstKey) {
        const el = document.querySelector(`.field-error, [class*="has-error"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const nextStep = async () => {
    if (!validateStep(currentStep)) {
      const errs = getStepErrors(currentStep);
      setValidationErrors(errs);
      scrollToFirstError(errs);
      return;
    }

    // Async duplicate check on Step 2 before proceeding
    if (currentStep === 2) {
      setCheckingDuplicate(true);
      try {
        // Format-flex phone duplicate check: vendors.phone is stored in mixed
        // formats across the DB (9-digit, 10-digit with leading 0, E.164, etc.),
        // so an exact `.eq()` match would miss real duplicates. Pull candidates
        // with non-null phone, normalize both stored value and the input to the
        // canonical 9-digit local form, then compare. Same pattern used in
        // send-otp-sms and verify-otp edge functions.
        const normalizePhone = (raw: string | null): string | null => {
          if (!raw) return null;
          let d = String(raw).replace(/\D/g, '');
          if (d.startsWith('00966')) d = d.slice(5);
          else if (d.startsWith('966')) d = d.slice(3);
          else if (d.startsWith('0')) d = d.slice(1);
          return /^5\d{8}$/.test(d) ? d : d; // return digits regardless; comparison is what matters
        };
        const inputDigits = normalizePhone(formData.phone);

        const { data: phoneCandidates } = await supabase
          .from('vendors')
          .select('id, status, phone')
          .not('phone', 'is', null);

        const phoneDup = (phoneCandidates || []).find(v =>
          v.status !== 'rejected' && normalizePhone(v.phone) === inputDigits
        );

        if (phoneDup) {
          setValidationErrors({
            phone: (
              <>
                رقم الجوال مسجل بالفعل.{' '}
                <a
                  href="/vendor/login"
                  onClick={(e) => { e.preventDefault(); window.location.href = '/vendor/login'; }}
                  style={{ color: 'var(--accent, #3b82f6)', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}
                >
                  قم بتسجيل الدخول
                </a>
              </>
            )
          });
          scrollToFirstError({ phone: '' });
          return;
        }

        if (formData.email) {
          const { data: emailVendor } = await supabase
            .from('vendors')
            .select('id, status')
            .eq('email', formData.email.trim().toLowerCase())
            .maybeSingle();

          if (emailVendor && emailVendor.status !== 'rejected') {
            setValidationErrors({
              email: (
                <>
                  البريد الإلكتروني مسجل بالفعل.{' '}
                  <a
                    href="/vendor/login"
                    onClick={(e) => { e.preventDefault(); window.location.href = '/vendor/login'; }}
                    style={{ color: 'var(--accent, #3b82f6)', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}
                  >
                    قم بتسجيل الدخول
                  </a>
                </>
              )
            });
            scrollToFirstError({ email: '' });
            return;
          }
        }
      } catch (err) {
        console.error('Duplicate check error:', err);
      } finally {
        setCheckingDuplicate(false);
      }
    }

    setValidationErrors({});
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // Block submit if there are unresolved errors visible — same async-error
    // safety net as goToStep. Catches the case where a user reached the
    // submit button despite a server-side validation error (e.g. duplicate
    // phone) still being displayed on a previous step.
    if (Object.keys(validationErrors).length > 0) {
      scrollToFirstError(validationErrors);
      showError('يرجى تصحيح الأخطاء قبل إرسال الطلب');
      return;
    }

    // Defense-in-depth: validate EVERY step before submitting. Even if a
    // user bypassed goToStep's gating (browser extension, devtools state
    // mutation, future refactor that exposes the submit button on a
    // different path), submission itself refuses if any step is incomplete.
    // We surface errors on the first invalid step instead of attempting
    // a doomed insert.
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      if (!validateStep(i)) {
        const errs = getStepErrors(i);
        setValidationErrors(errs);
        setCurrentStep(i);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        scrollToFirstError(errs);
        showError(`الخطوة ${i} غير مكتملة. يرجى إكمالها قبل إرسال الطلب.`);
        return;
      }
    }

    if (!termsAccepted) {
      showError('يرجى الموافقة على الشروط والأحكام وسياسة السرّية');
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

      const vendorBaseData = {
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
      };

      // Step 1: Insert/update vendor as 'draft' so RLS allows secondary inserts
      let vendor: any = null;

      // Duplicate + rejected-row lookup runs through a SECURITY DEFINER RPC so
      // the anonymous registration flow never needs a blanket read of the
      // vendors table (RLS no longer permits anon SELECT on vendors). The RPC
      // returns ONLY a conflict field name and a reusable rejected-row id — no
      // PII. Rejected rows are intentionally reusable in self-registration.
      const { data: regCheckRows, error: regCheckErr } = await supabase.rpc(
        'vendor_registration_check',
        {
          p_email: formData.email || null,
          p_phone: phone,
          p_id_number: formData.id_number || null,
        },
      );
      if (regCheckErr) console.error('Vendor registration check error:', regCheckErr);
      const regCheck = Array.isArray(regCheckRows) ? regCheckRows[0] : regCheckRows;

      if (regCheck?.conflict_field) {
        throw new Error(duplicateMessage({ field: regCheck.conflict_field } as DuplicateMatch));
      }

      // One-time secret that binds the post-registration auto-login to THIS
      // browser. Stored on the vendor row, returned to nobody, and required by
      // create-post-registration-session. An attacker who somehow learns the
      // new vendor's id still cannot mint a session without this nonce.
      const regNonce = crypto.randomUUID();

      const rejectedVendorId: string | null = regCheck?.rejected_vendor_id ?? null;

      if (rejectedVendorId) {
        const { data: updatedVendor, error: updateErr } = await supabase
          .from('vendors')
          .update({ ...vendorBaseData, status: 'pending_approval', registration_nonce: regNonce })
          .eq('id', rejectedVendorId)
          .select()
          .single();
        if (updateErr) {
          console.error('Vendor update error:', updateErr);
          throw new Error('فشل تحديث بيانات المورد: ' + updateErr.message);
        }
        vendor = updatedVendor;
        // Clear old secondary data before re-inserting
        if (vendor) {
          await Promise.all([
            supabase.from('vendor_travel_documents').delete().eq('vendor_id', vendor.id),
            supabase.from('vendor_financial_data').delete().eq('vendor_id', vendor.id),
            supabase.from('vendor_selected_fields').delete().eq('vendor_id', vendor.id),
            supabase.from('vendor_equipment').delete().eq('vendor_id', vendor.id),
            supabase.from('equipment_suggestions').delete().eq('vendor_id', vendor.id).eq('status', 'pending'),
          ]);
        }
      } else {
        const { data: newVendor, error: insertErr } = await supabase
          .from('vendors')
          .insert([{ ...vendorBaseData, status: 'pending_approval', registration_nonce: regNonce }])
          .select()
          .single();
        if (insertErr) {
          console.error('Vendor insert error:', insertErr);
          if (insertErr.message?.includes('vendors_email_unique')) {
            throw new Error('هذا البريد الإلكتروني مسجل بالفعل. إذا كنت قد تقدمت سابقاً، يرجى انتظار مراجعة طلبك.');
          }
          throw new Error('فشل تسجيل المورد: ' + insertErr.message);
        }
        vendor = newVendor;
      }

      if (!vendor?.id) {
        throw new Error('فشل إنشاء سجل المورد');
      }

      // Step 2: Insert secondary data (RLS allows anon inserts for draft/pending_approval vendors)
      try {
        // Always insert financial data (required step in registration)
        const isValidUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
        const bankId = formData.bank_id && isValidUuid(formData.bank_id) ? formData.bank_id : null;
        const finResult = await supabase.from('vendor_financial_data').insert([{
          vendor_id: vendor.id,
          payment_method: 'bank_transfer',
          bank_id: bankId,
          account_name: formData.account_name || null,
          iban: formData.iban || null,
          price_includes_tax: formData.price_includes_tax,
          company_name: formData.company_name || null,
          vat_number: formData.vat_number || null,
        }]);
        if (finResult.error) console.error('Financial data insert error:', finResult.error);

        // Travel documents (optional)
        const hasTravelData = formData.passport_number || passportFileUrl || visaFileUrl || formData.visa_country;
        if (hasTravelData) {
          const travelResult = await supabase.from('vendor_travel_documents').insert([{
            vendor_id: vendor.id,
            document_type: 'passport',
            passport_number: formData.passport_number || null,
            passport_file: passportFileUrl || null,
            visa_country: formData.visa_country || null,
            visa_file: visaFileUrl || null,
          }]);
          if (travelResult.error) console.error('Travel docs insert error:', travelResult.error);
        }

        // Selected fields (required step)
        if (formData.selected_fields?.length > 0) {
          const fieldsResult = await supabase.from('vendor_selected_fields').insert(
            formData.selected_fields.map(field => ({
              vendor_id: vendor.id,
              field_id: field.field_id,
              rate_from: parseFloat(field.rate_from) || 0,
              rate_to: parseFloat(field.rate_to) || 0,
              currency: 'SAR',
            }))
          );
          if (fieldsResult.error) console.error('Selected fields insert error:', fieldsResult.error);
        }

        // Equipment (optional step) — catalog selections → vendor_equipment
        if (formData.selected_equipment_ids?.length > 0) {
          try {
            const { data: items, error: catErr } = await supabase
              .from('equipment_catalog')
              .select('id, name, equipment_categories(name)')
              .in('id', formData.selected_equipment_ids);
            if (catErr) {
              console.error('Equipment catalog read error:', catErr);
            } else {
              const veRows = (items ?? []).map((it: any) => ({
                vendor_id: vendor.id,
                catalog_item_id: it.id,
                name: it.name,
                type: it.equipment_categories?.name ?? '',
                quantity: 1,
                condition: 'good',
              }));
              if (veRows.length) {
                const veResult = await supabase.from('vendor_equipment').insert(veRows);
                if (veResult.error) console.error('vendor_equipment insert error:', veResult.error);
              }
            }
          } catch (eqErr) {
            console.error('Equipment insert error:', eqErr);
          }
        }

        // Free-text equipment names → equipment_suggestions (status='pending')
        const customs = (formData.custom_equipment_text ?? [])
          .map(s => (s ?? '').trim())
          .filter(Boolean);
        if (customs.length > 0) {
          try {
            const sRows = customs.map(text => ({
              vendor_id: vendor.id,
              suggestion_text: text,
              status: 'pending' as const,
            }));
            const sResult = await supabase.from('equipment_suggestions').insert(sRows);
            if (sResult.error) console.error('equipment_suggestions insert error:', sResult.error);
          } catch (sgErr) {
            console.error('Equipment suggestions insert error:', sgErr);
          }
        }
      } catch (secondaryError) {
        console.error('Secondary inserts error:', secondaryError);
      }

      // Log submission (fire-and-forget)
      supabase.from('vendor_approval_log').insert([{
        vendor_id: vendor.id,
        action: 'submitted',
        performed_by: null,
      }]).then(() => {}).catch(console.error);

      // Clean up draft (fire-and-forget)
      supabase.from('vendor_registration_drafts').delete().eq('session_id', sessionId).then(() => {}).catch(console.error);
      localStorage.removeItem('vendor_reg_session_id');

      // Send registration email (fire-and-forget)
      supabase.functions.invoke('send-vendor-status-email', {
        body: { vendor_id: vendor.id, email_type: 'registration_received' },
      }).catch(() => {});

      // Create a vendor session so the user lands directly in the dashboard
      // after the success-screen countdown — no extra OTP login required.
      try {
        const sessionResp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-post-registration-session`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ vendor_id: vendor.id, nonce: regNonce }),
          }
        );
        const sessionData = await sessionResp.json();
        if (sessionResp.ok && sessionData?.session && sessionData?.vendor) {
          localStorage.setItem('vendor_session', JSON.stringify(sessionData.session));
          localStorage.setItem('vendor_data', JSON.stringify(sessionData.vendor));
        }
      } catch (err) {
        console.error('Auto-session error:', err);
      }

      setIsSubmitted(true);
      showSuccess('تم إرسال طلبك بنجاح');
    } catch (error: any) {
      console.error('Submit error:', error);
      showError(error?.message || 'حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return <SuccessScreen email={formData.email} />;
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
              {currentStep === 7 && (
                <Suspense fallback={<div className="page-loading-placeholder" />}>
                  <Step7Equipment
                    selectedIds={formData.selected_equipment_ids}
                    customNames={formData.custom_equipment_text}
                    updateSelectedIds={(ids) => updateFormData({ selected_equipment_ids: ids })}
                    updateCustomNames={(names) => updateFormData({ custom_equipment_text: names })}
                  />
                </Suspense>
              )}
              {currentStep === 8 && <Step6Review formData={formData} goToStep={goToStep} termsAccepted={termsAccepted} setTermsAccepted={setTermsAccepted} saveDraftNow={() => saveDraftRef.current?.()} />}

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
                    disabled={checkingDuplicate}
                  >
                    {checkingDuplicate ? 'جاري التحقق...' : 'التالي'}
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
