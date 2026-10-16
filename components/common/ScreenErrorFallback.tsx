import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { STRINGS } from '@/constants/strings';
import { handleError } from '@/utils/errorHandling';

/**
 * What a screen renders in place of itself after it throws — passed to the
 * root Stack and the tabs as Expo Router's `unstable_screenErrorBoundary`.
 *
 * Without it a render error in any screen fell through to the root Sentry
 * boundary and replaced the whole app, tab bar included. Now only the screen
 * that threw is replaced, every other tab keeps working, and Refresh renders it
 * again.
 *
 * Expo Router's boundary catches the error before the root boundary or the
 * global handler sees it, so it is reported from here.
 */
export function ScreenErrorFallback({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    void handleError(error, {
      showToast: false,
      analyticsEventName: 'Screen_Error',
      sentryTags: { boundary: 'screen' },
    });
  }, [error]);

  return <ErrorState message={STRINGS.SOMETHING_WENT_WRONG} onRetry={() => void retry()} />;
}
