import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary Component
 * 
 * Catches React component errors and displays a fallback UI.
 * Provides error recovery options.
 * 
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} [props.fallbackTitle] - Custom fallback title
 * @param {string} [props.fallbackDescription] - Custom fallback description
 * @param {Function} [props.onReset] - Callback when user clicks reset button
 * @returns {React.ReactElement}
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render() {
    const { hasError, error } = this.state;
    const {
      children,
      fallbackTitle = 'Something went wrong',
      fallbackDescription = 'An unexpected error occurred. Please try again or contact support.',
    } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 py-6">
          <div className="max-w-md w-full">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle size={48} className="text-jeevacare-red" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {fallbackTitle}
              </h1>

              <p className="text-gray-600 text-sm mb-6">
                {fallbackDescription}
              </p>

              {/* Error details (only in development) */}
              {process.env.NODE_ENV === 'development' && error && (
                <details className="my-4 text-left text-xs bg-gray-100 p-4 rounded-lg overflow-auto max-h-48">
                  <summary className="cursor-pointer font-mono font-bold mb-2">
                    Error Details
                  </summary>
                  <pre className="font-mono text-gray-700">
                    {error.toString()}
                  </pre>
                </details>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="btn btn-secondary flex-1"
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
