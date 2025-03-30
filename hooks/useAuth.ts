import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      try {
        // Run auth initialization and session fetch in parallel
        const [
          _,
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

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    isLoading,
    authError,
  };
}
