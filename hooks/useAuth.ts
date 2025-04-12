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
        console.error('Auth session fetch error:', error.message);
        return null;
      }

      return fetchedSession;
    } catch (error) {
      console.error('Unexpected auth error:', error);
      return null;
    }
  }, []);

  // Refresh session function that can be called from components
  const refreshSession = useCallback(async (): Promise<UserSession | null> => {
    setIsLoading(true);
    try {
      const fetchedSession = await fetchSession();

      if (fetchedSession) {
        setSession(fetchedSession);
        setAuthError(null);
      }

      return fetchedSession;
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
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      // Log auth state changes to help with debugging
      console.log('Auth state changed:', _event, 'User ID:', newSession?.user?.id);

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
