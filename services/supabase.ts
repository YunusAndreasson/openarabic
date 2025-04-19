import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/Supabase';

import type { Database } from '../types/database.types';
import { handleError } from '../utils/errorHandling';

// Constant for session refresh interval (every 6 days to stay within 7-day max)
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

// Store refresh interval ID
let refreshIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Supabase client configuration and initialization
 * Handles authentication state persistence and auto-refresh
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    // More aggressive session refresh settings
    storageKey: 'supabase.auth.token',
  },
});

// Set up auth state change listener to manage auto-refresh
supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
  // Clear any existing refresh interval
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }

  if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
    // Start auto-refresh when signed in or token refreshed
    supabase.auth.startAutoRefresh();

    // Set up periodic session refresh to prevent expiration
    if (session) {
      // More frequent refresh interval
      refreshIntervalId = setInterval(async () => {
        try {
          const { error } = await supabase.auth.refreshSession();
          if (error) {
            // If refresh fails, try to get current session
            const { data } = await supabase.auth.getSession();
            if (!data.session && refreshIntervalId) {
              clearInterval(refreshIntervalId);
              refreshIntervalId = null;
            }
          }
        } catch (err) {
          handleError(err instanceof Error ? err : new Error(String(err)), {
            toastMessage: 'Failed to refresh session',
            analyticsEventName: 'Auth_Refresh_Error',
            sentrySeverity: 'warning',
          });
        }
      }, THIRTY_MINUTES_MS); // Refresh every 30 minutes instead of 6 days
    }
  } else if (event === 'SIGNED_OUT') {
    // Stop auto-refresh when signed out
    supabase.auth.stopAutoRefresh();
  }
});

// Handle app state changes for session persistence
AppState.addEventListener('change', async state => {
  if (state === 'active') {
    // When app becomes active, check and refresh session if needed
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        return;
      }

      if (session) {
        // Start auto-refresh and manually refresh session
        supabase.auth.startAutoRefresh();
        await supabase.auth.refreshSession();
      }
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(String(err)), {
        toastMessage: 'Failed to refresh session',
        analyticsEventName: 'Auth_Refresh_Error',
        sentrySeverity: 'warning',
      });
    }
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

/**
 * Helper function to attempt session refresh and validation
 * @param expectedUserId - Optional user ID to validate against
 * @returns Valid session and user or null if refresh failed
 */
async function tryRefreshSession(
  expectedUserId?: string
): Promise<{ session: Session; user: User } | null> {
  try {
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
