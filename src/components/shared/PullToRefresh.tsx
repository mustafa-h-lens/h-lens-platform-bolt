import { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react';

/* ──────────────────────────────────────────────────────────────────────────
 * PullToRefresh
 *
 * Native-feeling pull-to-refresh for mobile. Implementation notes:
 *
 * 1. RAF-batched imperative DOM updates. The pull distance lives in a ref,
 *    not React state. On every touchmove we update the ref and schedule one
 *    requestAnimationFrame callback per frame that writes `style.transform`
 *    directly to indicator + content DOM nodes. React only re-renders for
 *    discrete state transitions (cross-threshold, refresh-fire). This avoids
 *    the 60-renders-per-second "render storm" that previously made the whole
 *    app re-render during a pull.
 *
 * 2. GPU-composited transforms. translate3d + will-change: transform forces
 *    the indicator + content into their own compositor layers so the
 *    animation runs off the main thread.
 *
 * 3. Tuned feel: 60px threshold, 0.55 resistance, indicator visible from the
 *    first pixel, content+indicator move at the same rate.
 * ────────────────────────────────────────────────────────────────────────── */

const THRESHOLD = 60;
const MAX_PULL = 120;
const RESISTANCE = 0.55;
const SPRING_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'; // iOS-style snappy ease-out
const SPRING_DURATION = 280; // ms

const PullToRefreshContext = createContext<{
  onRefresh: (cb: () => void) => () => void;
  setDisabled: (v: boolean) => void;
}>({
  onRefresh: () => () => {},
  setDisabled: () => {},
});

export const usePullToRefresh = (callback: () => void) => {
  const { onRefresh } = useContext(PullToRefreshContext);
  useEffect(() => onRefresh(callback), [callback, onRefresh]);
};

/** Pause/resume the global pull-to-refresh gesture AND iOS Safari's native
 *  pull-to-refresh while active. Use on long forms / modals where pulling to
 *  scroll back to the top accidentally fires a refresh. */
export const useDisablePullToRefresh = (active: boolean) => {
  const { setDisabled } = useContext(PullToRefreshContext);
  useEffect(() => {
    if (!active) return;
    setDisabled(true);
    const html = document.documentElement;
    const prev = html.style.overscrollBehaviorY;
    html.style.overscrollBehaviorY = 'none';
    return () => {
      setDisabled(false);
      html.style.overscrollBehaviorY = prev;
    };
  }, [active, setDisabled]);
};

export const PullToRefresh = ({ children }: { children: React.ReactNode }) => {
  // Discrete state: triggers React render only on transitions
  const [refreshing, setRefreshing] = useState(false);
  const [overThreshold, setOverThreshold] = useState(false);
  const [indicatorVisible, setIndicatorVisible] = useState(false);
  const [disabledCount, setDisabledCount] = useState(0);

  // Continuous gesture state: refs only, no React renders
  const pullDistanceRef = useRef(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const rafScheduled = useRef(false);

  // DOM refs for imperative transform updates
  const indicatorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Refresh callbacks registered via usePullToRefresh hook
  const refreshCallbacks = useRef<Set<() => void>>(new Set());

  const disabled = disabledCount > 0;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const setDisabled = useCallback((v: boolean) => {
    setDisabledCount(c => Math.max(0, c + (v ? 1 : -1)));
  }, []);

  const onRefresh = useCallback((cb: () => void) => {
    refreshCallbacks.current.add(cb);
    return () => { refreshCallbacks.current.delete(cb); };
  }, []);

  // If disabled flips on mid-pull, abort
  useEffect(() => {
    if (disabled) {
      pulling.current = false;
      pullDistanceRef.current = 0;
      applyTransforms(0, false);
      setIndicatorVisible(false);
      setOverThreshold(false);
    }
  }, [disabled]);

  // Suppress iOS Safari's native pull-to-refresh chrome via overscroll-behavior.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overscrollBehaviorY;
    html.style.overscrollBehaviorY = 'none';
    return () => { html.style.overscrollBehaviorY = prev; };
  }, []);

  const isMobile = useCallback(() => {
    return 'ontouchstart' in window && window.innerWidth <= 768;
  }, []);

  /** Walk from touch target up to <html>; if any ancestor is itself a
   *  scrollable container scrolled down, the downward swipe is meant to
   *  scroll THAT container, not trigger pull-to-refresh. */
  const isAtTopOfScrollChain = useCallback((target: EventTarget | null) => {
    if (window.scrollY > 0 || document.documentElement.scrollTop > 0) return false;
    let node = target as HTMLElement | null;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;
      const scrollable =
        (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
        node.scrollHeight > node.clientHeight;
      if (scrollable && node.scrollTop > 0) return false;
      node = node.parentElement;
    }
    return true;
  }, []);

  /** Imperative DOM update — bypasses React reconciliation. Called from RAF. */
  const applyTransforms = (distance: number, animating: boolean) => {
    const transition = animating ? `transform ${SPRING_DURATION}ms ${SPRING_EASING}` : 'none';
    if (contentRef.current) {
      contentRef.current.style.transform = `translate3d(0, ${distance * 0.5}px, 0)`;
      contentRef.current.style.transition = transition;
    }
    if (indicatorRef.current) {
      // Indicator translates with content at the same rate, plus a small offset to
      // peek above the top of the viewport when distance is small.
      const indicatorY = Math.min(distance * 0.5, 50);
      const scale = Math.min(0.6 + (distance / THRESHOLD) * 0.4, 1);
      indicatorRef.current.style.transform = `translate3d(0, ${indicatorY}px, 0) scale(${scale})`;
      indicatorRef.current.style.opacity = String(Math.min(0.35 + (distance / THRESHOLD) * 0.65, 1));
      indicatorRef.current.style.transition = animating
        ? `transform ${SPRING_DURATION}ms ${SPRING_EASING}, opacity 180ms ease-out`
        : 'none';
    }
  };

  /** Schedule (or coalesce) a frame-aligned transform update. */
  const scheduleFrame = () => {
    if (rafScheduled.current) return;
    rafScheduled.current = true;
    requestAnimationFrame(() => {
      rafScheduled.current = false;
      const distance = pullDistanceRef.current;
      applyTransforms(distance, false);

      // Discrete state transitions trigger React render (rare)
      const nowOver = distance >= THRESHOLD;
      if (nowOver !== overThresholdRef.current) {
        overThresholdRef.current = nowOver;
        setOverThreshold(nowOver);
      }
      const visible = distance > 0;
      if (visible !== indicatorVisibleRef.current) {
        indicatorVisibleRef.current = visible;
        setIndicatorVisible(visible);
      }
    });
  };

  // Mirror state into refs so RAF callback (which may run after a render) reads fresh values
  const overThresholdRef = useRef(false);
  overThresholdRef.current = overThreshold;
  const indicatorVisibleRef = useRef(false);
  indicatorVisibleRef.current = indicatorVisible;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isMobile() || refreshing) return;
    if (disabledRef.current) return;
    if (!isAtTopOfScrollChain(e.target)) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
    // Add will-change while pulling so the compositor pre-allocates layers
    if (contentRef.current) contentRef.current.style.willChange = 'transform';
    if (indicatorRef.current) indicatorRef.current.style.willChange = 'transform, opacity';
  }, [isMobile, refreshing, isAtTopOfScrollChain]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabledRef.current) {
      if (pulling.current) {
        pulling.current = false;
        pullDistanceRef.current = 0;
        scheduleFrame();
      }
      return;
    }
    if (!pulling.current || refreshing) return;
    if (window.scrollY > 0 || document.documentElement.scrollTop > 0) {
      pulling.current = false;
      pullDistanceRef.current = 0;
      scheduleFrame();
      return;
    }
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      pullDistanceRef.current = Math.min(diff * RESISTANCE, MAX_PULL);
      scheduleFrame();
    } else if (pullDistanceRef.current > 0) {
      pulling.current = false;
      pullDistanceRef.current = 0;
      scheduleFrame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  const handleTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    pulling.current = false;
    const distance = pullDistanceRef.current;
    if (distance >= THRESHOLD) {
      // Trigger refresh — snap indicator to threshold position with animation
      setRefreshing(true);
      pullDistanceRef.current = THRESHOLD;
      applyTransforms(THRESHOLD, true);
      // Dispatch event + invoke callbacks
      window.dispatchEvent(new CustomEvent('pull-to-refresh'));
      refreshCallbacks.current.forEach(cb => cb());
      // Reset after a brief display window
      setTimeout(() => {
        setRefreshing(false);
        setOverThreshold(false);
        setIndicatorVisible(false);
        pullDistanceRef.current = 0;
        applyTransforms(0, true);
        // Clear will-change after the animation completes to free GPU layer
        setTimeout(() => {
          if (contentRef.current) contentRef.current.style.willChange = '';
          if (indicatorRef.current) indicatorRef.current.style.willChange = '';
        }, SPRING_DURATION);
      }, 600);
    } else {
      // Spring back to zero
      pullDistanceRef.current = 0;
      applyTransforms(0, true);
      setOverThreshold(false);
      setIndicatorVisible(false);
      setTimeout(() => {
        if (contentRef.current) contentRef.current.style.willChange = '';
        if (indicatorRef.current) indicatorRef.current.style.willChange = '';
      }, SPRING_DURATION);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <PullToRefreshContext.Provider value={{ onRefresh, setDisabled }}>
      <div>
        {indicatorVisible && (
          <div
            ref={indicatorRef}
            className="ptr-indicator"
            style={{
              position: 'fixed',
              top: 0,
              left: '50%',
              marginLeft: -26,
              zIndex: 9999,
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--bg-surface, #071428)',
              border: '1px solid var(--border-soft, rgba(255,255,255,0.12))',
              boxShadow: '0 6px 24px rgba(0,0,0,0.32)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              willChange: 'transform, opacity',
              transform: 'translate3d(0, 0, 0) scale(0.6)',
              opacity: 0.35,
            }}
          >
            {refreshing ? (
              <div style={{
                width: 22, height: 22,
                border: '2.5px solid var(--border-soft, rgba(255,255,255,0.15))',
                borderTopColor: overThreshold ? '#3b82f6' : '#3b82f6',
                borderRadius: '50%',
                animation: 'ptr-spin 0.6s linear infinite',
              }} />
            ) : (
              <svg
                width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke={overThreshold ? '#10b981' : '#3b82f6'}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{
                  transform: overThreshold ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: `transform ${SPRING_DURATION}ms ${SPRING_EASING}`,
                }}
              >
                <polyline points="7 13 12 18 17 13" />
                <line x1="12" y1="3" x2="12" y2="18" />
              </svg>
            )}
          </div>
        )}

        <div
          ref={contentRef}
          style={{
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform',
          }}
        >
          {children}
        </div>

        <style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </PullToRefreshContext.Provider>
  );
};
