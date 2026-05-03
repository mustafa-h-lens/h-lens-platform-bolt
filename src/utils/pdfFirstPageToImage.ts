let workerInitialized = false;

export async function pdfFirstPageToImage(file: File): Promise<File> {
  const pdfjs = await import('pdfjs-dist');

  if (!workerInitialized) {
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    workerInitialized = true;
  }

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2 });

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) { reject(new Error('Failed to encode PDF page as image')); return; }
        const baseName = file.name.replace(/\.pdf$/i, '') || 'document';
        resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  });
}
