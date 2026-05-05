import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { detectDocumentBBox, BBox } from '../../utils/detectDocumentBBox';

interface DocumentCropperProps {
  open: boolean;
  file: File | null;
  aspect: number;
  docLabel: string;
  onSave: (cropped: File) => void;
  onCancel: () => void;
  onSkip?: (original: File) => void;
}

const OUTPUT_LONG_EDGE = 1600;
const OUTPUT_QUALITY = 0.92;

export default function DocumentCropper({
  open,
  file,
  aspect,
  docLabel,
  onSave,
  onCancel,
  onSkip,
}: DocumentCropperProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const bboxCacheRef = useRef<{ file: File; aspect: number; bbox: BBox } | null>(null);

  useEffect(() => {
    if (!open || !file) return;
    setCrop(undefined);
    setCompletedCrop(null);

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [open, file]);

  const handleImageLoad = useCallback(async (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!file) return;
    const img = e.currentTarget;

    let bbox: BBox;
    const cached = bboxCacheRef.current;
    if (cached && cached.file === file && cached.aspect === aspect) {
      bbox = cached.bbox;
    } else {
      try {
        bbox = await detectDocumentBBox(img);
      } catch {
        bbox = { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
      }
      bboxCacheRef.current = { file, aspect, bbox };
    }

    // Convert detected bbox (in image's natural pixel coords) to percent-based
    // crop, which is what react-image-crop expects when the image is
    // displayed at a different size than its natural resolution.
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const xPct = (bbox.x / naturalW) * 100;
    const yPct = (bbox.y / naturalH) * 100;
    const wPct = (bbox.width / naturalW) * 100;
    const hPct = (bbox.height / naturalH) * 100;

    // Snap to the locked aspect ratio, centered on the detected region.
    const cropMaybe = makeAspectCrop(
      { unit: '%', width: wPct, height: hPct, x: xPct, y: yPct },
      aspect,
      naturalW,
      naturalH,
    );
    // Ensure it stays inside the image; if it doesn't fit, center a 90% crop.
    const cropFinal: Crop =
      cropMaybe.width > 0 && cropMaybe.height > 0
        ? cropMaybe
        : centerCrop(makeAspectCrop({ unit: '%', width: 90, height: 90, x: 5, y: 5 }, aspect, naturalW, naturalH), naturalW, naturalH);

    setCrop(cropFinal);
  }, [file, aspect]);

  const handleSave = async () => {
    if (!file || !completedCrop || !imgRef.current || completedCrop.width <= 0 || completedCrop.height <= 0) return;
    setBusy(true);
    try {
      const cropped = await renderCroppedFile(imgRef.current, completedCrop, file.name);
      onSave(cropped);
    } catch (e) {
      console.error('Cropper save failed', e);
      setBusy(false);
    }
  };

  const handleReset = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const reset = centerCrop(
      makeAspectCrop({ unit: '%', width: 90, height: 90, x: 5, y: 5 }, aspect, img.naturalWidth, img.naturalHeight),
      img.naturalWidth,
      img.naturalHeight,
    );
    setCrop(reset);
  };

  if (!open || !file) return null;

  return createPortal(
    <div style={overlayStyle} onClick={onCancel}>
      <div style={cardStyle} onClick={e => e.stopPropagation()} dir="rtl">

        <div style={headerStyle}>
          <h3 style={titleStyle}>اقتطاع {docLabel}</h3>
          <button onClick={onCancel} style={iconBtnStyle} aria-label="إلغاء">✕</button>
        </div>

        <div style={hintStyle}>
          اسحب زوايا المربع لتكبير/تصغير منطقة الاقتطاع. الصورة ثابتة — فقط حجم المربع يتغير.
        </div>

        <div style={cropAreaStyle}>
          {imageUrl && (
            <ReactCrop
              crop={crop}
              onChange={(_, pct) => setCrop(pct)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              keepSelection
              minWidth={20}
              minHeight={20}
              ruleOfThirds
            >
              <img
                ref={imgRef}
                src={imageUrl}
                onLoad={handleImageLoad}
                alt="document"
                style={{ maxWidth: '100%', maxHeight: '58vh', display: 'block', userSelect: 'none' }}
                draggable={false}
              />
            </ReactCrop>
          )}
        </div>

        <div style={footerStyle}>
          {onSkip && (
            <button type="button" onClick={() => onSkip(file)} style={ghostBtnStyle} disabled={busy}>
              تخطي
            </button>
          )}
          <button type="button" onClick={handleReset} style={ghostBtnStyle} disabled={busy}>
            إعادة ضبط
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={primaryBtnStyle}
            disabled={busy || !completedCrop || completedCrop.width <= 0}
          >
            {busy ? 'جاري الحفظ…' : 'حفظ الاقتطاع'}
          </button>
        </div>

      </div>
    </div>,
    document.body,
  );
}

async function renderCroppedFile(img: HTMLImageElement, crop: PixelCrop, originalName: string): Promise<File> {
  // crop is in display-pixel coords; scale up to natural-pixel coords.
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;

  const sx = crop.x * scaleX;
  const sy = crop.y * scaleY;
  const sw = crop.width * scaleX;
  const sh = crop.height * scaleY;

  const longest = Math.max(sw, sh);
  const scale = longest > OUTPUT_LONG_EDGE ? OUTPUT_LONG_EDGE / longest : 1;
  const outW = Math.max(1, Math.round(sw * scale));
  const outH = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) { reject(new Error('toBlob failed')); return; }
        const baseName = originalName.replace(/\.[^.]+$/, '') || 'document';
        resolve(new File([blob], `${baseName}-cropped.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      OUTPUT_QUALITY,
    );
  });
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(2, 6, 23, 0.78)', backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 12,
};

const cardStyle: React.CSSProperties = {
  background: '#0b1220',
  border: '1px solid rgba(148,163,184,0.18)',
  borderRadius: 18,
  width: '100%',
  maxWidth: 720,
  maxHeight: '94vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
  fontFamily: 'Tajawal, Cairo, sans-serif',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 18px',
  borderBottom: '1px solid rgba(148,163,184,0.12)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.05rem', fontWeight: 800, color: '#e2e8f0', margin: 0,
};

const iconBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 10,
  background: 'rgba(148,163,184,0.08)',
  border: '1px solid rgba(148,163,184,0.15)',
  color: '#cbd5e1', cursor: 'pointer', fontSize: 14,
};

const hintStyle: React.CSSProperties = {
  padding: '10px 18px',
  fontSize: '0.78rem', color: 'rgba(148,163,184,0.85)',
  borderBottom: '1px solid rgba(148,163,184,0.08)',
  lineHeight: 1.6,
};

const cropAreaStyle: React.CSSProperties = {
  flex: 1,
  background: '#020617',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 12,
  overflow: 'auto',
};

const footerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
  padding: '14px 18px',
  borderTop: '1px solid rgba(148,163,184,0.12)',
  background: 'rgba(15,23,42,0.5)',
};

const ghostBtnStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 11,
  background: 'rgba(148,163,184,0.08)',
  border: '1px solid rgba(148,163,184,0.18)',
  color: '#cbd5e1',
  fontSize: 13, fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 11,
  background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
  border: 'none',
  color: '#fff',
  fontSize: 13, fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 6px 20px rgba(37,99,235,0.35)',
};
