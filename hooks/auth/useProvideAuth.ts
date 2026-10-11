import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';

import { simpleAudioService } from '@/services/audioPlayer';
import { supabase, setupSupabaseAppStateListener } from '@/services/supabase';
import { useAppDispatch } from '@/store/hooks';
import { accountSwitched } from '@/store/accountActions';
import type { AuthResult, UserSession } from '@/types/auth.types';
import { claimDeviceForAccount } from '@/utils/accountSwitch';
import { authBreadcrumb, handleError } from '@/utils/errorHandling';

// Maximum number of retry attempts for session refresh
const MAX_REFRESH_RETRIES = 3;
// Time between retries (exponential backoff)
const RETRY_DELAY_MS = 1000;

// UserSession and AuthResult types are defined in '@/types/auth.types'

export function useProvideAuth(): AuthResult {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);
  const refreshAttemptsRef = useRef(0);
  const dispatch = useAppDispatch();
  // Read through a ref so `claimDevice` keeps one identity for the life of the
  // hook: it is reached from `initAuth` and the auth listener, and a changing
  // identity there would tear down and re-create the subscription.
  const dispatchRef = useRef(dispatch);
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  // Called whenever a session is established, and AWAITED before that session
  // is published. A no-op unless a different account last used this device —
  // see claimDeviceForAccount. Publishing first let the new account's screens
  // read the previous account's streak and pacing data in the gap before the
  // sweep landed, and write the merged result back under their own name.
  // Never rejects: a failed sweep must not keep anyone signed out.
  const claimDevice = useCallback(async (userId: string): Promise<void> => {
    try {
      if (await claimDeviceForAccount(userId)) dispatchRef.current(accountSwitched());
    } catch (error) {
      void handleError(error, {
        showToast: false,
        analyticsEventName: 'Account_Switch_Cleanup_Error',
      });
    }
  }, []);

  // Refresh session function with exponential backoff retry logic
  const refreshSession = useCallback(async (): Promise<UserSession | null> => {
    setIsLoading(true);

    while (true) {
      const currentAttempt = refreshAttemptsRef.current + 1;
      refreshAttemptsRef.current = currentAttempt;

      authBreadcrumb(`Refreshing session (attempt ${currentAttempt})`);

      try {
        // Check network connectivity before attempting refresh. Only a
        // definitive `false` counts: `isConnected` is `boolean | null`, and null
        // means UNKNOWN — skipping the refresh on that would abandon a session
        // that could have been renewed fine. Same fail-open rule as the auth
        // form's pre-flight.
        const netState = await NetInfo.fetch();
        if (netState?.isConnected === false) {
          authBreadcrumb('No network connection during refresh attempt', undefined, 'warning');
          setIsLoading(false);
          return null;
        }

        // Modern supabase-js v2 auto-initializes and auto-refreshes with autoRefreshToken: true
        // Let Supabase handle the refresh
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          Sentry.captureException(refreshError, {
            tags: { location: 'session_refresh' },
            level: 'warning',
          });

          // If we've reached max retries, don't keep retrying
          if (currentAttempt >= MAX_REFRESH_RETRIES) {
            setIsLoading(false);
            return null;
          }

          // Implement exponential backoff for retries
          const retryDelay = RETRY_DELAY_MS * 2 ** (currentAttempt - 1);
          await new Promise<void>(resolve => setTimeout(resolve, retryDelay));

          // Try another refresh with exponential backoff
          continue;
        }

        if (refreshData.session) {
          // Reset refresh attempts on success
          authBreadcrumb('Session refreshed successfully');

          refreshAttemptsRef.current = 0;
          setSession(refreshData.session);
          setAuthError(null);
          setIsLoading(false);
          return refreshData.session;
        } else {
          setSession(null);
          setIsLoading(false);
          return null;
        }
      } catch (error) {
        void handleError(error instanceof Error ? error : new Error('Unknown auth error'), {
          analyticsEventName: 'Session_Refresh_Error',
          sentrySeverity: 'error',
          showToast: false,
        });
        setIsLoading(false);
        return null;
      }
    }
  }, []);

  // Perform initial auth setup
  const initAuth = useCallback(async () => {
    try {
      authBreadcrumb('Starting auth initialization');

      // Modern supabase-js v2 auto-initializes on first use
      // Auto-refresh is enabled with autoRefreshToken: true in client config
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        Sentry.captureException(error, {
          tags: { location: 'auth_init_get_session' },
          level: 'error',
        });
        setSession(null);
        setAuthError(error);
      } else if (data.session) {
        authBreadcrumb('Successfully initialized with valid session');
        await claimDevice(data.session.user.id);
        setSession(data.session);
        setAuthError(null);
      } else {
        authBreadcrumb('Initialized but no valid session found');
        setSession(null);
      }
    } catch (error) {
      void handleError(error, {
        analyticsEventName: 'Auth_Initialization_Failed',
        sentrySeverity: 'error',
        showToast: false,
      });
      setSession(null);
      setAuthError(error instanceof Error ? error : new Error('Auth initialization failed'));
    } finally {
      setIsLoading(false);
    }
  }, [claimDevice]);

  useEffect(() => {
    // The supabase service's AppState listener starts/stops the auth-js
    // auto-refresh ticker on foreground/background; startAutoRefresh fires an
    // immediate refresh tick on activation, and the resulting TOKEN_REFRESHED
    // events arrive through onAuthStateChange below — no foreground
    // getSession() polling needed here.
    const removeSupabaseListener = setupSupabaseAppStateListener();
    let isMounted = true;
    let authSubscriptionUnsubscribe: () => void = () => undefined;
    // Counts handled auth events, so a deferred publish can tell it was overtaken.
    let authEventSeq = 0;

    // Initialize auth — async session fetch that must run once on mount; setState
    // happens after awaited supabase call resolves, not synchronously in effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void initAuth();

    // Listen for auth state changes
    // CRITICAL: Callback must NOT be async and should defer all operations to prevent deadlocks
    // See: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      // Defer all operations (including Sentry) to avoid deadlock
      setTimeout(() => {
        // FIXED: Guard against race condition where component unmounts between setTimeout queue and execution
        if (!isMounted) return;

        authEventSeq += 1;
        const eventSeq = authEventSeq;

        authBreadcrumb(`Auth state change: ${event}`);

        if (event === 'SIGNED_OUT') {
          // Stop audio to prevent stale playback state
          simpleAudioService.stop().catch(() => {
            // Silent failure — audio may not be playing
          });
          setSession(null);
          setIsLoading(false);
        } else if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          // A recovery link's verifyOtp signs the user in with PASSWORD_RECOVERY,
          // and updateUser (the new password itself) emits USER_UPDATED. Ignoring
          // them left React's session behind the client's: after a cold-start
          // reset the tabs stayed guarded, so "success" left the user stranded
          // on the form, and requests ran as a user the UI did not show.
          event === 'PASSWORD_RECOVERY' ||
          event === 'USER_UPDATED'
        ) {
          if (newSession && event === 'SIGNED_IN') {
            authBreadcrumb('New session received, updating state');
            // Publish only once the claim has settled, and only if no later
            // auth event overtook it while it ran — that one has already
            // published the state this would now be overwriting.
            void claimDevice(newSession.user.id).then(() => {
              if (!isMounted || authEventSeq !== eventSeq) return;
              setSession(newSession);
              setAuthError(null);
              setIsLoading(false);
            });
            return;
          }
          if (newSession) {
            authBreadcrumb('New session received, updating state');
            setSession(newSession);
            setAuthError(null);
          }
          setIsLoading(false);
        }
      }, 0);
    });

    // Store the unsubscribe function
    authSubscriptionUnsubscribe = subscription.unsubscribe;

    return () => {
      isMounted = false;
      if (authSubscriptionUnsubscribe) {
        authSubscriptionUnsubscribe();
      }
      removeSupabaseListener();
    };
  }, [initAuth, claimDevice]);

  // Memoize the returned object to ensure reference stability
  const authResult = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      authError,
      refreshSession,
      isAuthenticated: !!session?.user,
    }),
    [session, isLoading, authError, refreshSession],
  );

  return authResult;
}
