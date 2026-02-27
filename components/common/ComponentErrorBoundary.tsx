import * as Sentry from '@sentry/react-native';
import { Component, memo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { handleError } from '@/utils/errorHandling';

interface ErrorFallbackProps {
  readonly error: Error;
  readonly resetError?: () => void;
  readonly componentName?: string;
}

const DefaultErrorFallback = memo(function DefaultErrorFallback({
  error,
  componentName,
}: Omit<ErrorFallbackProps, 'resetError'>) {
  const errorMessage = error.message || STRINGS.UNKNOWN_ERROR_OCCURRED;
  return (
    <View style={styles.errorContainer}>
      <ThemedText type="heading3" variant="error" style={styles.errorTitle}>
        {STRINGS.SOMETHING_WENT_WRONG}
      </ThemedText>
      <ThemedText style={styles.errorMessage} type="body">
        {STRINGS.PLEASE_TRY_AGAIN}
      </ThemedText>
      {__DEV__ && (
        <ThemedText colorName="textTertiary" type="caption">
          {componentName ? `[${componentName}] ` : ''}
          {errorMessage}
        </ThemedText>
      )}
    </View>
  );
});

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

      return <DefaultErrorFallback error={error} componentName={componentName} />;
    }

    return children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  errorTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    marginBottom: LAYOUT.SPACING.SMALL,
    textAlign: 'center',
  },
  errorMessage: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
});
