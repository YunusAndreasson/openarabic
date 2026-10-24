import type * as GoogleSigninLibrary from '@react-native-google-signin/google-signin';
import * as Sentry from '@sentry/react-native';
import { useEffect, useState } from 'react';

import { useOAuthProvider } from '@/hooks/auth/useOAuthProvider';
import { delay } from '@/utils/async';
import { getErrorCode } from '@/utils/authUtils';
import { authBreadcrumb } from '@/utils/errorHandling';
import { isKnownOffline } from '@/utils/network';

/**
 * The library's own module type. `import type` is erased under
 * `verbatimModuleSyntax`, so the guarded `require()` below stays the only
 * runtime load and Expo Go never evaluates the native module.
 */
type GoogleSignInModule = typeof GoogleSigninLibrary;

/**
 * Google Sign In ships as a native module, so it is simply absent in Expo Go.
 * Observing the module is more accurate than inferring it from the environment:
 * `Constants.appOwnership` is deprecated, and its only replacement
 * (`ExecutionEnvironment.StoreClient`) also matches dev builds, where native auth
 * does work. Mirrors the guarded-require pattern used for expo-notifications in
 * app/_layout.tsx. Probed lazily, then memoized, so importing this hook stays cheap.
 */
let cachedGoogleSignin: GoogleSignInModule | null | undefined;

function getGoogleSignin(): GoogleSignInModule | null {
  if (cachedGoogleSignin === undefined) {
    try {
      cachedGoogleSignin =
        require('@react-native-google-signin/google-signin') as GoogleSignInModule;
    } catch {
      cachedGoogleSignin = null;
    }
  }
  return cachedGoogleSignin;
}

/**
 * The native module rejects with INTERNAL_ERROR as the STRING '8'; a strict
 * comparison against the number never matched, so this retry once never ran.
 */
const INTERNAL_ERROR_CODE = '8';
/** One retry for INTERNAL_ERROR, after a linear backoff. */
const MAX_SIGN_IN_RETRIES = 1;
const RETRY_BACKOFF_MS = 1000;

/**
 * Hook return type for Google authentication
 */
export interface UseGoogleAuthReturn {
  signInWithGoogle: () => Promise<void>;
  loading: boolean;
}

/**
 * Hook for Google Sign In authentication
 * Uses @react-native-google-signin/google-signin library
 *
 * Implementation:
 * - Configures Google Sign In with Web Client ID
 * - Retrieves ID token from Google
 * - Signs in to Supabase using signInWithIdToken (via useOAuthProvider)
 * - Tracks analytics events with method: 'google'
 * - Handles errors gracefully with toast notifications
 *
 * Environment Variables Required:
 * - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: Your Google Cloud Console Web Client ID
 * - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: (Optional) iOS Client ID for native config
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [isConfigured, setIsConfigured] = useState(false);

  // Configure Google Sign In on mount
  useEffect(() => {
    const configure = async (): Promise<void> => {
      try {
        // Guard: skip if native module is unavailable (Expo Go)
        const google = getGoogleSignin();
        if (!google) return;

        // Get Web Client ID from environment
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

        if (!webClientId) {
          Sentry.captureMessage('Google Web Client ID not configured', {
            level: 'warning',
            tags: { location: 'google_auth_config' },
            extra: {
              hasWebClientId: !!webClientId,
              hasIosClientId: !!iosClientId,
            },
          });
          return;
        }

        // Synchronous in v16: it starts the native configure and signIn()
        // awaits it, so there is nothing to wait for here.
        google.GoogleSignin.configure({
          webClientId,
          iosClientId, // Optional: iOS-specific client ID
          offlineAccess: false, // We only need the ID token, not refresh tokens
        });

        setIsConfigured(true);

        // Log successful configuration to Sentry
        authBreadcrumb('Google Sign In configured successfully', {
          hasWebClientId: true,
          hasIosClientId: !!iosClientId,
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: { location: 'google_auth_config' },
          level: 'error',
        });
      }
    };

    void configure();
  }, []);

  // Use OAuth provider factory with Google-specific configuration
  const { signIn, loading } = useOAuthProvider({
    provider: 'google',

    loadModule: async () => {
      const google = getGoogleSignin();
      if (!google || !isConfigured) {
        throw new Error('Google Sign In not available');
      }

      return google;
    },

    executeSignIn: async ({ GoogleSignin, isCancelledResponse }) => {
      // Check Play Services availability (Android)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign in, retrying INTERNAL_ERROR once. A failed attempt is a
      // breadcrumb, not a report: useOAuthProvider reports the sign-in once.
      let response: GoogleSigninLibrary.SignInResponse | undefined;
      let attempt = 0;
      while (!response) {
        try {
          if (attempt > 0) {
            if (await isKnownOffline()) {
              throw new Error('No network connection available');
            }
            await delay(RETRY_BACKOFF_MS * attempt);
            authBreadcrumb(`Retrying Google Sign In (attempt ${attempt + 1})`);
          }

          response = await GoogleSignin.signIn();
        } catch (signInError) {
          const errorCode = getErrorCode(signInError);
          const shouldRetry = errorCode === INTERNAL_ERROR_CODE && attempt < MAX_SIGN_IN_RETRIES;

          authBreadcrumb(
            `Google sign-in attempt ${attempt + 1} failed`,
            { errorCode: errorCode ?? 'unknown', willRetry: shouldRetry },
            shouldRetry ? 'warning' : 'error',
          );

          if (!shouldRetry) throw signInError;
          attempt += 1;
        }
      }

      // Backing out of the account picker RESOLVES with a cancelled response —
      // google-signin stopped throwing for it in v13, and v16 also turns the
      // native SIGN_IN_CANCELLED code into one. Unhandled, it fell through to
      // the missing-token branch below: a 15-second "update Google Play
      // Services" toast for someone who changed their mind.
      if (isCancelledResponse(response)) return null;

      const { idToken, user, serverAuthCode } = response.data;
      if (!idToken) {
        // Typically a Google Play Services environmental issue on low-end
        // Android devices, not an app bug. No email on the trail.
        authBreadcrumb(
          'Google Sign-In completed but no ID token returned',
          { hasServerAuthCode: !!serverAuthCode },
          'warning',
        );

        throw new Error(
          'Google Sign-In failed. Please try updating Google Play Services or clearing Google app data.',
        );
      }

      return {
        idToken,
        userInfo: {
          email: user.email,
          name: user.name ?? undefined,
        },
      };
    },

    handleProviderError: (error: unknown) => {
      const google = getGoogleSignin();
      if (!google) return undefined;

      // Handle Play Services not available (Android)
      const { isErrorWithCode, statusCodes } = google;
      if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return 'Google Play Services not available. Please update.';
      }

      return undefined;
    },
  });

  return {
    signInWithGoogle: signIn,
    loading,
  };
}
