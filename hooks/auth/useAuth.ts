import * as Sentry from '@sentry/react-native';

import { useAuthContext } from '@/components/providers/AuthProvider';
import type { AuthResult } from '@/types/auth.types';

/**
 * The auth state. Throws outside an AuthProvider — and reports that to Sentry
 * first, since a provider missing from a tree is a build mistake that should
 * be seen, not only crash the screen.
 */
export function useAuth(): AuthResult {
  try {
    return useAuthContext();
  } catch (error) {
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
}

export type { AuthResult } from '@/types/auth.types';
