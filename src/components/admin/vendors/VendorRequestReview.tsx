import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, XCircle, Pencil, Clock, User, Phone, MapPin, Briefcase, CreditCard, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { SignedImage } from '../../shared/SignedImage';
import { useNotification } from '../../../contexts/NotificationContext';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import { canTransition, STATUS_LABELS, VendorStatus } from '../../../lib/vendorStatusMachine';
import { RevisionFlagModal } from './RevisionFlagModal';
import type { RevisionFlags } from '../../../lib/vendorRegistrationSteps';

interface ApprovalLogEntry {
  id: string;
  action: string;
  reason: string | null;
  created_at: string;
  performed_by: string | null;
}

interface VendorData {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  nationality?: string;
  vendor_type?: string;
  primary_city?: string;
  primary_field?: string;
  available_other_cities?: boolean;
  other_cities?: string[];
  id_number?: string;
  id_image?: string;
  profile_image?: string;
  portfolio_url?: string;
  status: VendorStatus;
  created_at: string;
  updated_at: string;
}

interface FinancialData {
  bank_id?: string;
  bank_name?: string;
  account_name?: string;
  beneficiary_name?: string;
  iban?: string;
  price_includes_tax?: boolean;
  company_name?: string;
  vat_number?: string;
  banks?: { name_ar?: string; name_en?: string };
}

interface TravelDoc {
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
}

interface SelectedField {
  field_id: string;
  rate_from: number;
  rate_to: number;
  currency: string;
  vendor_fields?: { name_ar: string; name_en: string };
}

interface VendorRequestReviewProps {
  vendorId: string;
  onBack: () => void;
  onActionComplete: () => void;
}

export const VendorRequestReview = ({ vendorId, onBack, onActionComplete }: VendorRequestReviewProps) => {
  const { showSuccess, showError, showWarning } = useNotification();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [financial, setFinancial] = useState<FinancialData | null>(null);
  const [travelDocs, setTravelDocs] = useState<TravelDoc[]>([]);
  const [selectedFields, setSelectedFields] = useState<SelectedField[]>([]);
  const [approvalLog, setApprovalLog] = useState<ApprovalLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Image lightbox
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [actionReason, setActionReason] = useState('');

  // Optimistic lock
  const [capturedUpdatedAt, setCapturedUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, [vendorId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [vendorRes, financialRes, travelRes, fieldsRes, logRes] = await Promise.all([
        supabase.from('vendors').select('*').eq('id', vendorId).single(),
        supabase.from('vendor_financial_data').select('*, banks:bank_id(name_ar, name_en)').eq('vendor_id', vendorId).maybeSingle(),
        supabase.from('vendor_travel_documents').select('*').eq('vendor_id', vendorId),
        supabase.from('vendor_selected_fields').select('*, vendor_fields(name_ar, name_en)').eq('vendor_id', vendorId),
        supabase.from('vendor_approval_log').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: false }),
      ]);

      if (vendorRes.error) throw vendorRes.error;
      if (financialRes.error) console.error('Financial fetch error:', financialRes.error);
      if (travelRes.error) console.error('Travel fetch error:', travelRes.error);
      if (fieldsRes.error) console.error('Fields fetch error:', fieldsRes.error);
      if (logRes.error) console.error('Log fetch error:', logRes.error);
      setVendor(vendorRes.data);
      setCapturedUpdatedAt(vendorRes.data.updated_at);
      setFinancial(financialRes.data);
      setTravelDocs(travelRes.data || []);
      setSelectedFields(fieldsRes.data || []);
      setApprovalLog(logRes.data || []);
    } catch (error) {
      console.error('Error fetching vendor data:', error);
      showError('حدث خطأ أثناء تحميل بيانات المورد');
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (
    action: 'approved' | 'rejected' | 'revision_requested',
    reason?: string,
    flags?: RevisionFlags,
  ) => {
    if (!vendor || !capturedUpdatedAt) return;

    const newStatus: VendorStatus = action === 'approved' ? 'active' : action === 'rejected' ? 'rejected' : 'revision_requested';

    if (!canTransition(vendor.status, newStatus)) {
      showError('لا يمكن تنفيذ هذا الإجراء على الحالة الحالية');
      return;
    }

    setActionLoading(action);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Optimistic lock: fresh-read then compare
      const { data: freshVendor } = await supabase
        .from('vendors')
        .select('updated_at')
        .eq('id', vendorId)
        .single();

      if (freshVendor && freshVendor.updated_at !== capturedUpdatedAt) {
        showError('تم تعديل بيانات هذا المورد منذ فتح الصفحة. يرجى تحديث الصفحة والمراجعة مرة أخرى.');
        await fetchAllData();
        return;
      }

      // ── REJECTED: hard-delete the vendor and everything tied to them so
      // the email + phone are immediately free to re-register from scratch
      // (no leftover row, no FK fragments, no orphan storage files).
      if (action === 'rejected') {
        const vendorEmail = vendor.email || '';
        const vendorName  = vendor.full_name;
        const idImageUrl       = vendor.id_image || '';
        const profileImageUrl  = vendor.profile_image || '';

        // Pull travel-doc file URLs before delete (their FK row dies with cascade)
        const { data: travelDocs } = await supabase
          .from('vendor_travel_documents')
          .select('passport_file, visa_file')
          .eq('vendor_id', vendorId);

        // 1) Send the rejection email FIRST — once the row is gone, the edge
        //    function can't look up the vendor.
        try {
          const { data: emailResult, error: emailInvokeError } = await supabase.functions.invoke('send-vendor-status-email', {
            body: { vendor_id: vendorId, email_type: 'rejected', reason },
          });
          if (emailInvokeError || (emailResult && !emailResult.success)) {
            showWarning('سيتم رفض وحذف المورد، لكن فشل إرسال البريد الإلكتروني. يرجى إبلاغه يدوياً.');
          }
        } catch (emailErr) {
          console.warn('Rejection email send failed (non-fatal):', emailErr);
          showWarning('سيتم رفض وحذف المورد، لكن فشل إرسال البريد الإلكتروني. يرجى إبلاغه يدوياً.');
        }

        // 2) Best-effort wipe of every child table (covers tables whose FK
        //    might not have ON DELETE CASCADE).
        await Promise.all([
          supabase.from('equipment_suggestions').delete().eq('vendor_id', vendorId),
          supabase.from('vendor_equipment').delete().eq('vendor_id', vendorId),
          supabase.from('vendor_selected_fields').delete().eq('vendor_id', vendorId),
          supabase.from('vendor_travel_documents').delete().eq('vendor_id', vendorId),
          supabase.from('vendor_financial_data').delete().eq('vendor_id', vendorId),
          supabase.from('vendor_approval_log').delete().eq('vendor_id', vendorId),
          supabase.from('vendor_submission_snapshots').delete().eq('vendor_id', vendorId),
        ]);

        // 3) Drop the vendor row itself.
        const { error: delErr } = await supabase
          .from('vendors')
          .delete()
          .eq('id', vendorId);
        if (delErr) {
          console.error('Vendor hard-delete error:', delErr);
          showError('حدث خطأ أثناء حذف بيانات المورد');
          return;
        }

        // 4) Drafts — wipe by phone and (best-effort) by email so a clean
        //    re-registration from the same email starts from scratch.
        try {
          await supabase.from('vendor_registration_drafts').delete().eq('phone', vendor.phone);
          if (vendorEmail) {
            await supabase.from('vendor_registration_drafts').delete().eq('email', vendorEmail);
          }
        } catch (draftErr) {
          console.warn('Draft cleanup failed (non-fatal):', draftErr);
        }

        // 5) Storage files — best-effort.
        try {
          const paths: string[] = [];
          const extract = (url: string) => {
            if (!url) return null;
            const idx = url.indexOf('/vendor-images/');
            if (idx === -1) return null;
            return url.slice(idx + '/vendor-images/'.length);
          };
          const ip = extract(idImageUrl);
          const pp = extract(profileImageUrl);
          if (ip) paths.push(ip);
          if (pp) paths.push(pp);
          for (const td of (travelDocs ?? []) as any[]) {
            const tpp = extract(td.passport_file || '');
            const tvp = extract(td.visa_file || '');
            if (tpp) paths.push(tpp);
            if (tvp) paths.push(tvp);
          }
          if (paths.length > 0) {
            await supabase.storage.from('vendor-images').remove(paths);
          }
        } catch (storageErr) {
          console.warn('Storage cleanup failed (non-fatal):', storageErr);
        }

        showSuccess(`تم رفض وحذف بيانات المورد ${vendorName} بالكامل — البريد الإلكتروني متاح لتسجيل جديد`);
        onActionComplete();
        return;
      }

      // ── APPROVED / REVISION_REQUESTED: status update path (unchanged) ──
      const newUpdatedAt = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase
        .from('vendors')
        .update({ status: newStatus, updated_at: newUpdatedAt })
        .eq('id', vendorId)
        .select('id, status, updated_at');

      if (updateError) {
        console.error('Vendor update error:', updateError);
        showError('حدث خطأ أثناء تحديث حالة المورد');
        return;
      }

      if (!updated || updated.length === 0) {
        console.error('Vendor update returned 0 rows — likely RLS blocking');
        showError('ليس لديك صلاحية لتحديث حالة هذا المورد');
        return;
      }

      // Update captured timestamp so subsequent actions on same page work
      setCapturedUpdatedAt(updated[0].updated_at);

      // Log the action — for revision_requested we ALSO persist the structured
      // per-step / per-field flags so the vendor's resubmit wizard knows which
      // steps to surface and which fields to keep editable.
      await supabase.from('vendor_approval_log').insert([{
        vendor_id: vendorId,
        action,
        reason: reason || null,
        flags: flags ?? null,
        performed_by: user?.id || null,
      }]);

      // Send email notification
      const emailType = action === 'approved' ? 'approved' : 'revision_requested';
      try {
        const { data: emailResult, error: emailInvokeError } = await supabase.functions.invoke('send-vendor-status-email', {
          body: { vendor_id: vendorId, email_type: emailType, reason },
        });

        if (emailInvokeError || (emailResult && !emailResult.success)) {
          const code = emailResult?.error;
          if (code === 'invalid_vendor_email') {
            showWarning('تم تحديث حالة المورد بنجاح، لكن البريد الإلكتروني المسجل غير صالح ولم يتم إرسال الإشعار. يرجى مراجعة بيانات المورد.');
          } else {
            showWarning('تم تحديث حالة المورد بنجاح، لكن فشل إرسال البريد الإلكتروني. يرجى إبلاغ المورد يدوياً.');
          }
        }
      } catch (emailError) {
        console.error('Email send error:', emailError);
        showWarning('تم تحديث حالة المورد بنجاح، لكن فشل إرسال البريد الإلكتروني. يرجى إبلاغ المورد يدوياً.');
      }

      const actionLabels = {
        approved: 'تمت الموافقة على',
        revision_requested: 'تم طلب تعديلات من',
      };
      showSuccess(`${actionLabels[action as 'approved' | 'revision_requested']} المورد ${vendor.full_name}`);
      onActionComplete();
    } catch (error) {
      console.error('Error performing action:', error);
      showError('حدث خطأ أثناء تنفيذ الإجراء');
    } finally {
      setActionLoading(null);
      setShowApproveConfirm(false);
      setShowRejectModal(false);
      setShowRevisionModal(false);
      setActionReason('');
    }
  };

  const formatDate = (dateStr: string) => {
    const formatted = new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return toEnglishNumbers(formatted);
  };

  const getLogActionLabel = (action: string) => {
    const labels: Record<string, { label: string; description: string; color: string }> = {
      submitted: { label: 'تم التقديم', description: 'قام المورد بتقديم طلب التسجيل', color: '#3b82f6' },
      approved: { label: 'تمت الموافقة', description: 'قام مدير النظام بالموافقة على الطلب', color: '#22c55e' },
      rejected: { label: 'تم الرفض', description: 'قام مدير النظام برفض الطلب', color: '#ef4444' },
      revision_requested: { label: 'مطلوب تعديلات', description: 'قام مدير النظام بطلب تعديلات', color: '#f59e0b' },
      resubmitted: { label: 'إعادة تقديم', description: 'قام المورد بإعادة تقديم الطلب بعد التعديلات', color: '#8b5cf6' },
    };
    return labels[action] || { label: action, description: action, color: '#64748b' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
          <p style={{ color: 'var(--color-text-secondary)' }}>جاري تحميل بيانات الطلب...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
        لم يتم العثور على المورد
      </div>
    );
  }

  const badge = STATUS_LABELS[vendor.status] || STATUS_LABELS.pending_approval;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ArrowRight size={20} />
          </button>
          <div className="flex items-center gap-3">
            {vendor.profile_image ? (
              <SignedImage src={vendor.profile_image} alt={vendor.full_name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: 'var(--color-background-hover)', color: 'var(--color-text-muted)' }}>
                {vendor.full_name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{vendor.full_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="px-3 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: badge.bgColor, color: badge.color }}
                >
                  {badge.label}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  تقدم في {formatDate(vendor.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {(vendor.status === 'pending_approval' || vendor.status === 'revision_requested') && (
        <div
          className="flex items-center gap-3 p-4 rounded-lg border"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <button
            onClick={() => setShowApproveConfirm(true)}
            disabled={!!actionLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#22c55e' }}
          >
            {actionLoading === 'approved' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            قبول
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={!!actionLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#ef4444' }}
          >
            {actionLoading === 'rejected' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
            رفض
          </button>
          <button
            onClick={() => setShowRevisionModal(true)}
            disabled={!!actionLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#f59e0b' }}
          >
            {actionLoading === 'revision_requested' ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
            طلب تعديلات
          </button>
        </div>
      )}

      {/* Content: 3-column grid for first row, then full-width sections */}
      <div className="space-y-6">

        {/* Row 1: Identity | Contact | Files */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. Identity */}
          <Section title="بيانات الهوية" icon={User}>
            <InfoRow label="الاسم الكامل" value={vendor.full_name} />
            <InfoRow label="الجنسية" value={vendor.nationality} />
            <InfoRow label="نوع المورد" value={vendor.vendor_type === 'company' ? 'شركة' : 'فرد'} />
            <InfoRow label="رقم الهوية" value={vendor.id_number} dir="ltr" />
          </Section>

          {/* 2. Contact */}
          <Section title="بيانات التواصل" icon={Phone}>
            <InfoRow label="البريد الإلكتروني" value={vendor.email} dir="ltr" />
            <InfoRow label="رقم الجوال" value={vendor.phone ? toEnglishNumbers(vendor.phone) : undefined} dir="ltr" />
            <InfoRow label="المدينة الأساسية" value={vendor.primary_city} />
            {vendor.available_other_cities && vendor.other_cities && vendor.other_cities.length > 0 && (
              <InfoRow label="مدن أخرى" value={vendor.other_cities.join('، ')} />
            )}
            {vendor.portfolio_url && (
              <div className="flex items-start justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>البورتفوليو</span>
                <a href={vendor.portfolio_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium underline text-left max-w-[60%] break-all" style={{ color: 'var(--color-primary)' }} dir="ltr">
                  {vendor.portfolio_url}
                </a>
              </div>
            )}
          </Section>

          {/* 3. Files (profile + ID only) */}
          <Section title="الملفات والمستندات" icon={FileText}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vendor.profile_image && (
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>الصورة الشخصية</p>
                  <SignedImage
                    src={vendor.profile_image} alt="صورة شخصية"
                    className="w-full h-28 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => setLightboxImage({ url: vendor.profile_image!, title: 'الصورة الشخصية' })}
                  />
                </div>
              )}
              {vendor.id_image && (
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>صورة الهوية</p>
                  <SignedImage
                    src={vendor.id_image} alt="صورة الهوية"
                    className="w-full h-28 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => setLightboxImage({ url: vendor.id_image!, title: 'صورة الهوية' })}
                  />
                </div>
              )}
            </div>
            {!vendor.profile_image && !vendor.id_image && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>لا توجد ملفات مرفوعة</p>
            )}
          </Section>
        </div>

        {/* Row 2: Travel Docs | Financial | Service & Rates */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 4. Travel Documents — text data + images together */}
          <Section title="وثائق السفر" icon={MapPin}>
            {(() => {
              const passportDoc = travelDocs.find(d => d.passport_number || d.passport_issuing_country || d.passport_expiry_date || d.passport_file);
              const visaDoc = travelDocs.find(d => d.visa_country || d.visa_type || d.visa_file);
              const hasAny = passportDoc || visaDoc;
              if (!hasAny) return <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>لم يتم إدخال بيانات سفر</p>;
              return (
                <>
                  {passportDoc && (
                    <>
                      <InfoRow label="رقم جواز السفر" value={passportDoc.passport_number} dir="ltr" />
                      <InfoRow label="بلد التأشيرة" value={passportDoc.passport_issuing_country} />
                      {passportDoc.passport_file && (
                        <div className="mt-2 mb-3">
                          <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>صورة جواز السفر</p>
                          {passportDoc.passport_file.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <SignedImage
                              src={passportDoc.passport_file} alt="جواز السفر"
                              className="w-full h-28 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ borderColor: 'var(--color-border)' }}
                              onClick={() => setLightboxImage({ url: passportDoc.passport_file!, title: 'جواز السفر' })}
                            />
                          ) : (
                            <a href={passportDoc.passport_file} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm underline" style={{ color: 'var(--color-primary)' }}>
                              <FileText size={14} /> عرض جواز السفر
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {visaDoc && (
                    <>
                      <InfoRow label="بلد التأشيرة" value={visaDoc.visa_country} />
                      {visaDoc.visa_file && (
                        <div className="mt-2">
                          <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>مستند التأشيرة</p>
                          {visaDoc.visa_file.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <SignedImage
                              src={visaDoc.visa_file} alt="التأشيرة"
                              className="w-full h-28 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ borderColor: 'var(--color-border)' }}
                              onClick={() => setLightboxImage({ url: visaDoc.visa_file!, title: 'مستند التأشيرة' })}
                            />
                          ) : (
                            <a href={visaDoc.visa_file} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm underline" style={{ color: 'var(--color-primary)' }}>
                              <FileText size={14} /> عرض مستند التأشيرة
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              );
            })()}
          </Section>

          {/* 5. Financial */}
          <Section title="البيانات المالية" icon={CreditCard}>
            {financial ? (
              <>
                <InfoRow label="البنك" value={financial.banks?.name_ar || financial.banks?.name_en || (financial as any).bank_name} />
                <InfoRow label="اسم الحساب" value={financial.account_name || (financial as any).beneficiary_name} />
                <InfoRow label="IBAN" value={financial.iban} dir="ltr" />
                <InfoRow label="الأسعار تشمل ضريبة" value={financial.price_includes_tax ? 'نعم' : 'لا'} />
                {financial.company_name && <InfoRow label="اسم الشركة" value={financial.company_name} />}
                {financial.vat_number && <InfoRow label="الرقم الضريبي" value={financial.vat_number} dir="ltr" />}
              </>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>لا توجد بيانات مالية</p>
            )}
          </Section>

          {/* 6. Fields & Rates */}
          <Section title="المجالات والأسعار" icon={Briefcase}>
            {selectedFields.length > 0 ? (
              <div className="space-y-2">
                {selectedFields.map((field, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg" style={{ backgroundColor: 'var(--color-background-hover)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {field.vendor_fields?.name_ar || field.field_id}
                    </span>
                    <span className="text-sm tabular-nums" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                      {toEnglishNumbers(field.rate_from?.toString() || '0')} – {toEnglishNumbers(field.rate_to?.toString() || '0')} {field.currency}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>لم يتم تحديد مجالات</p>
            )}
          </Section>
        </div>

        {/* Row 3: Approval History Timeline (full width) */}
        {approvalLog.length > 0 && (
          <Section title="سجل المراجعة" icon={Clock}>
            <div style={{ position: 'relative', paddingRight: 24 }}>
              {/* Vertical line */}
              <div style={{
                position: 'absolute', right: 7, top: 8, bottom: 8, width: 2,
                background: 'var(--color-border)', borderRadius: 1,
              }} />
              {approvalLog.map((entry, idx) => {
                const actionInfo = getLogActionLabel(entry.action);
                const isFirst = idx === 0;
                return (
                  <div key={entry.id} style={{ position: 'relative', paddingBottom: idx < approvalLog.length - 1 ? 24 : 0 }}>
                    {/* Dot on the line */}
                    <div style={{
                      position: 'absolute', right: -24, top: 4,
                      width: isFirst ? 16 : 12, height: isFirst ? 16 : 12,
                      borderRadius: '50%', backgroundColor: actionInfo.color,
                      border: `3px solid var(--color-surface)`,
                      boxShadow: `0 0 0 2px ${actionInfo.color}33`,
                      marginRight: isFirst ? -2 : 0,
                    }} />
                    {/* Content */}
                    <div style={{
                      padding: '12px 16px', borderRadius: 10,
                      backgroundColor: isFirst ? `${actionInfo.color}08` : 'var(--color-background-hover)',
                      border: isFirst ? `1px solid ${actionInfo.color}22` : '1px solid transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: actionInfo.color }}>{actionInfo.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>{formatDate(entry.created_at)}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 2px 0' }}>
                        {(actionInfo as any).description}
                      </p>
                      {entry.reason && (
                        <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.7, margin: '6px 0 0 0', padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface)', borderRight: `3px solid ${actionInfo.color}` }}>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>ملاحظات المدير:</span>
                          {entry.reason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}
      </div>

      {/* Approve Confirmation */}
      {showApproveConfirm && (
        <ActionModal
          title="تأكيد الموافقة"
          message={`هل أنت متأكد من الموافقة على طلب التسجيل للمورد "${vendor.full_name}"؟ سيتمكن المورد من تسجيل الدخول فوراً.`}
          confirmText="تأكيد الموافقة"
          confirmColor="#22c55e"
          loading={actionLoading === 'approved'}
          onConfirm={() => performAction('approved')}
          onClose={() => setShowApproveConfirm(false)}
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <ActionModalWithReason
          title="رفض طلب التسجيل"
          message={`سيتم رفض طلب التسجيل للمورد "${vendor.full_name}". يرجى إدخال سبب الرفض.`}
          placeholder="سبب الرفض (مطلوب)..."
          confirmText="تأكيد الرفض"
          confirmColor="#ef4444"
          loading={actionLoading === 'rejected'}
          reason={actionReason}
          onReasonChange={setActionReason}
          onConfirm={() => performAction('rejected', actionReason)}
          onClose={() => { setShowRejectModal(false); setActionReason(''); }}
        />
      )}

      {/* Revision Modal — structured per-step / per-field flagger */}
      {showRevisionModal && (
        <RevisionFlagModal
          vendorName={vendor.full_name}
          loading={actionLoading === 'revision_requested'}
          onConfirm={(flags, summary) => {
            void performAction('revision_requested', summary, flags).then(() => {
              setShowRevisionModal(false);
              setActionReason('');
            });
          }}
          onClose={() => { setShowRevisionModal(false); setActionReason(''); }}
        />
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative flex flex-col items-center"
            style={{ maxWidth: '90vw', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', marginBottom: 16, padding: '0 4px',
            }}>
              <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{lightboxImage.title}</span>
              <button
                onClick={() => setLightboxImage(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
                  padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              >
                إغلاق ✕
              </button>
            </div>
            {/* Image */}
            <div style={{
              borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
              <SignedImage
                src={lightboxImage.url}
                alt={lightboxImage.title}
                style={{
                  display: 'block',
                  maxWidth: '94vw',
                  maxHeight: '88vh',
                  minWidth: '60vw',
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Helper Components ────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-lg border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} style={{ color: 'var(--color-primary)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, dir }: { label: string; value?: string | null; dir?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }} dir={dir}>{value}</span>
    </div>
  );
}

function ActionModal({ title, message, confirmText, confirmColor, loading, onConfirm, onClose }: {
  title: string; message: string; confirmText: string; confirmColor: string; loading: boolean;
  onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border font-medium" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            إلغاء
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white disabled:opacity-50" style={{ backgroundColor: confirmColor }}>
            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionModalWithReason({ title, message, placeholder, confirmText, confirmColor, loading, reason, onReasonChange, onConfirm, onClose }: {
  title: string; message: string; placeholder: string; confirmText: string; confirmColor: string;
  loading: boolean; reason: string; onReasonChange: (v: string) => void;
  onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border text-sm mb-4 resize-none focus:outline-none focus:ring-2"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          dir="rtl"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border font-medium" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !reason.trim()}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: confirmColor }}
          >
            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
