import { useSyncExternalStore } from 'react';

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
