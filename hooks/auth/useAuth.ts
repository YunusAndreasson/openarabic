import * as Sentry from '@sentry/react-native';
import { useContext } from 'react';

import { AuthContext } from '@/components/providers/AuthProvider';

import type { AuthResult } from './useProvideAuth';

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
      console.error('useAuth Error: Make sure your component is wrapped with AuthProvider');
      console.error('Check your component hierarchy and ensure AuthProvider is in the parent tree');
    }

    throw error;
  }
  return context;
}

export type { AuthResult, UserSession } from './useProvideAuth';
