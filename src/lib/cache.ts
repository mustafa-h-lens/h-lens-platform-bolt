/**
 * Simple in-memory cache with TTL for Supabase queries.
 * Prevents refetching on every page navigation within the vendor portal.
 *
 * Usage:
 *   const data = await cached('vendors:list', () => supabase.from('vendors').select('*'), 60_000);
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const store = new Map<string, CacheEntry<any>>();

/**
 * Get cached data or fetch fresh. Returns cached if within TTL.
 * @param key  Unique cache key
 * @param fetcher  Async function that returns data
 * @param ttl  Time-to-live in ms (default: 30s)
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 30_000,
): Promise<T> {
  const existing = store.get(key);
  if (existing && Date.now() - existing.timestamp < existing.ttl) {
    return existing.data;
  }

  const data = await fetcher();
  store.set(key, { data, timestamp: Date.now(), ttl });
  return data;
}

/**
 * Invalidate a specific cache key or all keys matching a prefix.
 * Call after mutations (create, update, delete).
 *
 * @param keyOrPrefix  Exact key or prefix (e.g. 'vendors' invalidates 'vendors:list', 'vendors:123')
 */
export function invalidate(keyOrPrefix: string): void {
  if (store.has(keyOrPrefix)) {
    store.delete(keyOrPrefix);
    return;
  }
  // Prefix match
  for (const key of store.keys()) {
    if (key.startsWith(keyOrPrefix)) {
      store.delete(key);
    }
  }
}

/** Clear entire cache. */
export function clearCache(): void {
  store.clear();
}

/** Get cache stats for debugging. */
export function cacheStats(): { size: number; keys: string[] } {
  return { size: store.size, keys: [...store.keys()] };
}
