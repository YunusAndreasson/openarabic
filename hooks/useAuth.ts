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

  // Function to fetch the session that can be called on demand
  const fetchSession = useCallback(async (): Promise<UserSession | null> => {
    try {
      // Initialize auth to ensure storage is loaded
      await supabase.auth.initialize();

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
      // Initialize auth to ensure storage is loaded
      await supabase.auth.initialize();

      // Let Supabase handle the refresh
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        // If refresh fails, try getting the current session
        const fetchedSession = await fetchSession();
        if (fetchedSession) {
          setSession(fetchedSession);
          setAuthError(null);
          return fetchedSession;
        } else {
          throw new Error('Could not refresh or retrieve session');
        }
      }

      if (refreshData.session) {
        setSession(refreshData.session);
        setAuthError(null);
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

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      if (!isMounted) return;

      setIsLoading(true);

      try {
        // Initialize auth to ensure storage is loaded
        await supabase.auth.initialize();
        if (!isMounted) return;

        const fetchedSession = await fetchSession();
        if (!isMounted) return;

        if (fetchedSession) {
          setSession(fetchedSession);
          setAuthError(null);
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
      if (nextAppState === 'active' && isMounted) {
        // When app becomes active, refresh the session
        refreshSession();
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription: authSubscription },
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
