import { useEffect, useState, useMemo, useCallback } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';

import { supabase, setupSupabaseAppStateListener } from '../services/supabase';

// Maximum number of retry attempts for session refresh
const MAX_REFRESH_RETRIES = 3;
// Time between retries (exponential backoff)
const RETRY_DELAY_MS = 1000;
// Maximum time to wait for auth initialization
const AUTH_INIT_TIMEOUT_MS = 3000;
// Maximum time to wait for fetch session
const FETCH_SESSION_TIMEOUT_MS = 2000;

// Define session type based on properties we use
export type UserSession = {
  user: {
    id: string;
    email?: string;
    app_metadata: Record<string, unknown>;
    user_metadata: Record<string, unknown>;
  } | null;
  expires_at?: number;
};

export type AuthResult = {
  session: UserSession | null;
  user: UserSession['user'] | null;
  isLoading: boolean;
  authError: Error | null;
  refreshSession: () => Promise<UserSession | null>;
  isAuthenticated: boolean; // New property to easily check auth state
};

export function useProvideAuth(): AuthResult {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Function to fetch the session that can be called on demand
  const fetchSession = useCallback(async (): Promise<UserSession | null> => {
    try {
      Sentry.addBreadcrumb({
        category: 'auth',
        message: '[Auth] Fetching session...',
        level: 'info',
      });

      // Create a timeout for fetching session
      const fetchSessionPromise = async () => {
        try {
          // Initialize auth to ensure storage is loaded
          if (!authInitialized) {
            await supabase.auth.initialize();
            setAuthInitialized(true);
          }

          const {
            data: { session: fetchedSession },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            Sentry.addBreadcrumb({
              category: 'auth',
              message: `[Auth] Session fetch error: ${error.message}`,
              level: 'warning',
            });
            setAuthError(error);
            return null;
          }

          Sentry.addBreadcrumb({
            category: 'auth',
            message: `[Auth] Session fetch complete ${fetchedSession ? 'with session' : 'no session'}`,
            level: 'info',
          });
          return fetchedSession;
        } catch (err) {
          Sentry.addBreadcrumb({
            category: 'auth',
            message: `[Auth] Unexpected session fetch error: ${err instanceof Error ? err.message : String(err)}`,
            level: 'warning',
          });
          setAuthError(err instanceof Error ? err : new Error('Failed to fetch session'));
          return null;
        }
      };

      const timeoutPromise = new Promise<null>(resolve => {
        setTimeout(() => {
          Sentry.addBreadcrumb({
            category: 'auth',
            message: '[Auth] Session fetch timeout reached',
            level: 'warning',
          });
          resolve(null);
        }, FETCH_SESSION_TIMEOUT_MS);
      });

      // Race between the fetch and the timeout
      const result = await Promise.race([fetchSessionPromise(), timeoutPromise]);
      return result;
    } catch (error) {
      Sentry.addBreadcrumb({
        category: 'auth',
        message: `[Auth] Fatal session fetch error: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      });
      setAuthError(error instanceof Error ? error : new Error('Failed to fetch session'));
      return null;
    }
  }, [authInitialized]);

  // Refresh session function with exponential backoff retry logic
  const refreshSession = useCallback(async (): Promise<UserSession | null> => {
    Sentry.addBreadcrumb({
      category: 'auth',
      message: '[Auth] Refreshing session...',
      level: 'info',
    });
    setIsLoading(true);
    const currentAttempt = refreshAttempts + 1;
    setRefreshAttempts(currentAttempt);

    try {
      // Check network connectivity before attempting refresh
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        Sentry.addBreadcrumb({
          category: 'auth',
          message: '[Auth] No network connection, trying cached session',
          level: 'info',
        });
        // Try to use cached session if no network
        const cachedSession = await fetchSession();
        if (cachedSession) {
          setSession(cachedSession);
          setAuthError(null);
          setIsLoading(false);
          return cachedSession;
        }
        throw new Error('No network connection and no cached session available');
      }

      // Initialize auth to ensure storage is loaded
      if (!authInitialized) {
        await supabase.auth.initialize();
        setAuthInitialized(true);
      }

      // Ensure auto-refresh is active
      supabase.auth.startAutoRefresh();

      // Let Supabase handle the refresh
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        Sentry.addBreadcrumb({
          category: 'auth',
          message: `[Auth] Session refresh error: ${refreshError.message}`,
          level: 'warning',
        });
        // If refresh fails but under max retries, try getting the current session
        const fetchedSession = await fetchSession();
        if (fetchedSession) {
          setSession(fetchedSession);
          setAuthError(null);
          setIsLoading(false);
          return fetchedSession;
        }

        // If we've reached max retries, don't keep retrying
        if (currentAttempt >= MAX_REFRESH_RETRIES) {
          throw new Error(`Could not refresh session after ${MAX_REFRESH_RETRIES} attempts`);
        }

        // Implement exponential backoff for retries
        const retryDelay = RETRY_DELAY_MS * Math.pow(2, currentAttempt - 1);
        await new Promise(resolve => setTimeout(resolve, retryDelay));

        // Try another refresh recursively with exponential backoff
        return refreshSession();
      }

      if (refreshData.session) {
        Sentry.addBreadcrumb({
          category: 'auth',
          message: '[Auth] Session refresh successful',
          level: 'info',
        });
        // Reset refresh attempts on success
        setRefreshAttempts(0);
        setSession(refreshData.session);
        setAuthError(null);
        setIsLoading(false);
        return refreshData.session;
      } else {
        Sentry.addBreadcrumb({
          category: 'auth',
          message: '[Auth] No session after refresh',
          level: 'info',
        });
        setSession(null);
        setIsLoading(false);
        return null;
      }
    } catch (error) {
      Sentry.addBreadcrumb({
        category: 'auth',
        message: `[Auth] Session refresh error: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      });
      setAuthError(error instanceof Error ? error : new Error('Unknown auth error'));
      // Always ensure we reset loading state even on error
      setIsLoading(false);
      return null;
    }
  }, [fetchSession, refreshAttempts, authInitialized]);

  // Perform initial auth setup
  const initAuth = useCallback(async () => {
    Sentry.addBreadcrumb({
      category: 'auth',
      message: '[Auth] Initializing auth...',
      level: 'info',
    });
    let initTimeout: ReturnType<typeof setTimeout> | undefined;
    let didComplete = false;

    try {
      // Set up timeout to prevent initialization from hanging
      const timeoutPromise = new Promise<null>((_, reject) => {
        initTimeout = setTimeout(() => {
          Sentry.addBreadcrumb({
            category: 'auth',
            message: '[Auth] Auth initialization timed out',
            level: 'warning',
          });
          reject(new Error('Auth initialization timed out'));
        }, AUTH_INIT_TIMEOUT_MS);
      });

      // Race between auth initialization and timeout
      await Promise.race([
        (async () => {
          try {
            // Initialize auth to ensure storage is loaded
            await supabase.auth.initialize();
            Sentry.addBreadcrumb({
              category: 'auth',
              message: '[Auth] Supabase auth initialized',
              level: 'info',
            });
            setAuthInitialized(true);

            // Ensure auto-refresh is active
            supabase.auth.startAutoRefresh();
            Sentry.addBreadcrumb({
              category: 'auth',
              message: '[Auth] Auto-refresh started',
              level: 'info',
            });

            // Fetch session after initialization
            const fetchedSession = await fetchSession();
            if (fetchedSession) {
              Sentry.addBreadcrumb({
                category: 'auth',
                message: '[Auth] Session found on initialization',
                level: 'info',
              });
              setSession(fetchedSession);
              setAuthError(null);
            } else {
              Sentry.addBreadcrumb({
                category: 'auth',
                message: '[Auth] No session found on initialization',
                level: 'info',
              });
              setSession(null);
            }

            didComplete = true;
          } catch (innerError) {
            Sentry.addBreadcrumb({
              category: 'auth',
              message: `[Auth] Inner initialization error: ${innerError instanceof Error ? innerError.message : String(innerError)}`,
              level: 'error',
            });
            throw innerError;
          }
        })(),
        timeoutPromise,
      ]);
    } catch (error) {
      Sentry.addBreadcrumb({
        category: 'auth',
        message: `[Auth] Auth initialization error: ${error instanceof Error ? error.message : String(error)}`,
        level: 'warning',
      });
      setSession(null);
      setAuthError(error instanceof Error ? error : new Error('Auth initialization failed'));
    } finally {
      if (initTimeout) clearTimeout(initTimeout);

      // Force auth state to be resolved even if initialization failed
      if (!didComplete) {
        Sentry.addBreadcrumb({
          category: 'auth',
          message: '[Auth] Forcing auth state resolution',
          level: 'info',
        });
        setAuthInitialized(true);
        setSession(null);
      }

      setIsLoading(false);
      Sentry.addBreadcrumb({
        category: 'auth',
        message: '[Auth] Auth initialization complete, loading set to false',
        level: 'info',
      });
    }
  }, [fetchSession]);

  useEffect(() => {
    const removeSupabaseListener = setupSupabaseAppStateListener();
    let isMounted = true;
    let appStateSubscription: ReturnType<typeof AppState.addEventListener>;
    let authSubscriptionUnsubscribe: () => void = () => {};

    // Initialize auth
    initAuth();

    // Handle app state changes
    appStateSubscription = AppState.addEventListener('change', nextAppState => {
      const isActivating = appState.current !== 'active' && nextAppState === 'active';
      appState.current = nextAppState;

      if (isActivating && isMounted) {
        // Always re-initialize auth when app becomes active
        Sentry.addBreadcrumb({
          category: 'auth',
          message: '[Auth] App became active, re-initializing auth',
          level: 'info',
        });
        initAuth();
      }
    });

    // Global ref to track current app state
    const appState = { current: AppState.currentState };

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      Sentry.addBreadcrumb({
        category: 'auth',
        message: `[Auth] Auth state changed: ${event}`,
        level: 'info',
      });

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setIsLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (newSession) {
          setSession(newSession);
          setAuthError(null);
        }
        setIsLoading(false);
      }
    });

    // Store the unsubscribe function
    authSubscriptionUnsubscribe = subscription.unsubscribe;

    // Add network state listener
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (state.isConnected && isMounted && session?.user) {
        Sentry.addBreadcrumb({
          category: 'auth',
          message: '[Auth] Network connection restored, refreshing session',
          level: 'info',
        });
        // When connectivity is restored, try refreshing the session
        refreshSession();
      }
    });

    return () => {
      isMounted = false;
      // Stop automatic refresh when the effect cleans up
      supabase.auth.stopAutoRefresh();
      appStateSubscription.remove();
      if (authSubscriptionUnsubscribe) {
        authSubscriptionUnsubscribe();
      }
      unsubscribeNetInfo();
      removeSupabaseListener();
    };
  }, [initAuth, refreshSession, session?.user]);

  // Calculate isAuthenticated based on session validity
  const isAuthenticated = useMemo(() => {
    return !!session?.user;
  }, [session]);

  // Return authentication state and methods
  return {
    session,
    user: session?.user || null,
    isLoading,
    authError,
    refreshSession,
    isAuthenticated,
  };
}
