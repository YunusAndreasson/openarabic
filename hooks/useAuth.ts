import { useEffect, useState, useMemo, useCallback } from 'react';

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
};

export function useAuth(): AuthResult {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  // Function to fetch the session that can be called on demand
  const fetchSession = useCallback(async (): Promise<UserSession | null> => {
    try {
      const {
        data: { session: fetchedSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Failed to fetch session:', error.message);
        return null;
      }

      if (fetchedSession) {
        console.log(
          'Session fetched successfully. Expires at:',
          fetchedSession.expires_at
            ? new Date(fetchedSession.expires_at * 1000).toISOString()
            : 'unknown'
        );
      } else {
        console.log('No active session found during fetch');
      }

      return fetchedSession;
    } catch (error) {
      console.error('Exception during fetchSession:', error);
      return null;
    }
  }, []);

  // Refresh session function that can be called from components
  const refreshSession = useCallback(async (): Promise<UserSession | null> => {
    setIsLoading(true);
    try {
      console.log('Manually refreshing session...');

      // First try refreshing the token
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.error('Error refreshing session:', refreshError);
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
        console.log('Session refreshed successfully');
        setSession(refreshData.session);
        setAuthError(null);
        return refreshData.session;
      } else {
        console.log('No session returned after refresh');
        return null;
      }
    } catch (error) {
      console.error('Error during refreshSession:', error);
      setAuthError(error instanceof Error ? error : new Error('Unknown auth error'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchSession]);

  // Set up automatic token refresh
  useEffect(() => {
    // Check if session is about to expire and refresh it
    const checkTokenExpiration = () => {
      if (!session?.expires_at) return;

      const expiresAt = session.expires_at * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // If token expires in less than 5 minutes, refresh it
      if (timeUntilExpiry < 5 * 60 * 1000) {
        console.log('Token expires soon. Refreshing...');
        refreshSession();
      }
    };

    // Check on mount and then periodically
    checkTokenExpiration();
    const intervalId = setInterval(checkTokenExpiration, 60 * 1000); // Check every minute

    return () => {
      clearInterval(intervalId);
    };
  }, [session, refreshSession]);

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      if (!isMounted) return;

      // Ensure loading state is set at the start
      setIsLoading(true);

      try {
        await supabase.auth.initialize();
        if (!isMounted) return;

        const fetchedSession = await fetchSession();
        if (!isMounted) return;

        // Batch state updates
        if (fetchedSession) {
          setSession(fetchedSession);
          setAuthError(null);
        } else {
          setSession(null);
          // Don't set an error here, it's normal to have no session initially
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error initializing auth:', error);
        setSession(null); // Clear session on error
        setAuthError(error instanceof Error ? error : new Error('Unknown auth error'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      console.log('Auth state changed:', event);

      // Batch state updates on auth change
      setSession(newSession);
      setAuthError(null); // Clear previous errors on successful change
      setIsLoading(false); // Ensure loading is false after update
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Memoize the returned object to ensure reference stability.
  // It only creates a new object when session, isLoading, or authError changes.
  const authResult = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      authError,
      refreshSession,
    }),
    [session, isLoading, authError, refreshSession]
  );

  return authResult;
}
