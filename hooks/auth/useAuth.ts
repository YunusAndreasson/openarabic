import * as Sentry from '@sentry/react-native';
import { use } from 'react';

import { AuthContext } from '@/components/providers';
import type { AuthResult } from '@/types/auth.types';

export function useAuth(): AuthResult {
  const context = use(AuthContext);
  if (!context) {
    const error = new Error(
      'useAuth must be used within an AuthProvider. Check that AuthProvider wraps your component tree.',
    );

    // Log to Sentry
    Sentry.captureException(error, {
      tags: {
        location: 'useAuth_hook',
        severity: 'error',
      },
      extra: {
        component_stack: 'useAuth called outside AuthProvider context',
      },
    });

    throw error;
  }
  return context;
}

export type { AuthResult, UserSession } from '@/types/auth.types';
