import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useVendor } from '../../contexts/VendorContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getStepLabel, getFieldLabel, RevisionFlags, STEP_BY_ID, VendorStepId } from '../../lib/vendorRegistrationSteps';
import { Step1BasicIdentity } from '../vendor-registration/steps/Step1BasicIdentity';
import { Step2Contact } from '../vendor-registration/steps/Step2Contact';
import { Step3IdentityDocuments } from '../vendor-registration/steps/Step3IdentityDocuments';
import { Step4TravelInfo } from '../vendor-registration/steps/Step4TravelInfo';
import { Step5Financial } from '../vendor-registration/steps/Step5Financial';
import { StepFieldsAndRates } from '../vendor-registration/steps/StepFieldsAndRates';
import type { VendorFormData, SelectedField } from '../vendor-registration/VendorRegistrationForm';
import '../../styles/vendor-registration.css';

// Map step id → step index used by step components
const STEP_ORDER: VendorStepId[] = ['identity', 'contact', 'documents', 'travel', 'financial', 'fields'];

const EMPTY_FORM: VendorFormData = {
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
};

interface AuthoritativeRecords {
  vendor: any;
  financial: any | null;
  travelDocs: any[];
  selectedFields: any[];
}

async function fetchAuthoritative(vendorId: string): Promise<AuthoritativeRecords> {
  const [vendorRes, financialRes, travelRes, fieldsRes] = await Promise.all([
    supabase.from('vendors').select('*').eq('id', vendorId).single(),
    supabase.from('vendor_financial_data').select('*').eq('vendor_id', vendorId).maybeSingle(),
    supabase.from('vendor_travel_documents').select('*').eq('vendor_id', vendorId),
    supabase.from('vendor_selected_fields').select('*, vendor_fields(name_ar, name_en)').eq('vendor_id', vendorId),
  ]);
  return {
    vendor: vendorRes.data,
    financial: financialRes.data,
    travelDocs: travelRes.data || [],
    selectedFields: fieldsRes.data || [],
  };
}

function hydrateForm(rec: AuthoritativeRecords): VendorFormData {
  const v = rec.vendor || {};
  const f = rec.financial || {};
  const t = rec.travelDocs?.[0] || {};
  const phoneFull: string = v.phone || '';
  // Split stored phone into country_code + phone. Stored format typically '+9665XXXXXXXX'.
  const match = phoneFull.match(/^(\+\d{1,4})(\d+)$/);
  const country_code = match ? match[1] : '+966';
  const localPhone = match ? match[2] : phoneFull.replace(/^\+/, '');
  return {
    ...EMPTY_FORM,
    full_name: v.full_name || '',
    nationality: v.nationality || '',
    primary_field: v.primary_field || '',
    vendor_type: (v.vendor_type as 'individual' | 'company') || 'individual',
    email: v.email || '',
    phone: localPhone,
    country_code,
    primary_city: v.primary_city || '',
    available_other_cities: !!v.available_other_cities,
    other_cities: v.other_cities || [],
    id_number: v.id_number || '',
    id_image_url: v.id_image || '',
    profile_image_url: v.profile_image || '',
    passport_number: t.passport_number || '',
    passport_file_url: t.passport_file || '',
    visa_country: t.visa_country || '',
    visa_file_url: t.visa_file || '',
    bank_id: f.bank_id || '',
    account_name: f.account_name || '',
    iban: f.iban || '',
    price_includes_tax: !!f.price_includes_tax,
    company_name: f.company_name || '',
    vat_number: f.vat_number || '',
    portfolio_url: v.portfolio_url || '',
    selected_fields: (rec.selectedFields || []).map((sf: any) => ({
      field_id: sf.field_id,
      field_name_ar: sf.vendor_fields?.name_ar || '',
      field_name_en: sf.vendor_fields?.name_en || '',
      rate_from: sf.rate_from?.toString() || '',
      rate_to: sf.rate_to?.toString() || '',
    })),
  };
}

async function uploadFile(file: File, path: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
  const filePath = `${path}/${fileName}`;
  const { error } = await supabase.storage.from('vendor-images').upload(filePath, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('vendor-images').getPublicUrl(filePath);
  return publicUrl;
}

// Collect a lightweight "snapshot" of all form fields for snapshot payload + delta.
function snapshotFromForm(form: VendorFormData): Record<string, unknown> {
  return {
    full_name: form.full_name,
    nationality: form.nationality,
    vendor_type: form.vendor_type,
    id_number: form.id_number,
    email: form.email,
    phone: `${form.country_code}${form.phone}`,
    primary_city: form.primary_city,
    other_cities: form.other_cities,
    portfolio_url: form.portfolio_url,
    profile_image: form.profile_image_url,
    id_image: form.id_image_url,
    passport_number: form.passport_number,
    passport_file: form.passport_file_url,
    visa_country: form.visa_country,
    visa_file: form.visa_file_url,
    bank_id: form.bank_id,
    account_name: form.account_name,
    iban: form.iban,
    price_includes_tax: form.price_includes_tax,
    company_name: form.company_name,
    vat_number: form.vat_number,
    selected_fields: form.selected_fields.map((f) => ({
      field_id: f.field_id,
      rate_from: f.rate_from,
      rate_to: f.rate_to,
    })),
  };
}

function computeDelta(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  stepForField: Record<string, VendorStepId>,
): Record<string, Record<string, { from: unknown; to: unknown }>> {
  const delta: Record<string, Record<string, { from: unknown; to: unknown }>> = {};
  for (const key of Object.keys(after)) {
    const a = JSON.stringify(before[key] ?? null);
    const b = JSON.stringify(after[key] ?? null);
    if (a !== b) {
      const step = stepForField[key];
      if (!step) continue;
      if (!delta[step]) delta[step] = {};
      delta[step][key] = { from: before[key] ?? null, to: after[key] ?? null };
    }
  }
  return delta;
}

const FIELD_TO_STEP: Record<string, VendorStepId> = {
  full_name: 'identity',
  nationality: 'identity',
  vendor_type: 'identity',
  id_number: 'identity',
  email: 'contact',
  phone: 'contact',
  primary_city: 'contact',
  other_cities: 'contact',
  portfolio_url: 'contact',
  profile_image: 'documents',
  id_image: 'documents',
  passport_number: 'travel',
  passport_file: 'travel',
  visa_country: 'travel',
  visa_file: 'travel',
  bank_id: 'financial',
  account_name: 'financial',
  iban: 'financial',
  price_includes_tax: 'financial',
  company_name: 'financial',
  vat_number: 'financial',
  selected_fields: 'fields',
};

export const VendorEditSubmission = () => {
  const { vendor, navigateTo, refreshVendor } = useVendor();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<VendorFormData>(EMPTY_FORM);
  const [originalSnapshot, setOriginalSnapshot] = useState<Record<string, unknown>>({});
  const [flags, setFlags] = useState<RevisionFlags | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vendor?.id) return;
    (async () => {
      setLoading(true);
      try {
        const [rec, logRes] = await Promise.all([
          fetchAuthoritative(vendor.id),
          supabase
            .from('vendor_approval_log')
            .select('flags')
            .eq('vendor_id', vendor.id)
            .eq('action', 'revision_requested')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        const hydrated = hydrateForm(rec);
        setFormData(hydrated);
        setOriginalSnapshot(snapshotFromForm(hydrated));
        const f = logRes.data?.flags as RevisionFlags | null;
        setFlags(f && f.steps ? f : null);
      } catch (err) {
        console.error('Edit submission load error:', err);
        showError('تعذر تحميل بيانات الطلب. حاول مرة أخرى.');
      } finally {
        setLoading(false);
      }
    })();
  }, [vendor?.id]);

  const flaggedStepIds: VendorStepId[] = useMemo(() => {
    if (!flags?.steps) return STEP_ORDER;
    const s = Object.keys(flags.steps).filter((id) => STEP_ORDER.includes(id as VendorStepId)) as VendorStepId[];
    return s.length > 0 ? s : STEP_ORDER;
  }, [flags]);

  const visibleSteps = flaggedStepIds;
  const activeStepId = visibleSteps[currentStepIdx];

  const updateFormData = (patch: Partial<VendorFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  // Field-level lock: when the admin flagged SPECIFIC fields within a step,
  // lock the other fields so the vendor can only touch what was requested.
  // We match each `.input-group` by its label text against the field labels
  // from the step registry — that's the single consistent signal across all
  // step components without having to add a readOnly prop to each one.
  useLayoutEffect(() => {
    const root = formRef.current;
    if (!root) return;

    const groups = root.querySelectorAll<HTMLElement>('.input-group');
    const flaggedFieldIds = activeFlag?.fields || [];
    const stepDef = STEP_BY_ID[activeStepId];
    // If the admin did not target specific fields on this step, nothing is
    // locked — the vendor can edit the whole step.
    if (!stepDef || flaggedFieldIds.length === 0) {
      groups.forEach((g) => g.removeAttribute('data-locked'));
      return;
    }

    const flaggedLabels = new Set(
      flaggedFieldIds
        .map((fid) => stepDef.fields.find((f) => f.id === fid)?.label.trim())
        .filter(Boolean) as string[]
    );

    groups.forEach((g) => {
      const labelEl = g.querySelector('.input-label');
      const labelText = labelEl?.textContent?.replace(/\s+/g, ' ').trim() || '';
      // Remove the required "*" prefix so "* رقم الهوية" also matches "رقم الهوية".
      const normalized = labelText.replace(/^\*\s*/, '').trim();
      const isFlagged = [...flaggedLabels].some(
        (lbl) => normalized.includes(lbl) || lbl.includes(normalized)
      );

      // Belt & braces: set the data-locked attribute for CSS AND mark every
      // interactive child as disabled so keyboard/screen-reader users can't
      // bypass the pointer-events:none visual lock.
      const interactive = g.querySelectorAll<HTMLElement>(
        'input, select, textarea, button, [role="button"], [contenteditable]'
      );
      if (isFlagged) {
        g.removeAttribute('data-locked');
        interactive.forEach((el) => {
          el.removeAttribute('disabled');
          el.removeAttribute('aria-disabled');
          if (el.getAttribute('tabindex') === '-1') el.removeAttribute('tabindex');
        });
      } else {
        g.setAttribute('data-locked', 'true');
        interactive.forEach((el) => {
          (el as HTMLInputElement).disabled = true;
          el.setAttribute('aria-disabled', 'true');
          el.setAttribute('tabindex', '-1');
        });
      }
    });
  });

  const next = () => {
    if (currentStepIdx < visibleSteps.length - 1) {
      setCurrentStepIdx((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const prev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((i) => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleResubmit = async () => {
    if (!vendor?.id || saving) return;
    setSaving(true);
    try {
      // Upload any new files that were picked during the edit session
      const [profileUrl, idUrl, passportUrl, visaUrl] = await Promise.all([
        formData.profile_image ? uploadFile(formData.profile_image, 'profile_images').catch(() => formData.profile_image_url) : Promise.resolve(formData.profile_image_url),
        formData.id_image ? uploadFile(formData.id_image, 'id_images').catch(() => formData.id_image_url) : Promise.resolve(formData.id_image_url),
        formData.passport_file ? uploadFile(formData.passport_file, 'passport_images').catch(() => formData.passport_file_url) : Promise.resolve(formData.passport_file_url),
        formData.visa_file ? uploadFile(formData.visa_file, 'visa_documents').catch(() => formData.visa_file_url) : Promise.resolve(formData.visa_file_url),
      ]);

      const finalForm: VendorFormData = {
        ...formData,
        profile_image_url: profileUrl || formData.profile_image_url,
        id_image_url: idUrl || formData.id_image_url,
        passport_file_url: passportUrl || formData.passport_file_url,
        visa_file_url: visaUrl || formData.visa_file_url,
      };

      const fullPhone = `${finalForm.country_code}${finalForm.phone}`;

      // UPDATE vendors (non-destructive)
      const { error: vUpdErr } = await supabase
        .from('vendors')
        .update({
          full_name: finalForm.full_name,
          nationality: finalForm.nationality,
          vendor_type: finalForm.vendor_type,
          email: finalForm.email || null,
          phone: fullPhone,
          primary_city: finalForm.primary_city,
          available_other_cities: finalForm.available_other_cities,
          other_cities: finalForm.other_cities,
          id_number: finalForm.id_number,
          id_image: finalForm.id_image_url,
          profile_image: finalForm.profile_image_url,
          portfolio_url: finalForm.portfolio_url || null,
          status: 'pending_approval',
          updated_at: new Date().toISOString(),
        })
        .eq('id', vendor.id);
      if (vUpdErr) throw vUpdErr;

      // UPSERT financial (single row per vendor)
      const isValidUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const bankId = finalForm.bank_id && isValidUuid(finalForm.bank_id) ? finalForm.bank_id : null;
      const { data: existingFin } = await supabase
        .from('vendor_financial_data')
        .select('id')
        .eq('vendor_id', vendor.id)
        .maybeSingle();
      if (existingFin?.id) {
        await supabase
          .from('vendor_financial_data')
          .update({
            bank_id: bankId,
            account_name: finalForm.account_name || null,
            iban: finalForm.iban || null,
            price_includes_tax: finalForm.price_includes_tax,
            company_name: finalForm.company_name || null,
            vat_number: finalForm.vat_number || null,
          })
          .eq('id', existingFin.id);
      } else {
        await supabase.from('vendor_financial_data').insert([{
          vendor_id: vendor.id,
          payment_method: 'bank_transfer',
          bank_id: bankId,
          account_name: finalForm.account_name || null,
          iban: finalForm.iban || null,
          price_includes_tax: finalForm.price_includes_tax,
          company_name: finalForm.company_name || null,
          vat_number: finalForm.vat_number || null,
        }]);
      }

      // UPSERT travel docs (single row per vendor, if any travel info exists)
      const hasTravel = finalForm.passport_number || finalForm.passport_file_url || finalForm.visa_file_url || finalForm.visa_country;
      const { data: existingTravel } = await supabase
        .from('vendor_travel_documents')
        .select('id')
        .eq('vendor_id', vendor.id)
        .limit(1);
      if (hasTravel) {
        const travelRow = {
          vendor_id: vendor.id,
          document_type: 'passport',
          passport_number: finalForm.passport_number || null,
          passport_file: finalForm.passport_file_url || null,
          visa_country: finalForm.visa_country || null,
          visa_file: finalForm.visa_file_url || null,
        };
        if (existingTravel?.[0]?.id) {
          await supabase.from('vendor_travel_documents').update(travelRow).eq('id', existingTravel[0].id);
        } else {
          await supabase.from('vendor_travel_documents').insert([travelRow]);
        }
      }

      // Reconcile vendor_selected_fields by field_id (update overlap, insert new,
      // delete only rows whose field_id no longer appears — avoids destructive
      // delete-all+insert-all that the legacy registration used).
      const { data: existingFields } = await supabase
        .from('vendor_selected_fields')
        .select('id, field_id')
        .eq('vendor_id', vendor.id);
      const existingByFieldId = new Map<string, string>((existingFields || []).map((r: any) => [r.field_id, r.id]));
      const nextFieldIds = new Set(finalForm.selected_fields.map((f) => f.field_id));
      // Upserts
      for (const f of finalForm.selected_fields) {
        const rowId = existingByFieldId.get(f.field_id);
        const payload = {
          vendor_id: vendor.id,
          field_id: f.field_id,
          rate_from: parseFloat(f.rate_from) || 0,
          rate_to: parseFloat(f.rate_to) || 0,
          currency: 'SAR',
        };
        if (rowId) {
          await supabase.from('vendor_selected_fields').update(payload).eq('id', rowId);
        } else {
          await supabase.from('vendor_selected_fields').insert([payload]);
        }
      }
      // Deletions (removed fields only)
      const toDelete = (existingFields || []).filter((r: any) => !nextFieldIds.has(r.field_id)).map((r: any) => r.id);
      if (toDelete.length > 0) {
        await supabase.from('vendor_selected_fields').delete().in('id', toDelete);
      }

      // Snapshot + delta — these are audit/history writes. The *essential*
      // state change (vendors.status → pending_approval + secondary-table
      // updates) has already succeeded above. If the audit writes fail
      // (e.g. RLS returns 401 for the anon-session vendor), we log and
      // continue rather than leave the UI in a half-submitted state.
      const newSnapshot = snapshotFromForm(finalForm);
      const delta = computeDelta(originalSnapshot, newSnapshot, FIELD_TO_STEP);

      try {
        const { error } = await supabase.from('vendor_submission_snapshots').insert([{
          vendor_id: vendor.id,
          action: 'resubmitted',
          submission_payload: newSnapshot,
          performed_by: null,
        }]);
        if (error) console.warn('Snapshot insert failed (non-fatal):', error);
      } catch (snapErr) {
        console.warn('Snapshot insert threw (non-fatal):', snapErr);
      }

      // Human-readable summary for the log reason
      const summaryLines: string[] = [];
      for (const [stepId, fields] of Object.entries(delta)) {
        const names = Object.keys(fields).map((fid) => getFieldLabel(stepId, fid)).join('، ');
        summaryLines.push(`• ${getStepLabel(stepId)}: ${names}`);
      }
      const summary = summaryLines.length > 0 ? summaryLines.join('\n') : 'إعادة تقديم بدون تغييرات قابلة للكشف.';

      try {
        const { error } = await supabase.from('vendor_approval_log').insert([{
          vendor_id: vendor.id,
          action: 'resubmitted',
          reason: summary,
          flags: { delta },
          performed_by: null,
        }]);
        if (error) console.warn('Approval log insert failed (non-fatal):', error);
      } catch (logErr) {
        console.warn('Approval log insert threw (non-fatal):', logErr);
      }

      // Fire-and-forget email
      supabase.functions.invoke('send-vendor-status-email', {
        body: { vendor_id: vendor.id, email_type: 'resubmitted' },
      }).catch(() => {});

      showSuccess('تم إرسال التعديلات. طلبك قيد المراجعة مجدداً.');
      await refreshVendor();
      navigateTo('dashboard');
    } catch (err: any) {
      console.error('Resubmit error:', err);
      showError(err?.message || 'حدث خطأ أثناء إعادة التقديم');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  const activeFlag = flags?.steps?.[activeStepId];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header banner */}
      <div
        className="vp-edit-banner px-4 py-4 sm:px-5 rounded-2xl flex items-start gap-3"
        data-stack-mobile="true"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(8,18,38,0.55) 100%)',
          border: '1px solid rgba(245,158,11,0.35)',
        }}
      >
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(245,158,11,0.18)' }}
        >
          <AlertCircle size={18} style={{ color: '#fbbf24' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            التعديلات المطلوبة
          </div>
          <div className="text-xs mt-1 leading-[1.8]" style={{ color: 'var(--color-text-secondary)' }}>
            يعرض هذا النموذج فقط الخطوات التي طلب المدير تعديلها. لن يتم حذف أي بيانات — سنقوم بتحديث الحقول التي قمت بتغييرها فقط.
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigateTo('dashboard')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer flex-shrink-0"
          style={{
            background: 'var(--color-background-hover, rgba(148,163,184,0.15))',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          <ArrowRight size={14} />
          العودة
        </button>
      </div>

      {/* Stepper — scrollable on phones via responsive.css */}
      <div
        className="vp-edit-stepper flex gap-2 flex-wrap px-2.5 py-2 rounded-xl overflow-x-auto"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {visibleSteps.map((sid, idx) => {
          const done = idx < currentStepIdx;
          const active = idx === currentStepIdx;
          return (
            <button
              key={sid}
              type="button"
              onClick={() => setCurrentStepIdx(idx)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold cursor-pointer whitespace-nowrap flex-shrink-0"
              style={{
                background: active ? 'rgba(245,158,11,0.15)' : done ? 'rgba(34,197,94,0.1)' : 'transparent',
                border: active ? '1px solid rgba(245,158,11,0.5)' : done ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--color-border)',
                color: active ? '#b45309' : done ? '#16a34a' : 'var(--color-text-secondary)',
              }}
            >
              {done && <CheckCircle2 size={13} />}
              {getStepLabel(sid)}
            </button>
          );
        })}
      </div>

      {/* Admin comment for the active step */}
      {activeFlag?.comment && (
        <div
          className="px-4 py-3 rounded-[10px]"
          style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.25)',
          }}
        >
          <div className="text-[11px] font-bold mb-1" style={{ color: '#fbbf24' }}>
            ملاحظات المراجع لهذه الخطوة
          </div>
          <div className="text-[13px] leading-[1.8]" style={{ color: 'var(--color-text-primary)' }}>
            {activeFlag.comment}
          </div>
          {!!activeFlag.fields?.length && (
            <div className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
              الحقول المطلوب مراجعتها: {activeFlag.fields.map((f) => getFieldLabel(activeStepId, f)).join('، ')}
            </div>
          )}
        </div>
      )}

      {/* Form card (reuses registration step components) */}
      <div className="form-card vp-edit-form" ref={formRef}>
        {activeStepId === 'identity' && (
          <Step1BasicIdentity formData={formData} updateFormData={updateFormData} errors={{}} />
        )}
        {activeStepId === 'contact' && (
          <Step2Contact formData={formData} updateFormData={updateFormData} errors={{}} />
        )}
        {activeStepId === 'documents' && (
          <Step3IdentityDocuments formData={formData} updateFormData={updateFormData} errors={{}} />
        )}
        {activeStepId === 'travel' && (
          <Step4TravelInfo formData={formData} updateFormData={updateFormData} />
        )}
        {activeStepId === 'financial' && (
          <Step5Financial formData={formData} updateFormData={updateFormData} errors={{}} />
        )}
        {activeStepId === 'fields' && (
          <StepFieldsAndRates
            selectedFields={formData.selected_fields}
            updateSelectedFields={(fields: SelectedField[]) => updateFormData({ selected_fields: fields })}
            portfolioUrl={formData.portfolio_url}
            updatePortfolioUrl={(url: string) => updateFormData({ portfolio_url: url })}
            errors={{}}
          />
        )}

        <div className="nav-buttons" data-action-bar>
          {currentStepIdx > 0 ? (
            <button className="btn btn-secondary" onClick={prev} type="button" data-action="secondary">السابق</button>
          ) : <div />}
          {currentStepIdx < visibleSteps.length - 1 ? (
            <button className="btn btn-primary" onClick={next} type="button">التالي</button>
          ) : (
            <button
              className="btn-submit"
              onClick={handleResubmit}
              disabled={saving}
              type="button"
            >
              {saving ? 'جاري الإرسال...' : 'إرسال التعديلات ↺'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
