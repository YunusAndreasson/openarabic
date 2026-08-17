import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { useEffect, useState } from 'react';
import { useOAuthProvider, type OAuthSignInResult } from '@/hooks/auth/useOAuthProvider';
import { isCancellationError } from '@/utils/authUtils';
import { authBreadcrumb } from '@/utils/errorHandling';

/** Type for dynamically imported Google Sign In module */
interface GoogleSignInModule {
  configure: (options: {
    webClientId: string;
    iosClientId?: string | undefined;
    offlineAccess?: boolean;
  }) => void | Promise<void>;
  hasPlayServices: (options: { showPlayServicesUpdateDialog: boolean }) => Promise<void>;
  signIn: () => Promise<{
    data?: {
      idToken?: string;
      user?: { email?: string; name?: string };
      serverAuthCode?: string;
      accessToken?: string;
    };
  }>;
}

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
      const mod = require('@react-native-google-signin/google-signin') as {
        GoogleSignin?: GoogleSignInModule;
      };
      cachedGoogleSignin = mod.GoogleSignin ?? null;
    } catch {
      cachedGoogleSignin = null;
    }
  }
  return cachedGoogleSignin;
}

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
        const GoogleSignin = getGoogleSignin();
        if (!GoogleSignin) return;

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

        await GoogleSignin.configure({
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

    configure();
  }, []);

  // Use OAuth provider factory with Google-specific configuration
  const { signIn, loading } = useOAuthProvider({
    provider: 'google',

    loadModule: async () => {
      const GoogleSignin = getGoogleSignin();
      if (!GoogleSignin || !isConfigured) {
        throw new Error('Google Sign In not available');
      }

      return GoogleSignin;
    },

    executeSignIn: async (module: unknown): Promise<OAuthSignInResult> => {
      const GoogleSignin = module as GoogleSignInModule;
      // Check Play Services availability (Android)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign in with retry logic for INTERNAL_ERROR
      let userInfo: Awaited<ReturnType<GoogleSignInModule['signIn']>> | undefined;
      let signInAttempt = 0;
      const maxRetries = 1;

      while (signInAttempt <= maxRetries) {
        try {
          if (signInAttempt > 0) {
            // Check network before retry
            const netState = await NetInfo.fetch();
            if (!netState.isConnected) {
              throw new Error('No network connection available');
            }

            // Wait before retry (exponential backoff)
            await new Promise<void>(resolve => setTimeout(resolve, 1000 * signInAttempt));

            authBreadcrumb(`Retrying Google Sign In (attempt ${signInAttempt + 1})`);
          }

          userInfo = await GoogleSignin.signIn();
          break; // Success
        } catch (signInError) {
          const errorCode =
            typeof signInError === 'object' && signInError && 'code' in signInError
              ? signInError.code
              : 'unknown';

          // Retry only for INTERNAL_ERROR (code 8) on first attempt
          const isInternalError = errorCode === 8;
          const shouldRetry = isInternalError && signInAttempt < maxRetries;

          // Skip Sentry for user cancellations — useOAuthProvider handles these silently
          if (!isCancellationError(signInError)) {
            Sentry.captureException(signInError, {
              tags: {
                location: 'google_auth',
                step: 'google_signin',
                attempt: signInAttempt + 1,
                willRetry: shouldRetry,
              },
              level: shouldRetry ? 'warning' : 'error',
              extra: {
                errorCode,
                errorMessage:
                  signInError instanceof Error ? signInError.message : String(signInError),
              },
            });
          }

          if (shouldRetry) {
            signInAttempt++;
            continue;
          }

          throw signInError;
        }
      }

      if (!userInfo?.data?.idToken) {
        // Log what we actually received for debugging
        // Downgraded to warning: this is typically a Google Play Services environmental issue
        // on low-end Android devices, not an app bug
        Sentry.captureException(new Error('Google Sign-In completed but no ID token returned'), {
          tags: {
            location: 'google_auth',
            step: 'token_validation',
          },
          level: 'warning',
          extra: {
            hasUser: !!userInfo?.data?.user,
            hasServerAuthCode: !!userInfo?.data?.serverAuthCode,
            userEmail: userInfo?.data?.user?.email,
          },
        });

        throw new Error(
          'Google Sign-In failed. Please try updating Google Play Services or clearing Google app data.',
        );
      }

      return {
        idToken: userInfo.data.idToken,
        userInfo: {
          email: userInfo.data.user?.email,
          name: userInfo.data.user?.name,
        },
      };
    },

    handleProviderError: (error: unknown) => {
      if (!getGoogleSignin()) return undefined;

      // Handle Play Services not available (Android)
      const { statusCodes } = require('@react-native-google-signin/google-signin');

      if (
        statusCodes &&
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
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
