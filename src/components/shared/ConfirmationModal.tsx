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

  const getIconColor = () => {
    switch (type) {
      case 'danger':
        return 'text-blue-700';
      case 'warning':
        return 'text-blue-600';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-scaleIn">
        <div className="p-6">
          <button
            onClick={onCancel}
            className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="p-3 rounded-full mb-4"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, white)' }}>
              <AlertTriangle className={`w-8 h-8 ${getIconColor()}`} />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2" dir="rtl">
              {title}
            </h3>

            <p className="text-slate-600 mb-6" dir="rtl">
              {message}
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
