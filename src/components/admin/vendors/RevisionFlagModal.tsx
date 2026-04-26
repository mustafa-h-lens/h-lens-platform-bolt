import { useMemo, useState } from 'react';
import { Loader2, AlertTriangle, Check } from 'lucide-react';
import { VENDOR_REGISTRATION_STEPS, RevisionFlags } from '../../../lib/vendorRegistrationSteps';

interface Props {
  vendorName: string;
  loading: boolean;
  onConfirm: (flags: RevisionFlags, summary: string) => void;
  onClose: () => void;
}

interface StepFlagState {
  enabled: boolean;
  fields: string[];
  comment: string;
}

export const RevisionFlagModal = ({ vendorName, loading, onConfirm, onClose }: Props) => {
  const [flagsByStep, setFlagsByStep] = useState<Record<string, StepFlagState>>(() => {
    const init: Record<string, StepFlagState> = {};
    for (const step of VENDOR_REGISTRATION_STEPS) {
      init[step.id] = { enabled: false, fields: [], comment: '' };
    }
    return init;
  });

  const toggleStep = (stepId: string) => {
    setFlagsByStep((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], enabled: !prev[stepId].enabled },
    }));
  };

  const toggleField = (stepId: string, fieldId: string) => {
    setFlagsByStep((prev) => {
      const cur = prev[stepId];
      const has = cur.fields.includes(fieldId);
      return {
        ...prev,
        [stepId]: {
          ...cur,
          fields: has ? cur.fields.filter((f) => f !== fieldId) : [...cur.fields, fieldId],
        },
      };
    });
  };

  const setComment = (stepId: string, comment: string) => {
    setFlagsByStep((prev) => ({ ...prev, [stepId]: { ...prev[stepId], comment } }));
  };

  const { enabledSteps, flaggedFieldCount, canSubmit, validationError } = useMemo(() => {
    const enabled = VENDOR_REGISTRATION_STEPS.filter((s) => flagsByStep[s.id]?.enabled);
    const fieldCount = enabled.reduce((acc, s) => acc + flagsByStep[s.id].fields.length, 0);
    let err: string | null = null;
    if (enabled.length === 0) {
      err = 'اختر خطوة واحدة على الأقل للإبلاغ بها';
    } else {
      for (const s of enabled) {
        if (!flagsByStep[s.id].comment.trim()) {
          err = `أضف تعليقاً على الخطوة "${s.label}"`;
          break;
        }
      }
    }
    return {
      enabledSteps: enabled,
      flaggedFieldCount: fieldCount,
      canSubmit: err === null,
      validationError: err,
    };
  }, [flagsByStep]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const flags: RevisionFlags = { steps: {} };
    const summaryLines: string[] = [];
    for (const step of enabledSteps) {
      const state = flagsByStep[step.id];
      flags.steps[step.id] = { comment: state.comment.trim(), fields: state.fields };
      const fieldLabels = state.fields
        .map((fId) => step.fields.find((f) => f.id === fId)?.label)
        .filter(Boolean)
        .join('، ');
      summaryLines.push(
        `• ${step.label}${fieldLabels ? ` (${fieldLabels})` : ''}: ${state.comment.trim()}`
      );
    }
    onConfirm(flags, summaryLines.join('\n'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col"
        data-mobile-modal="true"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
              <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                طلب تعديلات
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                حدد الخطوات والحقول التي يحتاج المورد "{vendorName}" لتصحيحها
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {VENDOR_REGISTRATION_STEPS.filter((s) => s.fields.length > 0).map((step) => {
            const state = flagsByStep[step.id];
            const isFlagged = state.enabled;
            return (
              <div
                key={step.id}
                className="rounded-lg border transition-all"
                style={{
                  backgroundColor: isFlagged ? 'rgba(245,158,11,0.04)' : 'var(--color-background-hover)',
                  borderColor: isFlagged ? 'rgba(245,158,11,0.35)' : 'var(--color-border)',
                }}
              >
                {/* Step toggle row */}
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.enabled}
                    onChange={() => toggleStep(step.id)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#f59e0b' }}
                  />
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {step.label}
                  </span>
                  {isFlagged && state.fields.length > 0 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
                    >
                      {state.fields.length} حقل
                    </span>
                  )}
                </label>

                {/* Expanded fields + comment when flagged */}
                {isFlagged && (
                  <div className="px-4 pb-4 pt-1 space-y-3">
                    <div>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                        حدد الحقول (اختياري — إذا تُرك فارغاً، المورد يعدّل كامل الخطوة):
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {step.fields.map((field) => {
                          const selected = state.fields.includes(field.id);
                          return (
                            <label
                              key={field.id}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer text-sm transition-colors"
                              style={{
                                backgroundColor: selected ? 'rgba(245,158,11,0.08)' : 'transparent',
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleField(step.id, field.id)}
                                className="w-3.5 h-3.5 rounded"
                                style={{ accentColor: '#f59e0b' }}
                              />
                              <span>{field.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                        التعليق للمورد <span style={{ color: '#ef4444' }}>*</span>
                      </p>
                      <textarea
                        value={state.comment}
                        onChange={(e) => setComment(step.id, e.target.value)}
                        placeholder="اشرح للمورد ما الذي يحتاج إلى التصحيح في هذه الخطوة..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-md border text-sm resize-none focus:outline-none focus:ring-2"
                        style={{
                          backgroundColor: 'var(--color-surface)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                        dir="rtl"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between gap-3 flex-wrap"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {enabledSteps.length > 0 ? (
              <span>
                <strong style={{ color: '#f59e0b' }}>{enabledSteps.length}</strong> خطوة
                {flaggedFieldCount > 0 && <> · <strong style={{ color: '#f59e0b' }}>{flaggedFieldCount}</strong> حقل</>}
              </span>
            ) : (
              <span>لم تُحدد أي خطوة بعد</span>
            )}
            {validationError && (
              <span className="block mt-1" style={{ color: '#ef4444' }}>{validationError}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border text-sm font-medium"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#f59e0b' }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              إرسال طلب التعديلات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
