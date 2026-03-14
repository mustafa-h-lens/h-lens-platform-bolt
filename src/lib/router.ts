import { useSyncExternalStore, useEffect } from 'react';

// ── CONSTANTS ─────────────────────────────────────────────────
const LAST_VISITED_PAGE_KEY = 'lastVisitedPage';

// Pages to exclude from being saved as last visited
const EXCLUDED_PATHS = [
  '/portal-admin-hl',
  '/vendor-login',
  '/vendor-registration',
];

// ── navigate ──────────────────────────────────────────────────
export function navigate(path: string, replace = false) {
  if (replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// ── useRouter ─────────────────────────────────────────────────
function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb);
  return () => window.removeEventListener('popstate', cb);
}

function getSnapshot() {
  return window.location.pathname;
}

export function useRouter() {
  const pathname = useSyncExternalStore(subscribe, getSnapshot);
  return { pathname };
}

// ── parsePath ─────────────────────────────────────────────────
export function parsePath(pathname: string): string[] {
  return pathname.split('/').filter(Boolean);
}

// ── Last Visited Page Management ──────────────────────────────
export function saveLastVisitedPage(pathname: string, search = '') {
  // Don't save excluded paths (login pages, etc.)
  if (EXCLUDED_PATHS.some(excluded => pathname === excluded || pathname.startsWith(excluded))) {
    return;
  }

  const fullPath = pathname + search;
  try {
    localStorage.setItem(LAST_VISITED_PAGE_KEY, fullPath);
  } catch (error) {
    console.error('Failed to save last visited page:', error);
  }
}

export function getLastVisitedPage(): string | null {
  try {
    return localStorage.getItem(LAST_VISITED_PAGE_KEY);
  } catch (error) {
    console.error('Failed to get last visited page:', error);
    return null;
  }
}

export function clearLastVisitedPage() {
  try {
    localStorage.removeItem(LAST_VISITED_PAGE_KEY);
  } catch (error) {
    console.error('Failed to clear last visited page:', error);
  }
}

// ── useRouteTracking Hook ─────────────────────────────────────
// Automatically saves the current route to localStorage
export function useRouteTracking() {
  const { pathname } = useRouter();

  useEffect(() => {
    const search = window.location.search;
    saveLastVisitedPage(pathname, search);
  }, [pathname]);
}
