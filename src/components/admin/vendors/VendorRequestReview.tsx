import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, XCircle, Edit3, Clock, User, Phone, MapPin, Briefcase, CreditCard, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { toEnglishNumbers } from '../../../lib/numberUtils';
import { canTransition, STATUS_LABELS, VendorStatus } from '../../../lib/vendorStatusMachine';

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
  status: VendorStatus;
  created_at: string;
  updated_at: string;
}

interface FinancialData {
  bank_id?: string;
  account_name?: string;
  iban?: string;
  price_includes_tax?: boolean;
  banks?: { name_ar?: string; name_en?: string };
}

interface TravelDoc {
  passport_number?: string;
  visa_country?: string;
  visa_file?: string;
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

  const performAction = async (action: 'approved' | 'rejected' | 'revision_requested', reason?: string) => {
    if (!vendor || !capturedUpdatedAt) return;

    const newStatus: VendorStatus = action === 'approved' ? 'active' : action === 'rejected' ? 'rejected' : 'revision_requested';

    if (!canTransition(vendor.status, newStatus)) {
      showError('لا يمكن تنفيذ هذا الإجراء على الحالة الحالية');
      return;
    }

    setActionLoading(action);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Optimistic lock check
      const { data: updated, error: updateError } = await supabase
        .from('vendors')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', vendorId)
        .eq('updated_at', capturedUpdatedAt)
        .select()
        .single();

      if (updateError || !updated) {
        showError('تم تعديل بيانات هذا المورد منذ فتح الصفحة. يرجى تحديث الصفحة والمراجعة مرة أخرى.');
        await fetchAllData();
        return;
      }

      // Log the action
      await supabase.from('vendor_approval_log').insert([{
        vendor_id: vendorId,
        action,
        reason: reason || null,
        performed_by: user?.id || null,
      }]);

      // Delete draft if rejecting
      if (action === 'rejected') {
        await supabase.from('vendor_registration_drafts').delete().eq('phone', vendor.phone);
      }

      // Send email notification
      const emailType = action === 'approved' ? 'approved' : action === 'rejected' ? 'rejected' : 'revision_requested';
      try {
        const { data: emailResult } = await supabase.functions.invoke('send-vendor-status-email', {
          body: { vendor_id: vendorId, email_type: emailType, reason },
        });

        if (emailResult && !emailResult.success) {
          showWarning('تم تحديث حالة المورد بنجاح، لكن فشل إرسال البريد الإلكتروني. يرجى إبلاغ المورد يدوياً.');
        }
      } catch (emailError) {
        console.error('Email send error:', emailError);
        showWarning('تم تحديث حالة المورد بنجاح، لكن فشل إرسال البريد الإلكتروني. يرجى إبلاغ المورد يدوياً.');
      }

      const actionLabels = {
        approved: 'تمت الموافقة على',
        rejected: 'تم رفض',
        revision_requested: 'تم طلب تعديلات من',
      };
      showSuccess(`${actionLabels[action]} المورد ${vendor.full_name}`);
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
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLogActionLabel = (action: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      submitted: { label: 'تم التقديم', color: '#3b82f6' },
      approved: { label: 'تمت الموافقة', color: '#22c55e' },
      rejected: { label: 'تم الرفض', color: '#ef4444' },
      revision_requested: { label: 'مطلوب تعديلات', color: '#f59e0b' },
      resubmitted: { label: 'إعادة تقديم', color: '#8b5cf6' },
    };
    return labels[action] || { label: action, color: '#64748b' };
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
              <img src={vendor.profile_image} alt={vendor.full_name} className="w-14 h-14 rounded-full object-cover" />
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
            {actionLoading === 'revision_requested' ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />}
            طلب تعديلات
          </button>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Section title="البيانات الشخصية" icon={User}>
          <InfoRow label="الاسم الكامل" value={vendor.full_name} />
          <InfoRow label="الجنسية" value={vendor.nationality} />
          <InfoRow label="نوع المورد" value={vendor.vendor_type === 'company' ? 'شركة' : 'فرد'} />
          <InfoRow label="رقم الهوية" value={vendor.id_number} />
          <InfoRow label="البريد الإلكتروني" value={vendor.email} dir="ltr" />
          <InfoRow label="رقم الجوال" value={vendor.phone ? toEnglishNumbers(vendor.phone) : undefined} dir="ltr" />
          <InfoRow label="المدينة الأساسية" value={vendor.primary_city} />
          {vendor.available_other_cities && vendor.other_cities && vendor.other_cities.length > 0 && (
            <InfoRow label="مدن أخرى" value={vendor.other_cities.join('، ')} />
          )}
        </Section>

        {/* ID & Profile Images */}
        <Section title="المستندات" icon={FileText}>
          <div className="grid grid-cols-2 gap-4">
            {vendor.profile_image && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>الصورة الشخصية</p>
                <img src={vendor.profile_image} alt="صورة شخصية" className="w-full h-32 object-cover rounded-lg border" style={{ borderColor: 'var(--color-border)' }} />
              </div>
            )}
            {vendor.id_image && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>صورة الهوية</p>
                <img src={vendor.id_image} alt="صورة الهوية" className="w-full h-32 object-cover rounded-lg border" style={{ borderColor: 'var(--color-border)' }} />
              </div>
            )}
          </div>
          {travelDocs.length > 0 && travelDocs[0].visa_file && (
            <div className="mt-4">
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>مستند التأشيرة</p>
              <a href={travelDocs[0].visa_file} target="_blank" rel="noopener noreferrer"
                className="text-sm underline" style={{ color: 'var(--color-primary)' }}>
                عرض المستند
              </a>
            </div>
          )}
        </Section>

        {/* Travel Info */}
        {travelDocs.length > 0 && (
          <Section title="بيانات السفر" icon={MapPin}>
            <InfoRow label="رقم جواز السفر" value={travelDocs[0].passport_number} />
            <InfoRow label="بلد التأشيرة" value={travelDocs[0].visa_country} />
          </Section>
        )}

        {/* Financial */}
        {financial && (
          <Section title="البيانات المالية" icon={CreditCard}>
            <InfoRow label="البنك" value={financial.banks?.name_ar || financial.banks?.name_en} />
            <InfoRow label="اسم الحساب" value={financial.account_name} />
            <InfoRow label="IBAN" value={financial.iban} dir="ltr" />
            <InfoRow label="الأسعار تشمل ضريبة" value={financial.price_includes_tax ? 'نعم' : 'لا'} />
          </Section>
        )}

        {/* Fields & Rates */}
        {selectedFields.length > 0 && (
          <Section title="المجالات والأسعار" icon={Briefcase}>
            <div className="space-y-2">
              {selectedFields.map((field, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: 'var(--color-background-hover)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {field.vendor_fields?.name_ar || field.field_id}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                    {toEnglishNumbers(field.rate_from?.toString() || '0')} - {toEnglishNumbers(field.rate_to?.toString() || '0')} {field.currency}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Approval History */}
        {approvalLog.length > 0 && (
          <Section title="سجل المراجعة" icon={Clock}>
            <div className="space-y-3">
              {approvalLog.map((entry) => {
                const actionInfo = getLogActionLabel(entry.action);
                return (
                  <div key={entry.id} className="flex gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-background-hover)' }}>
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: actionInfo.color }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: actionInfo.color }}>{actionInfo.label}</span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatDate(entry.created_at)}</span>
                      </div>
                      {entry.reason && (
                        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{entry.reason}</p>
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

      {/* Revision Modal */}
      {showRevisionModal && (
        <ActionModalWithReason
          title="طلب تعديلات"
          message={`سيتم إرسال طلب تعديلات للمورد "${vendor.full_name}". يرجى إدخال الملاحظات والتعديلات المطلوبة.`}
          placeholder="الملاحظات والتعديلات المطلوبة (مطلوب)..."
          confirmText="إرسال طلب التعديلات"
          confirmColor="#f59e0b"
          loading={actionLoading === 'revision_requested'}
          reason={actionReason}
          onReasonChange={setActionReason}
          onConfirm={() => performAction('revision_requested', actionReason)}
          onClose={() => { setShowRevisionModal(false); setActionReason(''); }}
        />
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
