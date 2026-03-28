import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const typeClassMap: Record<ToastType, string> = {
  success: 't-ok',
  error: 't-err',
  warning: 't-warn',
  info: 't-info',
};

const typeIconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={20} />,
  error: <XCircle size={20} />,
  warning: <AlertCircle size={20} />,
  info: <Info size={20} />,
};

export const Toast = ({ id, type, message, duration = 5000, onClose }: ToastProps) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <div className={`toast ${typeClassMap[type]}`} role="alert">
      <span className="toast-ico">{typeIconMap[type]}</span>
      <div style={{ flex: 1 }}>
        <div className="toast-msg" dir="rtl">{message}</div>
      </div>
      <button
        onClick={() => onClose(id)}
        className="toast-close"
        aria-label="إغلاق"
      >
        <X size={16} />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
  }>;
  onClose: (id: string) => void;
}

export const ToastContainer = ({ toasts, onClose }: ToastContainerProps) => {
  return createPortal(
    <div className="toast-container" style={{ position: 'fixed', top: 16, left: 16, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8 }} dir="ltr">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={onClose}
        />
      ))}
    </div>,
    document.body
  );
};
