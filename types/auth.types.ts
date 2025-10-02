/**
 * Supabase user session structure
 * Contains user information and session expiry
 */
export type UserSession = {
  user: {
    /** Unique user ID (UUID) */
    id: string;
    /** User email address (optional for some auth methods) */
    email?: string;
    /** Timestamp when user account was created */
    created_at?: string;
    /**
     * App-level metadata managed by Supabase Auth
     * Not currently used by the application
     */
    app_metadata: Record<string, unknown>;
    /**
     * User-level metadata that can be updated
     * Not currently used by the application
     */
    user_metadata: Record<string, unknown>;
  } | null;
  /** Unix timestamp when session expires */
  expires_at?: number;
};

/**
 * Authentication hook result
 * Provides auth state and session management functions
 */
export type AuthResult = {
  /** Current user session (null if not authenticated) */
  session: UserSession | null;
  /** Current user object (null if not authenticated) */
  user: UserSession['user'] | null;
  /** Whether auth state is still loading */
  isLoading: boolean;
  /** Authentication error if any */
  authError: Error | null;
  /** Function to manually refresh the session */
  refreshSession: () => Promise<UserSession | null>;
  /** Computed boolean - true if user is authenticated */
  isAuthenticated: boolean;
};
