const React = require('react');

const mockScope = () => ({
  setLevel: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  setTag: jest.fn(),
  setExtra: jest.fn(),
});

/**
 * The parts of Sentry's ErrorBoundary the app relies on: `beforeCapture` on a
 * scope, ONE `captureException`, `onError`, and the fallback — an element, or a
 * render function handed `error` and `resetError`. A class, not a jest.fn():
 * `resetMocks` would strip a jest.fn's implementation before every test.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.resetError = () => this.setState({ hasError: false, error: null });
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const { beforeCapture, onError } = this.props;
    // Kept on the class so a test can read what `beforeCapture` put on it.
    const scope = mockScope();
    ErrorBoundary.lastScope = scope;
    beforeCapture?.(scope, error, errorInfo.componentStack);
    module.exports.captureException(error);
    onError?.(error, errorInfo.componentStack, 'mock-event-id');
  }

  render() {
    const { children, fallback } = this.props;
    if (!this.state.hasError) return typeof children === 'function' ? children() : children;
    if (typeof fallback === 'function') {
      return fallback({
        error: this.state.error,
        componentStack: '',
        eventId: 'mock-event-id',
        resetError: this.resetError,
      });
    }
    return fallback ?? null;
  }
}

module.exports = {
  ErrorBoundary,
  // Use jest.fn() so tests can verify errors are captured
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  withScope: callback => callback(mockScope()),
  captureFeedback: jest.fn(),
  reactNavigationIntegration: jest.fn(() => ({
    registerNavigationContainer: jest.fn(),
  })),
  init: jest.fn(),
  wrap: component => component,
};
