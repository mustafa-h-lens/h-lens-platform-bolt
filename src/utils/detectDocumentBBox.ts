export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ANALYSIS_LONG_EDGE = 800;
const SAFETY_MARGIN_PX = 4;
const MIN_AREA_FRAC = 0.30;
const MAX_AREA_FRAC = 0.99;
const PERCENTILE = 0.80;

export async function detectDocumentBBox(image: HTMLImageElement): Promise<BBox> {
  const srcW = image.naturalWidth || image.width;
  const srcH = image.naturalHeight || image.height;
  const fallback = centeredFallback(srcW, srcH);

  const longEdge = Math.max(srcW, srcH);
  const scale = longEdge > ANALYSIS_LONG_EDGE ? ANALYSIS_LONG_EDGE / longEdge : 1;
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return fallback;
  ctx.drawImage(image, 0, 0, w, h);

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, w, h);
  } catch {
    return fallback;
  }

  const gray = new Uint8ClampedArray(w * h);
  const rgba = imgData.data;
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    gray[p] = (rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114) | 0;
  }

  const mag = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    const rUp = (y - 1) * w;
    const rMid = y * w;
    const rDn = (y + 1) * w;
    for (let x = 1; x < w - 1; x++) {
      const tl = gray[rUp + x - 1], tc = gray[rUp + x], tr = gray[rUp + x + 1];
      const ml = gray[rMid + x - 1],                    mr = gray[rMid + x + 1];
      const bl = gray[rDn + x - 1], bc = gray[rDn + x], br = gray[rDn + x + 1];
      const gx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
      const gy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
      mag[rMid + x] = Math.abs(gx) + Math.abs(gy);
    }
  }

  const rowSum = new Float32Array(h);
  const colSum = new Float32Array(w);
  for (let y = 0; y < h; y++) {
    let s = 0;
    const off = y * w;
    for (let x = 0; x < w; x++) s += mag[off + x];
    rowSum[y] = s;
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = 0; y < h; y++) s += mag[y * w + x];
    colSum[x] = s;
  }

  const rowThr = percentile(rowSum, PERCENTILE);
  const colThr = percentile(colSum, PERCENTILE);

  let y0 = 0;
  while (y0 < h && rowSum[y0] < rowThr) y0++;
  let y1 = h - 1;
  while (y1 > y0 && rowSum[y1] < rowThr) y1--;

  let x0 = 0;
  while (x0 < w && colSum[x0] < colThr) x0++;
  let x1 = w - 1;
  while (x1 > x0 && colSum[x1] < colThr) x1--;

  if (x1 <= x0 || y1 <= y0) return fallback;

  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const areaFrac = (bw * bh) / (w * h);
  if (areaFrac < MIN_AREA_FRAC || areaFrac > MAX_AREA_FRAC) return fallback;

  const invScale = 1 / scale;
  const padded = {
    x: Math.max(0, Math.round((x0 - SAFETY_MARGIN_PX) * invScale)),
    y: Math.max(0, Math.round((y0 - SAFETY_MARGIN_PX) * invScale)),
    width: Math.min(srcW, Math.round((bw + SAFETY_MARGIN_PX * 2) * invScale)),
    height: Math.min(srcH, Math.round((bh + SAFETY_MARGIN_PX * 2) * invScale)),
  };
  if (padded.x + padded.width > srcW) padded.width = srcW - padded.x;
  if (padded.y + padded.height > srcH) padded.height = srcH - padded.y;
  return padded;
}

function centeredFallback(w: number, h: number): BBox {
  const cw = Math.round(w * 0.9);
  const ch = Math.round(h * 0.9);
  return {
    x: Math.round((w - cw) / 2),
    y: Math.round((h - ch) / 2),
    width: cw,
    height: ch,
  };
}

function percentile(arr: ArrayLike<number>, p: number): number {
  const copy = Array.from(arr);
  copy.sort((a, b) => a - b);
  const idx = Math.min(copy.length - 1, Math.max(0, Math.floor(p * copy.length)));
  return copy[idx];
}
