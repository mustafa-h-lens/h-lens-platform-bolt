import { useState, useRef, useCallback } from 'react';
import { UploadCloud, X, FileText } from 'lucide-react';

interface FileUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  onFile?: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  hint?: string;
  preview?: 'image' | 'file' | 'none';
  previewSize?: number;
  disabled?: boolean;
  uploading?: boolean;
}

export const FileUploader = ({
  value,
  onChange,
  onFile,
  accept = 'image/*',
  maxSizeMB = 5,
  label,
  hint,
  preview = 'image',
  previewSize = 80,
  disabled = false,
  uploading = false,
}: FileUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localPreview, setLocalPreview] = useState('');

  const displayPreview = localPreview || value;
  const isImage = preview === 'image' && displayPreview;

  const handleFile = useCallback((file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`حجم الملف يجب أن يكون أقل من ${maxSizeMB} ميجابايت`);
      return;
    }

    if (preview === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => setLocalPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    if (onFile) {
      onFile(file);
    }
  }, [maxSizeMB, onFile, preview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalPreview('');
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatAccept = () => {
    if (accept === 'image/*') return 'PNG, JPG, SVG';
    if (accept.includes('pdf')) return 'PDF';
    return accept.split(',').map(a => a.trim().replace('.', '').toUpperCase()).join(', ');
  };

  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <div
        className={`upload-area ${dragOver ? 'dragover' : ''}`}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative' }}
      >
        {uploading ? (
          <>
            <div style={{ width: 28, height: 28, border: '3px solid var(--border-soft)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <strong>جاري الرفع...</strong>
          </>
        ) : isImage ? (
          <div style={{ position: 'relative' }}>
            <img src={displayPreview} alt="Preview" style={{ width: previewSize, height: previewSize, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
            <button
              type="button"
              onClick={clear}
              style={{
                position: 'absolute', top: -6, left: -6,
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--danger)', color: '#fff',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12,
              }}
            >
              <X size={12} />
            </button>
          </div>
        ) : displayPreview && preview === 'file' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={22} style={{ color: 'var(--accent-lighter)' }} />
            <strong style={{ fontSize: 12 }}>ملف مرفوع</strong>
            <button
              type="button"
              onClick={clear}
              style={{ marginRight: 'auto', color: 'var(--danger-text)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
            >
              إزالة
            </button>
          </div>
        ) : (
          <>
            <UploadCloud size={28} />
            <strong>اسحب الملف هنا أو انقر للرفع</strong>
            <span>{formatAccept()} — حجم أقصى {maxSizeMB}MB</span>
          </>
        )}
      </div>
      {hint && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</span>}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />
    </div>
  );
};
