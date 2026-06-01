import { useEffect, useState, ImgHTMLAttributes } from 'react';
import { toSignedUrl } from '../../lib/storage';

// ─────────────────────────────────────────────────────────────
// useSignedUrl / SignedImage
// ─────────────────────────────────────────────────────────────
// Resolves a stored storage URL to a short-lived signed URL for private
// buckets (PII). Public/non-storage URLs pass through unchanged. Use the hook
// for one-off images and the <SignedImage> component anywhere (including inside
// list .map() renders, where a hook can't be called directly).

export function useSignedUrl(
  storedUrl: string | null | undefined,
  ttlSeconds?: number,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    toSignedUrl(storedUrl, ttlSeconds).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [storedUrl, ttlSeconds]);

  return url;
}

interface SignedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Stored storage URL (public-format) or any other image URL. */
  src?: string | null;
  /** Signed-URL lifetime in seconds (default 1h). */
  ttlSeconds?: number;
}

/**
 * Drop-in replacement for <img> whose src is a stored storage URL. While the
 * signed URL resolves, no broken-image src is set.
 */
export function SignedImage({ src, ttlSeconds, ...imgProps }: SignedImageProps) {
  const signed = useSignedUrl(src, ttlSeconds);
  // Render the <img> with the resolved src once available; otherwise omit src
  // so the browser doesn't fire a 403/404 on the raw private URL.
  return <img {...imgProps} src={signed ?? undefined} />;
}
