import { useEffect, useState, useMemo, useCallback } from 'react';
import { AppState } from 'react-native';

import { supabase } from '../services/supabase';

// Define session type based on properties we use
type UserSession = {
  user: {
    id: string;
    email?: string;
    app_metadata: Record<string, unknown>;
    user_metadata: Record<string, unknown>;
  } | null;
  expires_at?: number;
};

type AuthResult = {
  session: UserSession | null;
  user: UserSession['user'] | null;
  isLoading: boolean;
  authError: Error | null;
  refreshSession: () => Promise<UserSession | null>;
  isAuthenticated: boolean; // New property to easily check auth state
};

export function useAuth(): AuthResult {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Function to fetch the session that can be called on demand
  const fetchSession = useCallback(async (): Promise<UserSession | null> => {
    try {
      const {
        data: { session: fetchedSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        setAuthError(error);
        return null;
      }

      return fetchedSession;
    } catch (error) {
      setAuthError(error instanceof Error ? error : new Error('Failed to fetch session'));
      return null;
    }
  }, []);

  // Refresh session function that can be called from components
  const refreshSession = useCallback(async (): Promise<UserSession | null> => {
    setIsLoading(true);
    try {
      // First try refreshing the token
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        // If refresh fails, try getting the current session
        const fetchedSession = await fetchSession();

        if (fetchedSession) {
          setSession(fetchedSession);
          setAuthError(null);
          setLastRefresh(Date.now());
          return fetchedSession;
        } else {
          throw new Error('Could not refresh or retrieve session');
        }
      }

      if (refreshData.session) {
        setSession(refreshData.session);
        setAuthError(null);
        setLastRefresh(Date.now());
        return refreshData.session;
      } else {
        setSession(null);
        return null;
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error : new Error('Unknown auth error'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchSession]);

  // Set up automatic token refresh
  useEffect(() => {
    // Check if session is about to expire and refresh it
    const checkTokenExpiration = async () => {
      if (!session?.expires_at) return;

      const expiresAt = session.expires_at * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // If token expires in less than 5 minutes or hasn't been refreshed in 30 minutes, refresh it
      if (timeUntilExpiry < 5 * 60 * 1000 || now - lastRefresh > 30 * 60 * 1000) {
        await refreshSession();
      }
    };

    // Check on mount and then periodically
    checkTokenExpiration();
    const intervalId = setInterval(checkTokenExpiration, 60 * 1000); // Check every minute

    return () => {
      clearInterval(intervalId);
    };
  }, [session, refreshSession, lastRefresh]);

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      if (!isMounted) return;

      setIsLoading(true);

      try {
        await supabase.auth.initialize();
        if (!isMounted) return;

        const fetchedSession = await fetchSession();
        if (!isMounted) return;

        if (fetchedSession) {
          setSession(fetchedSession);
          setAuthError(null);
          setLastRefresh(Date.now());
        } else {
          setSession(null);
        }
      } catch (error) {
        if (!isMounted) return;

        setSession(null);
        setAuthError(error instanceof Error ? error : new Error('Unknown auth error'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initSession();

    // Handle app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        refreshSession();
      }
    });

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      if (newSession) {
        setSession(newSession);
        setAuthError(null);
        setLastRefresh(Date.now());
      } else {
        setSession(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.remove();
      authSubscription.unsubscribe();
    };
  }, [fetchSession, refreshSession]);

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
