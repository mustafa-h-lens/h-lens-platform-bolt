let runtimeReady: Promise<void> | null = null;
let scanner: any = null;
let scannerLoading = false;

/** Sync check: is the scanner fully initialised in this tab right now? */
export function isAutoCropReady(): boolean {
  return scanner !== null;
}

/** Kick off OpenCV+jscanify load in the background.
 *
 * IMPORTANT: the OpenCV WASM module initialization does heavy synchronous JIT
 * work on the main thread when `import()` resolves and again when the runtime
 * is being warmed. Calling this directly from a component's `useEffect` froze
 * the page for several seconds while users were trying to fill fields.
 *
 * We defer the load until the browser is genuinely idle (requestIdleCallback)
 * with a setTimeout fallback for browsers that don't have it. The user has
 * plenty of time to fill out the document step before they actually upload,
 * and on the off-chance they upload before idle fires, autoCropDocument's
 * cold-path fallback opens the manual cropper instantly.
 */
export function prewarmAutoCrop(): void {
  if (scanner || scannerLoading) return;
  scannerLoading = true;
  const idle: any = (window as any).requestIdleCallback;
  const start = () => {
    ensureScanner().finally(() => { scannerLoading = false; });
  };
  if (typeof idle === 'function') {
    idle(start, { timeout: 4000 });
  } else {
    setTimeout(start, 1500);
  }
}

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
  timeoutMs?: number;
}

// Defensive cap. We only call autoCropDocument when isAutoCropReady() is true,
// so we should never hit this — it's just here so a stalled GPU / GC pause
// can't freeze the spinner.
const DEFAULT_TIMEOUT_MS = 3000;
// Source images larger than this on the long edge get downscaled before being
// fed to OpenCV. A 4000×3000 phone photo through findContours on a phone CPU
// takes 5-10s; downscaled to 1400 it's well under a second.
const ANALYSIS_LONG_EDGE = 1400;

export async function autoCropDocument(file: File, opts: AutoCropOpts): Promise<File | null> {
  if (!file.type.startsWith('image/')) return null;

  const longEdge = opts.longEdge ?? 1600;
  const quality = opts.quality ?? 0.92;
  const targetAspect = opts.aspectWidth / opts.aspectHeight;
  const targetW = longEdge;
  const targetH = Math.max(1, Math.round(longEdge * (opts.aspectHeight / opts.aspectWidth)));

  return await withTimeout(
    runAutoCrop(file, { targetW, targetH, targetAspect, quality }),
    opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    'autoCrop',
  );
}

async function runAutoCrop(file: File, params: {
  targetW: number;
  targetH: number;
  targetAspect: number;
  quality: number;
}): Promise<File | null> {
  let img: HTMLImageElement;
  try {
    img = await fileToImage(file);
  } catch (e) {
    console.warn('autoCropDocument: failed to read image', e);
    return null;
  }

  const s = await ensureScanner();
  if (!s) return null;

  // Downscale before feeding into OpenCV so phone photos don't choke the CPU.
  const analysisSource = downscaleIfHuge(img, ANALYSIS_LONG_EDGE);

  if (!isPlausibleDocumentQuad(s, analysisSource, params.targetAspect)) return null;

  let outCanvas: HTMLCanvasElement | null = null;
  try {
    outCanvas = s.extractPaper(analysisSource, params.targetW, params.targetH) as HTMLCanvasElement | null;
  } catch (e) {
    console.warn('extractPaper threw', e);
    return null;
  }
  if (!outCanvas) return null;

  return await canvasToJpegFile(outCanvas, file.name, params.quality);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return new Promise<T | null>(resolve => {
    let settled = false;
    const t = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      console.warn(`${label} timed out after ${ms}ms — falling back to manual cropper`);
      resolve(null);
    }, ms);
    promise.then(v => {
      if (settled) return;
      settled = true;
      window.clearTimeout(t);
      resolve(v as T);
    }).catch(e => {
      if (settled) return;
      settled = true;
      window.clearTimeout(t);
      console.warn(`${label} threw`, e);
      resolve(null);
    });
  });
}

function downscaleIfHuge(img: HTMLImageElement, maxLongEdge: number): HTMLImageElement | HTMLCanvasElement {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const longest = Math.max(w, h);
  if (longest <= maxLongEdge) return img;
  const scale = maxLongEdge / longest;
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext('2d');
  if (!ctx) return img;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

const ASPECT_TOLERANCE = 0.25;
const MIN_AREA_FRACTION = 0.18;

function isPlausibleDocumentQuad(scanner: any, img: HTMLImageElement | HTMLCanvasElement, targetAspect: number): boolean {
  const cv = (window as any).cv;
  if (!cv) return true;

  const srcW = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width;
  const srcH = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height;

  let mat: any = null;
  let contour: any = null;
  try {
    mat = cv.imread(img as any);
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
    const ratio = Math.max(detectedAspect, targetAspect) / Math.min(detectedAspect, targetAspect);
    const flippedRatio = Math.max(1 / detectedAspect, targetAspect) / Math.min(1 / detectedAspect, targetAspect);
    const aspectOk = ratio <= 1 + ASPECT_TOLERANCE || flippedRatio <= 1 + ASPECT_TOLERANCE;
    if (!aspectOk) return false;

    const quadArea = w * h;
    const imgArea = srcW * srcH;
    const areaFrac = quadArea / Math.max(1, imgArea);
    if (areaFrac < MIN_AREA_FRACTION) return false;

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
