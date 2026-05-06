import { useSyncExternalStore } from 'react';

export type NavPhase = 'idle' | 'leaving' | 'waiting' | 'exiting';

const LEAVING_MS = 300;
const EXITING_MS = 450;
const MIN_WAITING_MS = 600;
const MAX_WAITING_MS = 8000;

let phase: NavPhase = 'idle';
let forceDark = false;
const listeners = new Set<() => void>();
let waitingStart = 0;
let pollHandle: number | null = null;
let watchdogHandle: number | null = null;
let exitingHandle: number | null = null;

function emit() { listeners.forEach(l => l()); }

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot(): { phase: NavPhase; forceDark: boolean } {
  return cached;
}

let cached: { phase: NavPhase; forceDark: boolean } = { phase, forceDark };
function refreshCache() {
  cached = { phase, forceDark };
  emit();
}

function setPhase(p: NavPhase) {
  if (phase === p) return;
  phase = p;
  refreshCache();
}

function setForceDark(v: boolean) {
  if (forceDark === v) return;
  forceDark = v;
  refreshCache();
}

export function useNavPhase() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clearTimers() {
  if (pollHandle != null) { window.clearInterval(pollHandle); pollHandle = null; }
  if (watchdogHandle != null) { window.clearTimeout(watchdogHandle); watchdogHandle = null; }
  if (exitingHandle != null) { window.clearTimeout(exitingHandle); exitingHandle = null; }
}

function startExiting() {
  setPhase('exiting');
  exitingHandle = window.setTimeout(() => {
    setPhase('idle');
    setForceDark(false);
    exitingHandle = null;
  }, EXITING_MS);
}

function beginWaiting() {
  clearTimers();
  setPhase('waiting');
  waitingStart = performance.now();

  const tryFinish = () => {
    const elapsed = performance.now() - waitingStart;
    if (elapsed < MIN_WAITING_MS) return;
    const stillLoading = document.querySelector('.page-loading-placeholder');
    if (!stillLoading) {
      clearTimers();
      startExiting();
    }
  };

  pollHandle = window.setInterval(tryFinish, 80);
  watchdogHandle = window.setTimeout(() => {
    clearTimers();
    startExiting();
  }, MAX_WAITING_MS);
}

interface NavOpts { replace?: boolean; forceDark?: boolean }

export function navigateWithReveal(
  path: string,
  doRouteSwap: () => void,
  opts: NavOpts = {},
) {
  if (prefersReducedMotion()) {
    doRouteSwap();
    return;
  }
  if (opts.forceDark) setForceDark(true);

  // If we're already in flight, restart from leaving cleanly.
  clearTimers();
  setPhase('leaving');

  window.setTimeout(() => {
    doRouteSwap();
    beginWaiting();
  }, LEAVING_MS);

  // Save target path so callers can reason about it (no-op for now)
  void path;
}

export async function runWithNavReveal<T>(
  action: () => Promise<T>,
  opts: { targetPath?: string; forceDark?: boolean } = {},
): Promise<T> {
  if (prefersReducedMotion()) return action();
  if (opts.forceDark) setForceDark(true);

  clearTimers();
  setPhase('leaving');
  // Give the leaving animation a moment to be visible
  await new Promise(r => window.setTimeout(r, LEAVING_MS));

  try {
    const result = await action();
    beginWaiting();
    return result;
  } catch (e) {
    // On failure, dismiss the overlay
    clearTimers();
    startExiting();
    throw e;
  }
}

// Called by router when popstate fires (browser back/forward).
// We can't pre-empt the route swap, but we can reveal the overlay immediately
// and play the waiting/exiting phases on top of the new page mount.
export function popstateReveal() {
  if (prefersReducedMotion()) return;
  clearTimers();
  setPhase('leaving');
  window.setTimeout(beginWaiting, LEAVING_MS);
}
