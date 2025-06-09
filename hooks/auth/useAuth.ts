import * as Sentry from '@sentry/react-native';
import { useContext } from 'react';


import { AuthContext } from '@/components/providers/AuthProvider';
import type { AuthResult } from '@/types/auth.types';
import { handleError } from '@/utils/errorHandling';

export function useAuth(): AuthResult {
  const context = useContext(AuthContext);
  if (!context) {
    const error = new Error(
      'useAuth must be used within an AuthProvider. Check that AuthProvider wraps your component tree.'
    );

    // Log to Sentry for debugging
    Sentry.captureException(error, {
      tags: {
        location: 'useAuth_hook',
        severity: 'error',
      },
      extra: {
        component_stack: 'useAuth called outside AuthProvider context',
      },
    });

    // Provide a more descriptive error for development
    if (__DEV__) {
      handleError(error, { showToast: false, captureSentry: false });
    }

    throw error;
  }
  return context;
}

export type { AuthResult, UserSession } from '@/types/auth.types';
