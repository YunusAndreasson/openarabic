import type { Session } from '@supabase/supabase-js';

/**
 * The slice of a Supabase session this app actually reads.
 *
 * Derived from `Session['user']` rather than re-declared, because that is
 * literally what gets stored: `useProvideAuth` calls `setSession()` with the
 * `Session` supabase-js hands back. Written out by hand, the three fields were
 * a private copy of someone else's contract — a renamed or re-typed column on
 * the library side would keep compiling here and only surface as `undefined` at
 * runtime.
 *
 * `user` is nullable, which the underlying `Session` is not, because the app
 * models "signed out" as a session whose user is absent.
 */
export interface UserSession {
  user: Pick<Session['user'], 'id' | 'email' | 'created_at'> | null;
}

/**
 * Authentication hook result
 * Provides auth state and session management functions
 */
export interface AuthResult {
  /** Current user session (null if not authenticated) */
  session: UserSession | null;
  /** Current user object (null if not authenticated) */
  user: UserSession['user'];
  /** Whether auth state is still loading */
  isLoading: boolean;
  /** Authentication error if any */
  authError: Error | null;
  /** Function to manually refresh the session */
  refreshSession: () => Promise<UserSession | null>;
  /** Computed boolean - true if user is authenticated */
  isAuthenticated: boolean;
}
