import { useState, useRef, useCallback, useEffect } from 'react';

const THRESHOLD = 80;
const MAX_PULL = 120;

export const PullToRefresh = ({ children }: { children: React.ReactNode }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isMobile = useCallback(() => {
    return 'ontouchstart' in window && window.innerWidth <= 768;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isMobile() || refreshing) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [isMobile, refreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      const distance = Math.min(diff * 0.45, MAX_PULL);
      setPullDistance(distance);
      if (distance > 10) e.preventDefault();
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
      setTimeout(() => {
        window.location.reload();
      }, 400);
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
        transform: showIndicator ? `translateY(${pullDistance * 0.3}px)` : 'none',
        transition: pulling.current ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {children}
      </div>

      <style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
