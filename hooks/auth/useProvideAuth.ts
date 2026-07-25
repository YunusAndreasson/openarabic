import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';

import { simpleAudioService } from '@/services/audioPlayer';
import { supabase, setupSupabaseAppStateListener } from '@/services/supabase';
import type { AuthResult, UserSession } from '@/types/auth.types';
import { handleError } from '@/utils/errorHandling';

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

  // Refresh session function with exponential backoff retry logic
  const refreshSession = useCallback(async (): Promise<UserSession | null> => {
    setIsLoading(true);

    while (true) {
      const currentAttempt = refreshAttemptsRef.current + 1;
      refreshAttemptsRef.current = currentAttempt;

      Sentry.addBreadcrumb({
        category: 'auth',
        message: `Refreshing session (attempt ${currentAttempt})`,
        level: 'info',
      });

      try {
        // Check network connectivity before attempting refresh
        const netState = await NetInfo.fetch();
        if (!netState.isConnected) {
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'No network connection during refresh attempt',
            level: 'warning',
          });
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
          const retryDelay = RETRY_DELAY_MS * Math.pow(2, currentAttempt - 1);
          await new Promise<void>(resolve => setTimeout(resolve, retryDelay));

          // Try another refresh with exponential backoff
          continue;
        }

        if (refreshData.session) {
          // Reset refresh attempts on success
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'Session refreshed successfully',
            level: 'info',
          });

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
        handleError(error instanceof Error ? error : new Error('Unknown auth error'), {
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
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Starting auth initialization',
        level: 'info',
      });

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
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Successfully initialized with valid session',
          level: 'info',
        });
        setSession(data.session);
        setAuthError(null);
      } else {
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Initialized but no valid session found',
          level: 'info',
        });
        setSession(null);
      }
    } catch (error) {
      handleError(error, {
        analyticsEventName: 'Auth_Initialization_Failed',
        sentrySeverity: 'error',
        showToast: false,
      });
      setSession(null);
      setAuthError(error instanceof Error ? error : new Error('Auth initialization failed'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // The supabase service's AppState listener starts/stops the auth-js
    // auto-refresh ticker on foreground/background; startAutoRefresh fires an
    // immediate refresh tick on activation, and the resulting TOKEN_REFRESHED
    // events arrive through onAuthStateChange below — no foreground
    // getSession() polling needed here.
    const removeSupabaseListener = setupSupabaseAppStateListener();
    let isMounted = true;
    let authSubscriptionUnsubscribe: () => void = () => undefined;

    // Initialize auth — async session fetch that must run once on mount; setState
    // happens after awaited supabase call resolves, not synchronously in effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initAuth();

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

        Sentry.addBreadcrumb({
          category: 'auth',
          message: `Auth state change: ${event}`,
          level: 'info',
        });

        if (event === 'SIGNED_OUT') {
          // Stop audio to prevent stale playback state
          simpleAudioService.stop().catch(() => {
            // Silent failure — audio may not be playing
          });
          setSession(null);
          setIsLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (newSession) {
            Sentry.addBreadcrumb({
              category: 'auth',
              message: 'New session received, updating state',
              level: 'info',
            });
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
  }, [initAuth]);

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
