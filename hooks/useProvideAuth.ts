import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';

import { supabase, setupSupabaseAppStateListener } from '../services/supabase';
import { handleError } from '@/utils/errorHandling';

// Maximum number of retry attempts for session refresh
const MAX_REFRESH_RETRIES = 3;
// Time between retries (exponential backoff)
const RETRY_DELAY_MS = 1000;
// Maximum time to wait for auth initialization
const AUTH_INIT_TIMEOUT_MS = 5000;

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
  const refreshAttemptsRef = useRef(0);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Function to fetch the session that can be called on demand
  const fetchSession = useCallback(async (): Promise<UserSession | null> => {
    try {
      // Ensure auth is initialized
      if (!authInitialized) {
        try {
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'Initializing auth in fetchSession',
            level: 'info',
          });
          await supabase.auth.initialize();
          setAuthInitialized(true);
        } catch (initError) {
          Sentry.captureException(initError, {
            tags: { location: 'auth_initialization' },
            level: 'error',
          });
          setAuthError(
            initError instanceof Error ? initError : new Error('Failed to initialize auth')
          );
          return null;
        }
      }

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Error fetching session',
          level: 'error',
          data: { error: error.message },
        });
        setAuthError(error);
        return null;
      }

      if (data.session) {
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Successfully fetched session',
          level: 'info',
        });
      } else {
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'No session found during fetch',
          level: 'info',
        });
      }

      return data.session;
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to fetch session'), {
        analyticsEventName: 'Session_Fetch_Error',
        sentrySeverity: 'error',
        showToast: false,
      });
      return null;
    }
  }, [authInitialized]);

  // Refresh session function with exponential backoff retry logic
  const refreshSession = useCallback(async (): Promise<UserSession | null> => {
    setIsLoading(true);
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

      // Initialize auth if needed
      if (!authInitialized) {
        await supabase.auth.initialize();
        setAuthInitialized(true);
      }

      // Ensure auto-refresh is active
      supabase.auth.startAutoRefresh();

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
        await new Promise(resolve => setTimeout(resolve, retryDelay));

        // Try another refresh recursively with exponential backoff
        return refreshSession();
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
  }, [authInitialized]);

  // Perform initial auth setup
  const initAuth = useCallback(async () => {
    try {
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Starting auth initialization',
        level: 'info',
      });

      await supabase.auth.initialize();
      setAuthInitialized(true);

      // Ensure auto-refresh is active
      supabase.auth.startAutoRefresh();

      // Fetch session after initialization
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
      handleError(error instanceof Error ? error : new Error(String(error)), {
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
    const removeSupabaseListener = setupSupabaseAppStateListener();
    let isMounted = true;
    let appStateSubscription: ReturnType<typeof AppState.addEventListener>;
    let authSubscriptionUnsubscribe: () => void = () => {};

    // Global ref to track current app state
    const appState = { current: AppState.currentState };

    // Initialize auth
    initAuth();

    // Handle app state changes
    appStateSubscription = AppState.addEventListener('change', nextAppState => {
      const isActivating = appState.current !== 'active' && nextAppState === 'active';

      appState.current = nextAppState;

      if (isActivating && isMounted) {
        // Re-initialize auth when app becomes active
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'App becoming active, refreshing auth state',
          level: 'info',
        });
        initAuth();
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      Sentry.addBreadcrumb({
        category: 'auth',
        message: `Auth state change: ${event}`,
        level: 'info',
      });

      if (event === 'SIGNED_OUT') {
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
    });

    // Store the unsubscribe function
    authSubscriptionUnsubscribe = subscription.unsubscribe;

    return () => {
      isMounted = false;
      appStateSubscription.remove();
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
    [session, isLoading, authError, refreshSession]
  );

  return authResult;
}
