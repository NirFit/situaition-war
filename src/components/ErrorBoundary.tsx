import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
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

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page" style={{ textAlign: 'center', paddingTop: '3rem' }}>
          <h2>משהו השתבש</h2>
          <p style={{ color: '#9aa0a6', margin: '1rem 0' }}>
            אירעה שגיאה בלתי צפויה. נסה לרענן את העמוד.
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ maxWidth: '200px', margin: '0 auto' }}
            onClick={this.handleReset}
          >
            נסה שוב
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
