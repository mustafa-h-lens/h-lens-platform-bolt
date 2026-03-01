import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ToastContainer, ToastType } from '../components/shared/Toast';
import { ConfirmationModal } from '../components/shared/ConfirmationModal';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface NotificationContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    options: ConfirmationOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const showToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast('success', message);
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast('error', message);
  }, [showToast]);

  const showWarning = useCallback((message: string) => {
    showToast('warning', message);
  }, [showToast]);

  const showInfo = useCallback((message: string) => {
    showToast('info', message);
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmationState({ isOpen: true, options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmationState) {
      confirmationState.resolve(true);
      setConfirmationState(null);
    }
  }, [confirmationState]);

  const handleCancel = useCallback(() => {
    if (confirmationState) {
      confirmationState.resolve(false);
      setConfirmationState(null);
    }
  }, [confirmationState]);

  return (
    <NotificationContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        confirm,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      {confirmationState && (
        <ConfirmationModal
          isOpen={confirmationState.isOpen}
          title={confirmationState.options.title}
          message={confirmationState.options.message}
          confirmText={confirmationState.options.confirmText}
          cancelText={confirmationState.options.cancelText}
          type={confirmationState.options.type}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </NotificationContext.Provider>
  );
};
