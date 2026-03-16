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

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div dir="rtl" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 300, padding: 32, fontFamily: 'Cairo, sans-serif',
        }}>
          <div style={{
            textAlign: 'center', maxWidth: 400,
            padding: '32px 28px', borderRadius: 16,
            background: 'var(--cardBg, rgba(255,255,255,0.03))',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={22} style={{ color: '#f87171' }} />
            </div>
            <h3 style={{
              fontSize: '1rem', fontWeight: 700, marginBottom: 8,
              color: 'var(--textPri, #f0f4ff)',
            }}>
              حدث خطأ غير متوقع
            </h3>
            <p style={{
              fontSize: '.82rem', lineHeight: 1.7, marginBottom: 20,
              color: 'var(--textSec, rgba(200,215,255,0.6))',
            }}>
              نعتذر عن هذا الخطأ. يمكنك إعادة المحاولة أو العودة إلى الصفحة الرئيسية.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre style={{
                fontSize: '.7rem', textAlign: 'left', direction: 'ltr',
                padding: 12, borderRadius: 8, marginBottom: 16,
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                color: '#fca5a5', overflow: 'auto', maxHeight: 120,
              }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 20px', borderRadius: 8,
                background: '#2563eb', border: 'none', color: 'white',
                fontSize: '.82rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Cairo, sans-serif',
              }}
            >
              <RefreshCw size={14} />
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
