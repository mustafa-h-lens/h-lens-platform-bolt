import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const maxWidthMap: Record<string, string> = {
  sm: '24rem',
  md: '28rem',
  lg: '32rem',
  xl: '36rem',
  '2xl': '42rem',
  '3xl': '48rem',
  '4xl': '56rem',
};

export const Modal = ({ isOpen, onClose, title, children, maxWidth = '4xl' }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-bg" onClick={onClose}>
      <div
        className="modal"
        data-mobile-modal="true"
        style={{ maxWidth: maxWidthMap[maxWidth] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-hdr">
          <h2 className="modal-ttl">{title}</h2>
          <button onClick={onClose} className="modal-close" type="button">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
