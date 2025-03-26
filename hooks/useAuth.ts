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
      setIsLoading(true);
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          setAuthError(error);
          console.error('Auth initialization error:', error);
          return;
        }
        setSession(session);
        setAuthError(null);
      } catch (error) {
        setAuthError(error instanceof Error ? error : new Error('Unknown auth error'));
        console.error('Auth exception:', error);
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
      setIsLoading(false); // Update loading state directly without checking isLoading
    });

    return () => subscription.unsubscribe();
  }, []); // Removed isLoading from dependency array

  return {
    session,
    user: session?.user ?? null,
    isLoading,
    authError,
  };
}
