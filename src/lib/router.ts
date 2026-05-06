import { useSyncExternalStore, useEffect } from 'react';
import { navigateWithReveal, popstateReveal, prefersReducedMotion } from './navTransition';

// ── CONSTANTS ─────────────────────────────────────────────────
const LAST_VISITED_PAGE_KEY = 'lastVisitedPage';

// Pages to exclude from being saved as last visited.
// Exact-match paths (won't persist as last-visited if user lands here).
const EXCLUDED_EXACT_PATHS = ['/', '/join', '/vendor/login', '/client'];
// Prefix paths (all sub-routes excluded too).
const EXCLUDED_PREFIX_PATHS: string[] = [];

// ── navigate ──────────────────────────────────────────────────
function rawSwap(path: string, replace: boolean) {
  if (replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  // dispatch a synthetic popstate so subscribers re-read location
  window.dispatchEvent(new PopStateEvent('popstate', { state: { __programmatic: true } }));
}

export function navigate(path: string, replace = false, opts: { forceDark?: boolean } = {}) {
  // No-op if already on the same path
  if (window.location.pathname === path && !window.location.search && !window.location.hash) return;

  if (prefersReducedMotion()) {
    rawSwap(path, replace);
    return;
  }

  navigateWithReveal(path, () => rawSwap(path, replace), opts);
}

// Hook the browser back/forward gesture. We can't intercept the actual route
// swap (the URL has already changed by the time popstate fires), but we can
// flash the overlay so the new page mount happens behind the veil.
let popstateHookInstalled = false;
function installPopstateHook() {
  if (popstateHookInstalled || typeof window === 'undefined') return;
  popstateHookInstalled = true;
  window.addEventListener('popstate', (ev: PopStateEvent) => {
    // Skip our own programmatic popstate events; navigateWithReveal already
    // handles those via the overlay.
    const state = ev.state as { __programmatic?: boolean } | null;
    if (state && state.__programmatic) return;
    popstateReveal();
  });
}
installPopstateHook();

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
export function saveLastVisitedPage(pathname: string, search = '', hash = '') {
  // Don't save excluded paths (login/landing pages, etc.)
  if (EXCLUDED_EXACT_PATHS.includes(pathname)) return;
  if (EXCLUDED_PREFIX_PATHS.some(prefix => pathname.startsWith(prefix))) return;

  const fullPath = pathname + search + hash;
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
    const hash = window.location.hash;
    saveLastVisitedPage(pathname, search, hash);
  }, [pathname]);

  // Also track hash changes (admin dashboard uses hash for sub-navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const search = window.location.search;
      const hash = window.location.hash;
      saveLastVisitedPage(window.location.pathname, search, hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
}

// ── Cross-Portal Navigation ───────────────────────────────────
// Helper function to navigate between admin and vendor portals
export function navigateToPortal(portalType: 'admin' | 'vendor') {
  if (portalType === 'admin') {
    navigate('/admin', true);
  } else {
    navigate('/vendor/login', true);
  }
}
