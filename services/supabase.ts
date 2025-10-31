import * as Sentry from '@sentry/react-native';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/constants/supabase';
import type { Database } from '@/types/database.types';
import { handleError } from '@/utils/errorHandling';
import { getSafeStorage, isAsyncStorageAvailable } from '@/utils/safeAsyncStorage';

/**
 * Supabase client configuration and initialization
 * Relies on Supabase's built-in session management
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: getSafeStorage(),
    autoRefreshToken: true,
    persistSession: isAsyncStorageAvailable(),
    detectSessionInUrl: false, // Mobile-only: no URL session detection needed
    flowType: 'implicit', // Mobile-only: implicit flow for native apps
    debug: false,
  },
});

/**
 * Registers an AppState listener to keep the auth session active.
 * Modern supabase-js v2 auto-initializes on first use and auto-refreshes tokens when autoRefreshToken: true.
 *
 * @returns A cleanup function that removes the listener.
 */
export function setupSupabaseAppStateListener(): () => void {
  const subscription = AppState.addEventListener('change', async state => {
    if (state === 'active') {
      try {
        // Just verify session is active - no manual initialization needed
        const { error } = await supabase.auth.getSession();

        if (error) {
          await handleError(error, {
            analyticsEventName: 'Auth_Session_Check_Error',
            sentrySeverity: 'warning',
            showToast: false,
          });
        }
      } catch (err) {
        await handleError(err instanceof Error ? err : new Error(String(err)), {
          analyticsEventName: 'Auth_Session_Check_Error',
          sentrySeverity: 'error',
          showToast: false,
        });
      }
    }
  });

  return () => subscription.remove();
}

/**
 * Checks if a user is authenticated and has the expected user ID
 * @param expectedUserId - The user ID to validate against (optional)
 * @returns The authenticated user's session and user object
 * @throws Error if user is not authenticated or IDs don't match
 */
export async function checkAuthentication(expectedUserId?: string): Promise<{
  session: Session;
  user: User;
}> {
  try {
    // Modern supabase-js v2 auto-initializes on first use
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      Sentry.captureException(error, {
        tags: { location: 'auth_check' },
        level: 'error',
      });
      throw error;
    }

    const hasValidSession =
      data.session &&
      data.session.user &&
      (!expectedUserId || data.session.user.id === expectedUserId);

    if (hasValidSession) {
      return {
        session: data.session,
        user: data.session.user,
      };
    }

    const errorMessage = !data.session?.user ? 'User must be authenticated' : 'User ID mismatch';

    const error_ = new Error(errorMessage);
    await handleError(error_, {
      analyticsEventName: !data.session?.user ? 'Auth_Required' : 'Auth_User_Mismatch',
      sentrySeverity: 'info',
    });
    throw error_;
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error(String(err)), {
      sentrySeverity: 'error',
      analyticsEventName: 'Auth_Check_Error',
      showToast: false,
    });
    Sentry.captureException(err, {
      tags: { location: 'check_authentication' },
      level: 'error',
    });
    throw err;
  }
}
