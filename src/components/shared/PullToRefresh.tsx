import { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react';

const THRESHOLD = 80;
const MAX_PULL = 120;

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
 * pull-to-refresh while active. Use on long forms / modals where pulling to
 * scroll back to the top accidentally fires a refresh.
 *
 * Disables both:
 *  - our app-level <PullToRefresh> wrapper (via the React context flag)
 *  - the browser's native pull-to-refresh (via overscroll-behavior:none on
 *    <html>, the only thing iOS Safari respects)
 */
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
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [disabledCount, setDisabledCount] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Force-reset gesture state if disabled flips on mid-pull.
  useEffect(() => {
    if (disabled) {
      pulling.current = false;
      setPullDistance(0);
    }
  }, [disabled]);

  // Suppress iOS Safari's native pull-to-refresh chrome (the small spinning
  // dotted-circle that appears at the top of the viewport) so the user sees
  // ONLY our custom indicator. iOS Safari only respects `none` here, not
  // `contain`.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overscrollBehaviorY;
    html.style.overscrollBehaviorY = 'none';
    return () => {
      html.style.overscrollBehaviorY = prev;
    };
  }, []);

  const isMobile = useCallback(() => {
    return 'ontouchstart' in window && window.innerWidth <= 768;
  }, []);

  // Walk from the touch target up to <html>; if any ancestor is itself a
  // scrollable container that has been scrolled down, the user's downward
  // swipe is meant to scroll that container, not trigger pull-to-refresh.
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

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isMobile() || refreshing) return;
    if (disabledRef.current) return;
    if (!isAtTopOfScrollChain(e.target)) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [isMobile, refreshing, isAtTopOfScrollChain]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabledRef.current) {
      pulling.current = false;
      if (pullDistance !== 0) setPullDistance(0);
      return;
    }
    if (!pulling.current || refreshing) return;
    // Bail if window scrolled away from top during the gesture (rare but possible).
    if (window.scrollY > 0 || document.documentElement.scrollTop > 0) {
      pulling.current = false;
      setPullDistance(0);
      return;
    }
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      const distance = Math.min(diff * 0.45, MAX_PULL);
      setPullDistance(distance);
      if (distance > 10 && e.cancelable) e.preventDefault();
    } else {
      pulling.current = false;
      setPullDistance(0);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      // Dispatch custom event for soft refresh, then reset indicator
      window.dispatchEvent(new CustomEvent('pull-to-refresh'));
      refreshCallbacks.current.forEach(cb => cb());
      setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
      }, 600);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showIndicator = pullDistance > 10;

  return (
    <PullToRefreshContext.Provider value={{ onRefresh, setDisabled }}>
    <div ref={containerRef}>
      {showIndicator && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          display: 'flex', justifyContent: 'center',
          paddingTop: Math.min(pullDistance * 0.5, 40),
          transition: pulling.current ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--bg-surface, #071428)',
            border: '1px solid var(--border-soft, rgba(255,255,255,0.09))',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${0.5 + progress * 0.5})`,
            opacity: progress,
            transition: pulling.current ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            {refreshing ? (
              <div style={{
                width: 18, height: 18,
                border: '2.5px solid var(--border-soft, rgba(255,255,255,0.15))',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'ptr-spin 0.6s linear infinite',
              }} />
            ) : (
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{
                  transform: `rotate(${progress * 180}deg)`,
                  transition: pulling.current ? 'none' : 'transform 0.3s',
                }}
              >
                <polyline points="7 13 12 18 17 13" />
                <line x1="12" y1="3" x2="12" y2="18" />
              </svg>
            )}
          </div>
        </div>
      )}

      <div style={{
        transform: (!disabled && showIndicator) ? `translateY(${pullDistance * 0.3}px)` : 'none',
        transition: pulling.current ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {children}
      </div>

      <style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
    </PullToRefreshContext.Provider>
  );
};
