import * as Sentry from '@sentry/react-native';
import type { ReactElement, ReactNode } from 'react';

import { AppErrorFallback } from '@/components/common/AppErrorFallback';
import { handleError } from '@/utils/errorHandling';

interface ErrorFallbackProps {
  /** Whatever was thrown — not necessarily an `Error`. */
  readonly error: unknown;
  readonly resetError: () => void;
  readonly componentName: string;
}

interface ComponentErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: ReactElement | ((props: ErrorFallbackProps) => ReactElement);
  readonly componentName: string;
  readonly onError?: (error: unknown) => void;
}

/**
 * Contains a render error to one part of a screen — the audio player, a sheet's
 * content — so that part is replaced by a fallback and the screen around it
 * keeps working.
 *
 * A thin wrapper over Sentry's own boundary. It used to be a class of its own
 * that reported every error twice — once through `handleError`, then again
 * through its own `captureException` — and dropped React's component stack on
 * the way, which is the one clue to where in the tree a render failed.
 * Sentry's boundary captures once, with the component stack attached;
 * `beforeCapture` tags that event with the part that threw, and `onError` adds
 * the analytics event without capturing a second time.
 */
export function ComponentErrorBoundary({
  children,
  fallback,
  componentName,
  onError,
}: ComponentErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      beforeCapture={scope => {
        scope.setTag('component', componentName);
      }}
      onError={error => {
        void handleError(error, {
          captureSentry: false,
          showToast: false,
          analyticsEventName: 'Component Error',
          analyticsProperties: { component: componentName },
        });
        onError?.(error);
      }}
      fallback={errorData => {
        const { error } = errorData;
        if (typeof fallback === 'function') {
          // Sentry types `resetError` as a method; call it on its own object.
          return fallback({ error, resetError: () => errorData.resetError(), componentName });
        }
        return (
          fallback ?? (
            <AppErrorFallback
              error={error}
              componentName={componentName}
              showDetails={__DEV__}
              centered
            />
          )
        );
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
