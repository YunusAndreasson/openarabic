import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/Supabase';

import type { Database } from '../types/database.types';
import { handleError } from '../utils/errorHandling';

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
    debug: false,
  },
});

// Tells Supabase Auth to continuously refresh the session automatically
AppState.addEventListener('change', state => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

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

  if (!data.session || !data.session.user) {
    const error = new Error('User must be authenticated');
    handleError(error, {
      toastMessage: 'Please sign in to continue',
      analyticsEventName: 'Auth_Required',
      sentrySeverity: 'info',
    });
    throw error;
  }

  // If an expected user ID was provided, verify it matches
  if (expectedUserId && data.session.user.id !== expectedUserId) {
    const error = new Error('User ID mismatch');
    handleError(error, {
      toastMessage: 'Session expired, please sign in again',
      analyticsEventName: 'Auth_User_Mismatch',
      sentrySeverity: 'warning',
    });
    throw error;
  }

  return {
    session: data.session,
    user: data.session.user,
  };
}
