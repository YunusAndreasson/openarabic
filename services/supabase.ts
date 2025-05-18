import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/Supabase';

import type { Database } from '../types/database.types';
import { handleError } from '../utils/errorHandling';

// Maximum retry attempts for initialization
const MAX_INIT_RETRIES = 3;
// Delay between retries in ms
const INIT_RETRY_DELAY = 1000;

/**
 * Supabase client configuration and initialization
 * Relies on Supabase's built-in session management
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

/**
 * Attempts to initialize Supabase auth with retries
 * @returns Promise resolving to success status
 */
async function initializeSupabaseWithRetry(retries = MAX_INIT_RETRIES): Promise<boolean> {
  try {
    // Initialize auth to ensure storage is loaded
    await supabase.auth.initialize();

    // Ensure auto-refresh is active
    supabase.auth.startAutoRefresh();

    // Try refreshing the session immediately
    const { error } = await supabase.auth.refreshSession();

    // If no session exists, this isn't an error
    if (error && error.message !== 'No current session') {
      throw error;
    }

    return true;
  } catch (err) {
    if (retries <= 0) {
      handleError(err instanceof Error ? err : new Error(String(err)), {
        toastMessage: 'Failed to initialize session',
        analyticsEventName: 'Auth_Init_Error_Final',
        sentrySeverity: 'error',
      });
      return false;
    }

    // Log the retry attempt
    console.warn(
      `Auth initialization error, retrying (${retries} attempts left)`,
      err instanceof Error ? err.message : String(err)
    );

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, INIT_RETRY_DELAY));

    // Recursive retry with one fewer attempt
    return initializeSupabaseWithRetry(retries - 1);
  }
}

/**
 * Registers an AppState listener to keep the auth session active.
 *
 * @returns A cleanup function that removes the listener.
 */
export function setupSupabaseAppStateListener(): () => void {
  const subscription = AppState.addEventListener('change', async state => {
    if (state === 'active') {
      // Track whether this is the first time becoming active
      const isFirstActivation = !subscription.hasOwnProperty('_hasActivated');
      (subscription as any)._hasActivated = true;

      // Always initialize with retries when app becomes active
      const success = await initializeSupabaseWithRetry();

      if (!success && isFirstActivation) {
        // If this is the first activation and initialization fails completely,
        // try one more approach - clear storage and reinitialize
        try {
          // This is a last resort to fix corrupted auth state
          await AsyncStorage.removeItem('supabase.auth.token');
          await supabase.auth.initialize();
          supabase.auth.startAutoRefresh();
        } catch (lastResortErr) {
          handleError(
            lastResortErr instanceof Error ? lastResortErr : new Error(String(lastResortErr)),
            {
              toastMessage: 'Session recovery failed',
              analyticsEventName: 'Auth_Recovery_Failed',
              sentrySeverity: 'error',
            }
          );
        }
      }
    }
    // Don't stop auto-refresh in background to maintain session
  });

  return () => subscription.remove();
}

/**
 * Helper function to attempt session refresh and validation
 * @param expectedUserId - Optional user ID to validate against
 * @returns Valid session and user or null if refresh failed
 */
async function tryRefreshSession(
  expectedUserId?: string
): Promise<{ session: Session; user: User } | null> {
  try {
    // Initialize auth to ensure storage is loaded
    await supabase.auth.initialize();
    // Ensure auto-refresh is active
    supabase.auth.startAutoRefresh();
    // Use Supabase's built-in refresh
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      return null;
    }

    if (expectedUserId && data.session.user.id !== expectedUserId) {
      return null;
    }

    return {
      session: data.session,
      user: data.session.user,
    };
  } catch (refreshErr) {
    handleError(refreshErr instanceof Error ? refreshErr : new Error(String(refreshErr)), {
      toastMessage: 'Failed to refresh session',
      analyticsEventName: 'Auth_Session_Refresh_Error',
      sentrySeverity: 'warning',
    });
    return null;
  }
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
  // Initialize auth to ensure storage is loaded
  await supabase.auth.initialize();

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    handleError(error, {
      toastMessage: 'Authentication error',
      analyticsEventName: 'Auth_Session_Error',
      sentrySeverity: 'error',
    });
    throw error;
  }

  // Check if session exists and is valid
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

  // Try to refresh session
  const refreshResult = await tryRefreshSession(expectedUserId);
  if (refreshResult) {
    return refreshResult;
  }

  // Handle authentication errors
  const errorMessage =
    !data.session || !data.session.user ? 'User must be authenticated' : 'User ID mismatch';

  const toastMessage =
    !data.session || !data.session.user
      ? 'Please sign in to continue'
      : 'Session expired, please sign in again';

  const analyticsEvent =
    !data.session || !data.session.user ? 'Auth_Required' : 'Auth_User_Mismatch';

  const error_ = new Error(errorMessage);
  handleError(error_, {
    toastMessage,
    analyticsEventName: analyticsEvent,
    sentrySeverity: 'info',
  });
  throw error_;
}
