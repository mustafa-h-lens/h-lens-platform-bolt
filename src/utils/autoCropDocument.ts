let runtimeReady: Promise<void> | null = null;
let scanner: any = null;

async function ensureScanner(): Promise<any | null> {
  if (scanner) return scanner;

  if (!runtimeReady) {
    runtimeReady = (async () => {
      const cvModule: any = await import('@techstark/opencv-js');
      const cvRaw = cvModule.default ?? cvModule;
      const cv = cvRaw instanceof Promise ? await cvRaw : cvRaw;
      if (cv.Mat) return;
      await new Promise<void>((resolve, reject) => {
        const t = window.setTimeout(() => reject(new Error('OpenCV runtime init timed out')), 30000);
        cv.onRuntimeInitialized = () => { window.clearTimeout(t); resolve(); };
      });
      (window as any).cv = cv;
    })();
  }

  try {
    await runtimeReady;
  } catch (e) {
    runtimeReady = null;
    console.warn('OpenCV runtime init failed', e);
    return null;
  }

  try {
    // Browser entry — the package's default export bundles a Node OpenCV (~12 MB).
    const mod: any = await import('jscanify/client');
    const Jscanify = mod.default ?? mod;
    scanner = new Jscanify();
    return scanner;
  } catch (e) {
    console.warn('jscanify load failed', e);
    return null;
  }
}

export interface AutoCropOpts {
  aspectWidth: number;
  aspectHeight: number;
  longEdge?: number;
  quality?: number;
}

export async function autoCropDocument(file: File, opts: AutoCropOpts): Promise<File | null> {
  if (!file.type.startsWith('image/')) return null;

  const longEdge = opts.longEdge ?? 1600;
  const quality = opts.quality ?? 0.92;
  const targetAspect = opts.aspectWidth / opts.aspectHeight;
  const targetW = longEdge;
  const targetH = Math.max(1, Math.round(longEdge * (opts.aspectHeight / opts.aspectWidth)));

  let img: HTMLImageElement;
  try {
    img = await fileToImage(file);
  } catch (e) {
    console.warn('autoCropDocument: failed to read image', e);
    return null;
  }

  const s = await ensureScanner();
  if (!s) return null;

  // Sanity-check the detected quad before extracting. Rejects quads whose
  // aspect ratio is far from the target (e.g. a square QR-code panel inside
  // an ID screenshot) or whose area is too small to be the document itself.
  if (!isPlausibleDocumentQuad(s, img, targetAspect)) return null;

  let outCanvas: HTMLCanvasElement | null = null;
  try {
    outCanvas = s.extractPaper(img, targetW, targetH) as HTMLCanvasElement | null;
  } catch (e) {
    console.warn('extractPaper threw', e);
    return null;
  }
  if (!outCanvas) return null;

  return await canvasToJpegFile(outCanvas, file.name, quality);
}

const ASPECT_TOLERANCE = 0.25;
const MIN_AREA_FRACTION = 0.18;

function isPlausibleDocumentQuad(scanner: any, img: HTMLImageElement, targetAspect: number): boolean {
  const cv = (window as any).cv;
  if (!cv) return true;

  let mat: any = null;
  let contour: any = null;
  try {
    mat = cv.imread(img);
    contour = scanner.findPaperContour(mat);
    if (!contour) return false;

    const corners = scanner.getCornerPoints(contour);
    const tl = corners?.topLeftCorner;
    const tr = corners?.topRightCorner;
    const bl = corners?.bottomLeftCorner;
    const br = corners?.bottomRightCorner;
    if (!tl || !tr || !bl || !br) return false;

    const widthTop = dist(tl, tr);
    const widthBottom = dist(bl, br);
    const heightLeft = dist(tl, bl);
    const heightRight = dist(tr, br);
    const w = (widthTop + widthBottom) / 2;
    const h = (heightLeft + heightRight) / 2;
    if (w <= 0 || h <= 0) return false;

    const detectedAspect = w / h;
    // Quads photographed at angle look narrower; allow either orientation.
    const ratio = Math.max(detectedAspect, targetAspect) / Math.min(detectedAspect, targetAspect);
    const flippedRatio = Math.max(1 / detectedAspect, targetAspect) / Math.min(1 / detectedAspect, targetAspect);
    const aspectOk = ratio <= 1 + ASPECT_TOLERANCE || flippedRatio <= 1 + ASPECT_TOLERANCE;
    if (!aspectOk) {
      console.info('autoCrop: rejecting quad — aspect', detectedAspect.toFixed(2), 'vs target', targetAspect.toFixed(2));
      return false;
    }

    const quadArea = w * h;
    const imgArea = img.naturalWidth * img.naturalHeight;
    const areaFrac = quadArea / Math.max(1, imgArea);
    if (areaFrac < MIN_AREA_FRACTION) {
      console.info('autoCrop: rejecting quad — area fraction', areaFrac.toFixed(3));
      return false;
    }

    return true;
  } catch (e) {
    console.warn('autoCrop sanity check failed', e);
    return false;
  } finally {
    try { contour?.delete?.(); } catch { /* ignore */ }
    try { mat?.delete?.(); } catch { /* ignore */ }
  }
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

function canvasToJpegFile(canvas: HTMLCanvasElement, originalName: string, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) { reject(new Error('canvas.toBlob returned null')); return; }
        const baseName = originalName.replace(/\.[^.]+$/, '') || 'document';
        resolve(new File([blob], `${baseName}-cropped.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      quality,
    );
  });
}
