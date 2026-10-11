import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: string) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Catches renderer crashes so a WebGL failure degrades to the accessible fallback view. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error, error.stack ?? '');
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="fatal-error" role="alert">
            <h1>Rendering stopped</h1>
            <p>{this.state.error.message}</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
