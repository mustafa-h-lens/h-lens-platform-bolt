import { supabase } from './supabaseClient';

// ─────────────────────────────────────────────────────────────
// Signed URLs for PRIVATE storage buckets
// ─────────────────────────────────────────────────────────────
// vendor-images / project-files / client-documents hold PII (national IDs,
// passports, financial + client docs) and are private (see the
// security_lockdown_c migration). Their objects can no longer be read over the
// public CDN path; an authenticated request must mint a short-lived signed URL.
//
// The database stores FULL public-format URLs, e.g.
//   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
// We parse the bucket + path out of that and sign it. URLs in PUBLIC buckets
// (equipment images, avatars, email assets) and non-storage URLs pass through
// unchanged.

const SIGNED_TTL_SECONDS = 60 * 60; // 1 hour

const PRIVATE_BUCKETS = new Set(['vendor-images', 'project-files', 'client-documents']);

function parsePublicStorageUrl(url: string): { bucket: string; path: string } | null {
  // Accept both the public and (already) sign/authenticated forms defensively.
  const markers = [
    '/storage/v1/object/public/',
    '/storage/v1/object/sign/',
    '/storage/v1/object/authenticated/',
  ];
  for (const marker of markers) {
    const i = url.indexOf(marker);
    if (i === -1) continue;
    let rest = url.slice(i + marker.length); // "<bucket>/<path>[?token=...]"
    const q = rest.indexOf('?');
    if (q !== -1) rest = rest.slice(0, q);
    const slash = rest.indexOf('/');
    if (slash === -1) return null;
    return {
      bucket: decodeURIComponent(rest.slice(0, slash)),
      path: decodeURIComponent(rest.slice(slash + 1)),
    };
  }
  return null;
}

/**
 * Convert a stored storage URL into a short-lived signed URL when it points at
 * a private bucket. Public/non-storage URLs are returned unchanged. Returns
 * null on failure or empty input.
 */
export async function toSignedUrl(
  storedUrl: string | null | undefined,
  ttlSeconds: number = SIGNED_TTL_SECONDS,
): Promise<string | null> {
  if (!storedUrl) return null;
  const parsed = parsePublicStorageUrl(storedUrl);
  if (!parsed || !PRIVATE_BUCKETS.has(parsed.bucket)) return storedUrl;

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, ttlSeconds);
  if (error || !data?.signedUrl) {
    console.error('Failed to sign storage URL:', error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Sign a URL and open it in a new tab (used for document downloads that
 * previously called window.open on a public URL). Longer TTL so the file stays
 * viewable after it opens.
 */
export async function openSignedUrl(
  storedUrl: string | null | undefined,
  ttlSeconds: number = 30 * 60,
): Promise<void> {
  const url = await toSignedUrl(storedUrl, ttlSeconds);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
