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
