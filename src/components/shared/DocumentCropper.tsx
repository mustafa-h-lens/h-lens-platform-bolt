import { useState, useEffect, useCallback, useRef } from 'react';
import Cropper, { Area } from 'react-easy-crop';
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
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [initialArea, setInitialArea] = useState<Area | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const urlRef = useRef<string>('');
  // Memoize the last Sobel-detected bbox per (file, aspect) so re-opens
  // after a cancel don't re-run the 200-1000ms Sobel pass.
  const bboxCacheRef = useRef<{ file: File; aspect: number; area: Area } | null>(null);

  useEffect(() => {
    if (!open || !file) return;
    setImgLoaded(false);
    setInitialArea(undefined);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);

    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setImageUrl(url);

    // Same file + aspect as last open? Reuse cached bbox to avoid Sobel.
    const cached = bboxCacheRef.current;
    if (cached && cached.file === file && cached.aspect === aspect) {
      setInitialArea(cached.area);
      setImgLoaded(true);
      return () => {
        URL.revokeObjectURL(url);
        urlRef.current = '';
      };
    }

    const img = new Image();
    img.onload = async () => {
      try {
        const bbox = await detectDocumentBBox(img);
        const fitted = fitToAspect(bbox, aspect, img.naturalWidth, img.naturalHeight);
        bboxCacheRef.current = { file, aspect, area: fitted };
        setInitialArea(fitted);
        setImgLoaded(true);
      } catch {
        const fallback = fitToAspect(
          { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight },
          aspect,
          img.naturalWidth,
          img.naturalHeight,
        );
        bboxCacheRef.current = { file, aspect, area: fallback };
        setInitialArea(fallback);
        setImgLoaded(true);
      }
    };
    img.onerror = () => setImgLoaded(true);
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
      urlRef.current = '';
    };
  }, [open, file, aspect]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSave = async () => {
    if (!file || !croppedAreaPixels || !imageUrl) return;
    setBusy(true);
    try {
      const cropped = await renderCroppedFile(imageUrl, croppedAreaPixels, rotation, file.name);
      onSave(cropped);
    } catch (e) {
      console.error('Cropper save failed', e);
      setBusy(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  if (!open || !file) return null;

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={cardStyle} onClick={e => e.stopPropagation()} dir="rtl">

        <div style={headerStyle}>
          <h3 style={titleStyle}>اقتطاع {docLabel}</h3>
          <button onClick={onCancel} style={iconBtnStyle} aria-label="إلغاء">✕</button>
        </div>

        <div style={hintStyle}>
          اسحب لتحديد الموقع، استخدم العجلة أو الشريط للتكبير. الأبعاد محفوظة تلقائياً.
        </div>

        <div style={cropAreaStyle}>
          {imageUrl && initialArea && imgLoaded && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              initialCroppedAreaPixels={initialArea}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              objectFit="contain"
              cropShape="rect"
              showGrid
              minZoom={0.5}
              maxZoom={4}
              restrictPosition={false}
            />
          )}
          {!imgLoaded && (
            <div style={loadingStyle}>جاري التحضير…</div>
          )}
        </div>

        <div style={controlsStyle}>
          <label style={sliderRowStyle}>
            <span style={sliderLabelStyle}>تكبير</span>
            <input
              type="range" min={0.5} max={4} step={0.02}
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setRotation(r => r - 90)} style={smallBtnStyle} aria-label="تدوير لليسار">⟲ ٩٠°</button>
            <button type="button" onClick={() => setRotation(r => r + 90)} style={smallBtnStyle} aria-label="تدوير لليمين">⟳ ٩٠°</button>
          </div>
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
          <button type="button" onClick={handleSave} style={primaryBtnStyle} disabled={busy || !croppedAreaPixels}>
            {busy ? 'جاري الحفظ…' : 'حفظ الاقتطاع'}
          </button>
        </div>

      </div>
    </div>
  );
}

function fitToAspect(bbox: BBox, aspect: number, imgW: number, imgH: number): Area {
  const curAspect = bbox.width / Math.max(1, bbox.height);
  let w = bbox.width;
  let h = bbox.height;
  if (curAspect > aspect) {
    h = w / aspect;
  } else {
    w = h * aspect;
  }
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;

  const maxScale = Math.min(imgW / w, imgH / h, 1);
  w *= maxScale;
  h *= maxScale;

  let x = cx - w / 2;
  let y = cy - h / 2;
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + w > imgW) x = imgW - w;
  if (y + h > imgH) y = imgH - h;

  return { x, y, width: w, height: h };
}

async function renderCroppedFile(
  imageUrl: string,
  area: Area,
  rotation: number,
  originalName: string,
): Promise<File> {
  const image = await loadImage(imageUrl);
  const rad = (rotation * Math.PI) / 180;

  const safeSize = Math.ceil(Math.hypot(image.width, image.height));
  const stage = document.createElement('canvas');
  stage.width = safeSize;
  stage.height = safeSize;
  const sctx = stage.getContext('2d');
  if (!sctx) throw new Error('Canvas context unavailable');
  sctx.translate(safeSize / 2, safeSize / 2);
  sctx.rotate(rad);
  sctx.drawImage(image, -image.width / 2, -image.height / 2);

  const longest = Math.max(area.width, area.height);
  const scale = longest > OUTPUT_LONG_EDGE ? OUTPUT_LONG_EDGE / longest : 1;
  const outW = Math.max(1, Math.round(area.width * scale));
  const outH = Math.max(1, Math.round(area.height * scale));

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('Canvas context unavailable');
  octx.drawImage(
    stage,
    Math.round(area.x + (safeSize - image.width) / 2),
    Math.round(area.y + (safeSize - image.height) / 2),
    Math.max(1, Math.round(area.width)),
    Math.max(1, Math.round(area.height)),
    0,
    0,
    outW,
    outH,
  );

  return new Promise<File>((resolve, reject) => {
    out.toBlob(
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

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(2, 6, 23, 0.78)', backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16,
};

const cardStyle: React.CSSProperties = {
  background: '#0b1220',
  border: '1px solid rgba(148,163,184,0.18)',
  borderRadius: 18,
  width: '100%',
  maxWidth: 720,
  maxHeight: '92vh',
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
};

const cropAreaStyle: React.CSSProperties = {
  position: 'relative',
  height: 'min(60vh, 460px)',
  background: '#020617',
};

const loadingStyle: React.CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#94a3b8', fontSize: 14,
};

const controlsStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
  padding: '12px 18px',
  borderTop: '1px solid rgba(148,163,184,0.08)',
};

const sliderRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 220px',
};

const sliderLabelStyle: React.CSSProperties = {
  fontSize: 12, color: '#94a3b8', minWidth: 36,
};

const smallBtnStyle: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: 9,
  background: 'rgba(148,163,184,0.08)',
  border: '1px solid rgba(148,163,184,0.18)',
  color: '#e2e8f0',
  fontSize: 12, fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
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
