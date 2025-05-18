import { useEffect, useState, useMemo, useCallback } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { supabase, setupSupabaseAppStateListener } from '../services/supabase';

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
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Function to fetch the session that can be called on demand
  const fetchSession = useCallback(async (): Promise<UserSession | null> => {
    try {
      // Ensure auth is initialized
      if (!authInitialized) {
        try {
          await supabase.auth.initialize();
          setAuthInitialized(true);
        } catch (initError) {
          console.warn('Auth initialization error in fetchSession:', initError);
          setAuthError(
            initError instanceof Error ? initError : new Error('Failed to initialize auth')
          );
          return null;
        }
      }

      // Use a timeout to prevent hanging
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{
        data: { session: null };
        error: Error;
      }>(resolve => {
        setTimeout(() => {
          resolve({
            data: { session: null },
            error: new Error('Session fetch timeout'),
          });
        }, 3000);
      });

      const result = await Promise.race([sessionPromise, timeoutPromise]);

      if (result.error) {
        setAuthError(result.error);
        return null;
      }

      return result.data.session;
    } catch (error) {
      setAuthError(error instanceof Error ? error : new Error('Failed to fetch session'));
      return null;
    }
  }, [authInitialized]);

  // Refresh session function with exponential backoff retry logic
  const refreshSession = useCallback(async (): Promise<UserSession | null> => {
    setIsLoading(true);
    const currentAttempt = refreshAttempts + 1;
    setRefreshAttempts(currentAttempt);

    try {
      // Check network connectivity before attempting refresh
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
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
        try {
          await supabase.auth.initialize();
          setAuthInitialized(true);
        } catch (initError) {
          console.warn('Auth initialization error in refreshSession:', initError);
          throw initError;
        }
      }

      // Ensure auto-refresh is active
      supabase.auth.startAutoRefresh();

      // Let Supabase handle the refresh
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
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
        // Reset refresh attempts on success
        setRefreshAttempts(0);
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
      setAuthError(error instanceof Error ? error : new Error('Unknown auth error'));
      // Always ensure we reset loading state even on error
      setIsLoading(false);
      return null;
    }
  }, [fetchSession, refreshAttempts, authInitialized]);

  // Perform initial auth setup
  const initAuth = useCallback(async () => {
    let initTimeout: ReturnType<typeof setTimeout>;

    try {
      // Set up timeout to prevent initialization from hanging
      const timeoutPromise = new Promise<null>((_, reject) => {
        initTimeout = setTimeout(() => {
          reject(new Error('Auth initialization timed out'));
        }, AUTH_INIT_TIMEOUT_MS);
      });

      // Race between auth initialization and timeout
      await Promise.race([
        (async () => {
          try {
            // Initialize auth to ensure storage is loaded
            await supabase.auth.initialize();
            setAuthInitialized(true);

            // Ensure auto-refresh is active
            supabase.auth.startAutoRefresh();

            // Fetch session after initialization
            const fetchedSession = await fetchSession();
            if (fetchedSession) {
              setSession(fetchedSession);
              setAuthError(null);
            } else {
              setSession(null);
            }
          } catch (initErr) {
            console.warn('Auth initialization inner error:', initErr);
            throw initErr;
          }
        })(),
        timeoutPromise,
      ]);
    } catch (error) {
      console.warn(
        'Auth initialization error:',
        error instanceof Error ? error.message : String(error)
      );
      setSession(null);
      setAuthError(error instanceof Error ? error : new Error('Auth initialization failed'));
    } finally {
      clearTimeout(initTimeout!);
      setIsLoading(false);
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
  }, [initAuth, refreshSession]);

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
