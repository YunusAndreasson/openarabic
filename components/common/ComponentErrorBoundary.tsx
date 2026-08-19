import * as Sentry from '@sentry/react-native';
import { Component } from 'react';
import type { ReactNode } from 'react';

import { AppErrorFallback } from '@/components/common/AppErrorFallback';
import { handleError } from '@/utils/errorHandling';

interface ErrorFallbackProps {
  readonly error: Error;
  readonly resetError?: () => void;
  readonly componentName?: string;
}

interface ComponentErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  readonly componentName: string;
  readonly onError?: (error: Error) => void;
}

interface ComponentErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

export class ComponentErrorBoundary extends Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ComponentErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error): void {
    const { componentName, onError } = this.props;

    handleError(error, {
      captureSentry: true,
      showToast: false,
      trackAnalytics: true,
      sentrySeverity: 'error',
      sentryTags: { component: componentName },
      analyticsEventName: 'Component Error',
      analyticsProperties: { component: componentName },
    });

    Sentry.withScope(scope => {
      scope.setTag('component', componentName);
      scope.setLevel('error');
      Sentry.captureException(error);
    });

    onError?.(error);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback({
          error,
          resetError: this.resetError,
          componentName,
        });
      }

      if (fallback) {
        return fallback;
      }

      return (
        <AppErrorFallback
          error={error}
          componentName={componentName}
          showDetails={__DEV__}
          centered
        />
      );
    }

    return children;
  }
}
