import { Check, Clock, FileCheck, Send } from 'lucide-react';
import type { VendorStatus } from '../../../lib/vendorStatusMachine';
import { accessLevelFor } from '../../../lib/vendorAccessLevel';

type Step = { id: 'submitted' | 'review' | 'approved'; label: string; hint: string; icon: typeof Send };

const STEPS: Step[] = [
  { id: 'submitted', label: 'تم التقديم',    hint: 'استلمنا طلبك',                 icon: Send },
  { id: 'review',    label: 'قيد المراجعة',   hint: 'جارٍ التحقق من بياناتك',        icon: Clock },
  { id: 'approved',  label: 'تم الاعتماد',     hint: 'ستحصل على وصول كامل',          icon: FileCheck },
];

export const StatusTimeline = ({
  status,
  submittedAt,
}: {
  status: VendorStatus | string;
  submittedAt?: string;
}) => {
  const access = accessLevelFor(status);
  const active = access === 'full' ? 2 : 1; // 0=submitted, 1=review, 2=approved

  const submittedLabel = submittedAt
    ? new Date(submittedAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const isRevision = status === 'revision_requested';
  const accentStart = isRevision ? '#f59e0b' : '#2563eb';
  const accentEnd = isRevision ? '#d97706' : '#4f46e5';
  const doneColor = '#16a34a';

  // Progress bar fill percentage: halfway between current step and next
  const progressPct = access === 'full'
    ? 100
    : isRevision
      ? 35
      : 50;

  return (
    <div className="vp-status-card">
      {/* Ambient decorative orb */}
      <div className="vp-status-orb" aria-hidden />

      {/* Header row */}
      <div className="vp-status-head">
        <div className="vp-status-head-main">
          <div className="vp-status-title">حالة طلب الاعتماد</div>
          {submittedLabel && (
            <div className="vp-status-sub">
              تم التقديم في {submittedLabel} · عادةً خلال 1–3 أيام عمل
            </div>
          )}
        </div>
        <span
          className="vp-status-badge"
          style={{
            background: isRevision ? 'rgba(245,158,11,0.14)' : 'rgba(37,99,235,0.12)',
            borderColor: isRevision ? 'rgba(245,158,11,0.4)' : 'rgba(37,99,235,0.35)',
            color: isRevision ? '#b45309' : '#1d4ed8',
          }}
        >
          <span
            className="vp-status-badge-dot"
            style={{ background: isRevision ? '#f59e0b' : '#2563eb' }}
          />
          {isRevision ? 'مطلوب تعديلات' : access === 'full' ? 'معتمد' : 'قيد المراجعة'}
        </span>
      </div>

      {/* Timeline rail */}
      <div className="vp-timeline">
        <div className="vp-timeline-track" />
        <div
          className="vp-timeline-fill"
          style={{
            width: `${progressPct}%`,
            background: `linear-gradient(90deg, ${accentStart}, ${accentEnd})`,
          }}
        />

        <div className="vp-timeline-steps">
          {STEPS.map((s, i) => {
            const isDone = i < active;
            const isCurrent = i === active;
            const Icon = isDone ? Check : s.icon;

            const nodeBg = isDone
              ? doneColor
              : isCurrent
                ? accentStart
                : 'var(--color-surface)';
            const nodeBorder = isDone
              ? doneColor
              : isCurrent
                ? accentStart
                : 'var(--color-border)';
            const iconColor = isDone || isCurrent ? '#fff' : 'var(--color-text-muted)';
            const labelColor = isDone
              ? doneColor
              : isCurrent
                ? accentStart
                : 'var(--color-text-muted)';

            return (
              <div key={s.id} className="vp-timeline-step">
                <div
                  className={`vp-timeline-node ${isCurrent ? 'is-current' : ''}`}
                  style={{
                    background: nodeBg,
                    borderColor: nodeBorder,
                    boxShadow: isCurrent
                      ? `0 0 0 4px ${accentStart}22, 0 4px 14px ${accentStart}44`
                      : isDone
                        ? `0 2px 8px ${doneColor}33`
                        : 'none',
                  }}
                >
                  <Icon size={15} style={{ color: iconColor }} strokeWidth={2.5} />
                </div>

                <div
                  className="vp-timeline-label"
                  style={{ color: labelColor, fontWeight: isCurrent || isDone ? 700 : 500 }}
                >
                  {s.label}
                </div>
                <div className="vp-timeline-hint">{s.hint}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
