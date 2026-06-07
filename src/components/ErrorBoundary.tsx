import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%',
          background: '#1a1a2e', color: '#fff',
          fontFamily: '-apple-system, sans-serif', padding: 24, gap: 16,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div style={{ fontWeight: 600 }}>エラーが発生しました</div>
          <pre style={{
            fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)',
            maxWidth: '100%', overflow: 'auto', whiteSpace: 'pre-wrap',
            background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8,
          }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: '#f97316', color: '#fff', cursor: 'pointer',
              fontSize: '1rem', fontWeight: 600,
            }}
          >
            再読み込み
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
