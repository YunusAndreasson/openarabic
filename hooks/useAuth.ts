import { useEffect, useState } from 'react';

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
    // Get initial session
    const initSession = async () => {
      try {
        setIsLoading(true);
        // Run auth initialization and session fetch in parallel
        const [
          ,
          {
            data: { session },
            error,
          },
        ] = await Promise.all([supabase.auth.initialize(), supabase.auth.getSession()]);

        if (error) {
          setAuthError(error);
          setSession(null);
        } else {
          setSession(session);
          setAuthError(null);
        }
      } catch (error) {
        setAuthError(error instanceof Error ? error : new Error('Unknown auth error'));
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Initialize immediately
    initSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
      setAuthError(null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    isLoading,
    authError,
  };
}
