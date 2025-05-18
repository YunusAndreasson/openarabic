import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import * as Sentry from '@sentry/react-native';

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/Supabase';

import type { Database } from '../types/database.types';
import { handleError } from '../utils/errorHandling';

// Maximum retry attempts for initialization
const MAX_INIT_RETRIES = 3;
// Delay between retries in ms
const INIT_RETRY_DELAY = 1000;
// Timeout for individual init operations
const INIT_OPERATION_TIMEOUT = 2000;

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
 * Wrapper for Supabase operations that might timeout
 * @param operation The async operation to execute
 * @param timeoutMs Maximum time to wait before resolving with default value
 * @param defaultValue Value to return if operation times out
 */
async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  defaultValue: T
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>(resolve =>
      setTimeout(() => {
        Sentry.addBreadcrumb({
          category: 'supabase',
          message: `[Supabase] Operation timed out after ${timeoutMs}ms`,
          level: 'warning',
        });
        resolve(defaultValue);
      }, timeoutMs)
    ),
  ]);
}

/**
 * Attempts to initialize Supabase auth with retries
 * @returns Promise resolving to success status
 */
async function initializeSupabaseWithRetry(retries = MAX_INIT_RETRIES): Promise<boolean> {
  try {
    Sentry.addBreadcrumb({
      category: 'supabase',
      message: `[Supabase] Initializing with retries: ${retries}`,
      level: 'info',
    });

    // Initialize auth to ensure storage is loaded
    await withTimeout(
      async () => {
        await supabase.auth.initialize();
        Sentry.addBreadcrumb({
          category: 'supabase',
          message: '[Supabase] Auth initialized',
          level: 'info',
        });
      },
      INIT_OPERATION_TIMEOUT,
      undefined
    );

    // Ensure auto-refresh is active
    supabase.auth.startAutoRefresh();
    Sentry.addBreadcrumb({
      category: 'supabase',
      message: '[Supabase] Auto-refresh started',
      level: 'info',
    });

    // Try refreshing the session immediately
    const { error } = await withTimeout(
      async () => supabase.auth.refreshSession(),
      INIT_OPERATION_TIMEOUT,
      { data: { session: null }, error: null } as unknown as Awaited<
        ReturnType<typeof supabase.auth.refreshSession>
      >
    );

    // If no session exists, this isn't an error
    if (error && error.message !== 'No current session') {
      Sentry.addBreadcrumb({
        category: 'supabase',
        message: `[Supabase] Session refresh error: ${error.message}`,
        level: 'warning',
      });
      throw error;
    }

    Sentry.addBreadcrumb({
      category: 'supabase',
      message: '[Supabase] Initialization successful',
      level: 'info',
    });
    return true;
  } catch (err) {
    if (retries <= 0) {
      Sentry.addBreadcrumb({
        category: 'supabase',
        message: '[Supabase] Initialization failed, no more retries',
        level: 'error',
      });
      handleError(err instanceof Error ? err : new Error(String(err)), {
        toastMessage: 'Failed to initialize session',
        analyticsEventName: 'Auth_Init_Error_Final',
        sentrySeverity: 'error',
      });
      return false;
    }

    // Log the retry attempt
    Sentry.addBreadcrumb({
      category: 'supabase',
      message: `[Supabase] Auth initialization error, retrying (${retries} attempts left): ${err instanceof Error ? err.message : String(err)}`,
      level: 'warning',
    });

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, INIT_RETRY_DELAY));

    // Recursive retry with one fewer attempt
    return initializeSupabaseWithRetry(retries - 1);
  }
}

/**
 * Checks and repairs any corrupted auth storage
 * @returns Promise resolving to success status
 */
async function repairAuthStorageIfNeeded(): Promise<boolean> {
  try {
    Sentry.addBreadcrumb({
      category: 'supabase',
      message: '[Supabase] Checking auth storage integrity',
      level: 'info',
    });
    // Try to access the auth token to check for corruption
    const authToken = await AsyncStorage.getItem('supabase.auth.token');

    if (authToken) {
      try {
        // Try to parse the token to verify integrity
        JSON.parse(authToken);
        Sentry.addBreadcrumb({
          category: 'supabase',
          message: '[Supabase] Auth token is valid JSON',
          level: 'info',
        });
        return true;
      } catch (parseError) {
        Sentry.addBreadcrumb({
          category: 'supabase',
          message: '[Supabase] Auth token is corrupted, clearing it',
          level: 'warning',
        });
        // If token can't be parsed, it's corrupted - remove it
        await AsyncStorage.removeItem('supabase.auth.token');
        // Clear other related auth items
        await AsyncStorage.removeItem('supabase.auth.refreshToken');
        await AsyncStorage.removeItem('supabase.auth.expires_at');

        // Reinitialize after clearing
        await supabase.auth.initialize();
        return true;
      }
    }

    return true;
  } catch (error) {
    Sentry.addBreadcrumb({
      category: 'supabase',
      message: `[Supabase] Error checking/repairing auth storage: ${error instanceof Error ? error.message : String(error)}`,
      level: 'error',
    });
    return false;
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
      Sentry.addBreadcrumb({
        category: 'supabase',
        message: '[Supabase] App became active',
        level: 'info',
      });
      // Track whether this is the first time becoming active
      const isFirstActivation = !subscription.hasOwnProperty('_hasActivated');
      (subscription as any)._hasActivated = true;

      // Check and repair storage first
      if (isFirstActivation) {
        await repairAuthStorageIfNeeded();
      }

      // Always initialize with retries when app becomes active
      const success = await initializeSupabaseWithRetry();

      if (!success && isFirstActivation) {
        Sentry.addBreadcrumb({
          category: 'supabase',
          message: '[Supabase] First activation failed, trying last resort recovery',
          level: 'warning',
        });
        // If this is the first activation and initialization fails completely,
        // try one more approach - clear storage and reinitialize
        try {
          // This is a last resort to fix corrupted auth state
          await AsyncStorage.removeItem('supabase.auth.token');
          await supabase.auth.initialize();
          supabase.auth.startAutoRefresh();
          Sentry.addBreadcrumb({
            category: 'supabase',
            message: '[Supabase] Last resort recovery complete',
            level: 'info',
          });
        } catch (lastResortErr) {
          Sentry.addBreadcrumb({
            category: 'supabase',
            message: `[Supabase] Last resort recovery failed: ${lastResortErr instanceof Error ? lastResortErr.message : String(lastResortErr)}`,
            level: 'error',
          });
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
    Sentry.addBreadcrumb({
      category: 'supabase',
      message: '[Supabase] Trying to refresh session',
      level: 'info',
    });
    // Initialize auth to ensure storage is loaded
    await withTimeout(
      async () => await supabase.auth.initialize(),
      INIT_OPERATION_TIMEOUT,
      undefined
    );

    // Ensure auto-refresh is active
    supabase.auth.startAutoRefresh();

    // Use Supabase's built-in refresh
    const { data, error } = await withTimeout(
      async () => await supabase.auth.refreshSession(),
      INIT_OPERATION_TIMEOUT,
      { data: { session: null }, error: null } as unknown as Awaited<
        ReturnType<typeof supabase.auth.refreshSession>
      >
    );

    if (error || !data.session) {
      Sentry.addBreadcrumb({
        category: 'supabase',
        message: `[Supabase] Session refresh failed: ${error?.message || 'No session'}`,
        level: 'warning',
      });
      return null;
    }

    if (expectedUserId && data.session.user.id !== expectedUserId) {
      Sentry.addBreadcrumb({
        category: 'supabase',
        message: '[Supabase] User ID mismatch in session',
        level: 'warning',
      });
      return null;
    }

    Sentry.addBreadcrumb({
      category: 'supabase',
      message: '[Supabase] Session refresh successful',
      level: 'info',
    });
    return {
      session: data.session,
      user: data.session.user,
    };
  } catch (refreshErr) {
    Sentry.addBreadcrumb({
      category: 'supabase',
      message: `[Supabase] Session refresh error: ${refreshErr instanceof Error ? refreshErr.message : String(refreshErr)}`,
      level: 'error',
    });
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
  await withTimeout(
    async () => await supabase.auth.initialize(),
    INIT_OPERATION_TIMEOUT,
    undefined
  );

  const { data, error } = await withTimeout(
    async () => await supabase.auth.getSession(),
    INIT_OPERATION_TIMEOUT,
    { data: { session: null }, error: null } as unknown as Awaited<
      ReturnType<typeof supabase.auth.getSession>
    >
  );

  if (error) {
    Sentry.addBreadcrumb({
      category: 'supabase',
      message: `[Supabase] Authentication error: ${error.message}`,
      level: 'error',
    });
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
