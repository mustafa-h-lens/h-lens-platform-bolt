import { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, PenSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { getStepLabel, getFieldLabel } from '../../../lib/vendorRegistrationSteps';

interface FlaggedStep {
  id: string;
  comment?: string;
  fields?: string[];
}

interface Props {
  vendorId: string;
  onStartEdits: (flaggedSteps: FlaggedStep[]) => void;
}

export const RevisionCenter = ({ vendorId, onStartEdits }: Props) => {
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<string | null>(null);
  const [flaggedSteps, setFlaggedSteps] = useState<FlaggedStep[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('vendor_approval_log')
          .select('reason, flags')
          .eq('vendor_id', vendorId)
          .eq('action', 'revision_requested')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setReason(data?.reason || null);

        const flagsSteps: Record<string, { comment?: string; fields?: string[] }> | undefined =
          data?.flags?.steps;

        if (flagsSteps && Object.keys(flagsSteps).length > 0) {
          setFlaggedSteps(
            Object.entries(flagsSteps).map(([id, v]) => ({ id, comment: v.comment, fields: v.fields }))
          );
        } else {
          setFlaggedSteps([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [vendorId]);

  if (loading) return null;

  const hasStructured = flaggedSteps.length > 0;

  return (
    <div
      className="relative px-4 py-4 sm:px-5 sm:py-[18px] rounded-2xl mb-4 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg,rgba(245,158,11,0.12) 0%,rgba(8,18,38,0.7) 100%)',
        border: '1px solid rgba(245,158,11,0.4)',
      }}
    >
      <div className={`flex items-start gap-3 ${hasStructured ? 'mb-3.5' : 'mb-2.5'}`}>
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.35)' }}
        >
          <AlertCircle size={18} style={{ color: '#fbbf24' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-extrabold text-white">
            {hasStructured ? `مطلوب تعديلات على ${flaggedSteps.length} خطوة` : 'مطلوب تعديلات على طلبك'}
          </div>
          <div className="text-xs mt-0.5 leading-[1.7]" style={{ color: 'rgba(226,232,240,0.65)' }}>
            {hasStructured
              ? 'راجع التفاصيل أدناه ثم اضغط "ابدأ التعديلات" لتحديث الخطوات المطلوبة فقط.'
              : 'مراجعة الملاحظات وتعديل البيانات ثم إعادة التقديم.'}
          </div>
        </div>
      </div>

      {hasStructured ? (
        <div className="flex flex-col gap-2 mb-3.5">
          {flaggedSteps.map((step) => (
            <div
              key={step.id}
              className="px-3 py-2.5 rounded-[10px]"
              style={{ background: 'rgba(8,18,38,0.6)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[13px] font-bold" style={{ color: '#fbbf24' }}>
                  {getStepLabel(step.id)}
                </span>
                {!!step.fields?.length && (
                  <span className="text-[11px]" style={{ color: 'rgba(226,232,240,0.5)' }}>
                    {step.fields.length} حقل
                  </span>
                )}
              </div>
              {!!step.fields?.length && (
                <div className="text-[11px] mt-1" style={{ color: 'rgba(226,232,240,0.55)' }}>
                  {step.fields.map((f) => getFieldLabel(step.id, f)).join('، ')}
                </div>
              )}
              {step.comment && (
                <div className="text-xs mt-1.5 leading-[1.7]" style={{ color: 'rgba(226,232,240,0.85)' }}>
                  {step.comment}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        reason && (
          <div
            className="px-3 py-2.5 rounded-[10px] mb-3.5"
            style={{ background: 'rgba(8,18,38,0.6)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <div className="text-[11px] font-bold mb-1" style={{ color: '#fbbf24' }}>ملاحظات المراجع:</div>
            <div className="text-xs leading-[1.8]" style={{ color: 'rgba(226,232,240,0.8)' }}>{reason}</div>
          </div>
        )
      )}

      <button
        type="button"
        onClick={() => onStartEdits(flaggedSteps)}
        className="vp-revision-start-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] border-0 text-white text-[13px] font-bold cursor-pointer w-full max-w-[240px] font-[inherit]"
        style={{
          background: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)',
          boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
        }}
      >
        <PenSquare size={15} />
        ابدأ التعديلات
        <ChevronLeft size={14} />
      </button>
    </div>
  );
};
