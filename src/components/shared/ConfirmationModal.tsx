import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  onConfirm,
  onCancel,
  type = 'warning',
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  const iconColorClass =
    type === 'danger' ? 'ci-red' :
    type === 'warning' ? 'ci-amber' :
    'ci-blue';

  return createPortal(
    <div className="modal-bg" onClick={onCancel}>
      <div
        className="modal"
        style={{ maxWidth: '28rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px' }}>
          <button
            onClick={onCancel}
            className="modal-close"
            style={{ position: 'absolute', top: 16, left: 16 }}
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div className={`card-icon ${iconColorClass}`} style={{ width: 56, height: 56, marginBottom: 16 }}>
              <AlertTriangle size={28} />
            </div>

            <h3 className="modal-ttl" style={{ marginBottom: 8 }} dir="rtl">
              {title}
            </h3>

            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }} dir="rtl">
              {message}
            </p>

            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
                {cancelText}
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={onConfirm}>
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
