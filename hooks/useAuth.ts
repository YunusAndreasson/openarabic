import { useEffect, useState, useMemo } from 'react';

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
};

export function useAuth(): AuthResult {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      if (!isMounted) return;

      // Ensure loading state is set at the start
      setIsLoading(true);

      try {
        await supabase.auth.initialize();
        if (!isMounted) return;

        const {
          data: { session: fetchedSession },
          error,
        } = await supabase.auth.getSession();
        if (!isMounted) return;

        // Batch state updates
        setSession(fetchedSession);
        setAuthError(error ? new Error(error.message) : null);
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
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
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
    }),
    [session, isLoading, authError]
  );

  return authResult;
}
