import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast = ({ id, type, message, duration = 5000, onClose }: ToastProps) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-white" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-white" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-white" />;
      case 'info':
        return <Info className="w-5 h-5 text-white" />;
    }
  };

  const getBackgroundClass = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      case 'warning':
        return 'bg-orange-500';
      case 'info':
        return 'bg-blue-600';
    }
  };

  return (
    <div
      className={`${getBackgroundClass()} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[320px] max-w-md animate-slideIn backdrop-blur-sm border border-white/20`}
      role="alert"
      style={{
        animation: 'slideIn 0.3s ease-out, pulse 0.5s ease-in-out'
      }}
    >
      <div className="animate-bounce-once">
        {getIcon()}
      </div>
      <p className="flex-1 text-sm font-medium" dir="rtl">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="p-1 hover:bg-white/20 rounded transition-colors"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4" />
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
  return (
    <div className="fixed top-4 left-4 z-[9999] flex flex-col gap-2" dir="ltr">
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
    </div>
  );
};
