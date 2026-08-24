import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_REQUEST_TIMEOUT_MS, SUPABASE_URL } from '@/constants/supabase';
import type { Database } from '@/types/database.types';
import { handleError } from '@/utils/errorHandling';

/**
 * `fetch` with a deadline, for every Supabase request.
 *
 * Neither supabase-js nor React Native's fetch imposes a timeout, so a request
 * that lands on a dead pooled connection hangs instead of failing — see
 * SUPABASE_REQUEST_TIMEOUT_MS for the measurement and why a hang is worse than
 * an error here.
 *
 * A caller-supplied signal (supabase-js `.abortSignal()`, and the auth client's
 * own cancellation) is chained rather than replaced, so aborting from outside
 * still works and the deadline applies on top of it.
 */
const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const callerSignal = init?.signal;

  if (callerSignal?.aborted) {
    controller.abort();
  }

  const abortFromCaller = (): void => controller.abort();
  callerSignal?.addEventListener('abort', abortFromCaller);
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
};

/**
 * Supabase client configuration and initialization
 * Relies on Supabase's built-in session management
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Mobile apps don't need URL session detection
    flowType: 'implicit', // Mobile-only: implicit flow for native apps
    debug: false,
  },
  global: {
    fetch: fetchWithTimeout,
  },
});

/**
 * Registers the single AppState listener that drives supabase-js token
 * auto-refresh (the documented React Native pattern): the refresh ticker runs
 * only while the app is foregrounded. startAutoRefresh() fires an immediate
 * refresh tick on activation, and any resulting session change is delivered
 * through onAuthStateChange (TOKEN_REFRESHED) — no manual getSession() polling.
 *
 * @returns A cleanup function that removes the listener.
 */
export function setupSupabaseAppStateListener(): () => void {
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });

  return () => subscription.remove();
}

/**
 * Reports an authentication precondition failure exactly once (Sentry +
 * analytics, no toast — see checkAuthentication).
 */
function reportAuthFailure(
  error: Error,
  analyticsEventName: string,
  sentrySeverity: 'error' | 'info',
): Promise<void> {
  return handleError(error, {
    showToast: false,
    analyticsEventName,
    sentrySeverity,
    sentryTags: { location: 'check_authentication' },
  });
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
  // Each failure path reports exactly once and then throws. The previous
  // try/catch-around-everything wrapper re-reported anything thrown inside it,
  // so a single failure produced three Sentry events and two analytics events —
  // multiplied by every executeAuthenticatedQuery call while signed out.
  //
  // No toast here either: this is an internal precondition check, and every
  // caller already surfaces its own STRINGS message (or redirects to auth) on
  // rejection. Toasting `error.message` also leaked a raw developer string.

  // Modern supabase-js v2 auto-initializes on first use. getSession can either
  // reject outright or resolve with an `error` — both are the same failure here.
  let sessionResult: Awaited<ReturnType<typeof supabase.auth.getSession>>;
  try {
    sessionResult = await supabase.auth.getSession();
  } catch (err) {
    await reportAuthFailure(
      err instanceof Error ? err : new Error(String(err)),
      'Auth_Check_Error',
      'error',
    );
    throw err;
  }

  const { data, error } = sessionResult;

  if (error) {
    await reportAuthFailure(error, 'Auth_Check_Error', 'error');
    throw error;
  }

  const session = data.session;
  if (session?.user && (!expectedUserId || session.user.id === expectedUserId)) {
    return { session, user: session.user };
  }

  const isUserMismatch = !!session?.user;
  const error_ = new Error(isUserMismatch ? 'User ID mismatch' : 'User must be authenticated');
  await reportAuthFailure(error_, isUserMismatch ? 'Auth_User_Mismatch' : 'Auth_Required', 'info');
  throw error_;
}
