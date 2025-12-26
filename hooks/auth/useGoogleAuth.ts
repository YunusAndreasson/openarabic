import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { useEffect, useState } from 'react';

import { useOAuthProvider, type OAuthSignInResult } from '@/hooks/auth/useOAuthProvider';

/** Type for dynamically imported Google Sign In module */
interface GoogleSignInModule {
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
        // Check if native module is available
        let GoogleSignin;
        try {
          GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
        } catch (moduleError) {
          Sentry.captureMessage('Google Sign In module not available', {
            level: 'warning',
            tags: { location: 'google_auth_config' },
            extra: { error: String(moduleError) },
          });
          return;
        }

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
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Google Sign In configured successfully',
          level: 'info',
          data: {
            hasWebClientId: true,
            hasIosClientId: !!iosClientId,
          },
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
      if (!isConfigured) {
        throw new Error('Google Sign In not configured');
      }

      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
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
            await new Promise(resolve => setTimeout(resolve, 1000 * signInAttempt));

            Sentry.addBreadcrumb({
              category: 'auth',
              message: `Retrying Google Sign In (attempt ${signInAttempt + 1})`,
              level: 'info',
            });
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

          if (shouldRetry) {
            signInAttempt++;
            continue;
          }

          throw signInError;
        }
      }

      if (!userInfo?.data?.idToken) {
        // Log what we actually received for debugging
        Sentry.captureException(new Error('Google Sign-In completed but no ID token returned'), {
          tags: {
            location: 'google_auth',
            step: 'token_validation',
          },
          level: 'error',
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
      // Handle Play Services not available (Android)
      let statusCodes;
      try {
        statusCodes = require('@react-native-google-signin/google-signin').statusCodes;
      } catch {
        return undefined;
      }

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
