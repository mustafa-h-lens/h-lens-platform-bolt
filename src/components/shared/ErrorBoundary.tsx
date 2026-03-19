import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  componentDidMount() {
    // Reset error state when user navigates (popstate covers pushState-based routing)
    window.addEventListener('popstate', this.handleNavigation);
    window.addEventListener('hashchange', this.handleNavigation);
  }

  componentWillUnmount() {
    window.removeEventListener('popstate', this.handleNavigation);
    window.removeEventListener('hashchange', this.handleNavigation);
  }

  handleNavigation = () => {
    if (this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  };

  handleRetry = () => {
    // For chunk load failures, a full reload is needed to re-fetch the chunk
    const error = this.state.error;
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Failed to fetch');

    if (isChunkError) {
      window.location.reload();
      return;
    }

    // For other errors, reset state and call optional onReset callback
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div dir="rtl" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: 32, fontFamily: 'Cairo, sans-serif',
          backgroundColor: 'var(--color-surface, #0f1117)',
        }}>
          <div style={{
            textAlign: 'center', maxWidth: 420,
            padding: '40px 32px', borderRadius: 16,
            background: 'var(--cardBg, rgba(255,255,255,0.03))',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, margin: '0 auto 20px',
              background: 'color-mix(in srgb, var(--color-danger, #ef4444) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-danger, #ef4444) 20%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={26} style={{ color: 'var(--color-danger, #f87171)' }} />
            </div>
            <h3 style={{
              fontSize: '1.15rem', fontWeight: 700, marginBottom: 10, marginTop: 0,
              color: 'var(--textPri, #f0f4ff)',
            }}>
              حدث خطأ غير متوقع
            </h3>
            <p style={{
              fontSize: '.85rem', lineHeight: 1.8, marginBottom: 24,
              color: 'var(--textSec, rgba(200,215,255,0.6))',
            }}>
              يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre style={{
                fontSize: '.7rem', textAlign: 'left', direction: 'ltr',
                padding: 12, borderRadius: 8, marginBottom: 16,
                background: 'color-mix(in srgb, var(--color-danger, #ef4444) 6%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-danger, #ef4444) 15%, transparent)',
                color: '#fca5a5', overflow: 'auto', maxHeight: 120,
              }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 28px', borderRadius: 10,
                background: 'var(--color-primary, #2563eb)', border: 'none', color: 'white',
                fontSize: '.88rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Cairo, sans-serif',
                transition: 'opacity 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <RefreshCw size={15} />
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
