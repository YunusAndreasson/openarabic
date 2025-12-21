import * as Sentry from '@sentry/react-native';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { SUPABASE_URL } from '@/constants/supabase';
import { useOAuthProvider, type OAuthSignInResult } from '@/hooks/auth/useOAuthProvider';
import { supabase } from '@/services/supabase';

/** Type for dynamically imported Apple Auth module */
interface AppleAuthModule {
  default: {
    performRequest: (options: {
      requestedOperation: unknown;
      requestedScopes: unknown[];
    }) => Promise<{
      identityToken: string | null;
      nonce: string | null;
      email: string | null;
      fullName: { givenName: string | null; familyName: string | null } | null;
    }>;
    Operation: { LOGIN: unknown };
    Scope: { EMAIL: unknown; FULL_NAME: unknown };
  };
  appleAuthAndroid: {
    configure: (options: {
      clientId: string;
      redirectUri: string;
      responseType: unknown;
      scope: unknown;
      nonce: string;
      state: string;
    }) => void;
    signIn: () => Promise<{ id_token: string | null }>;
    ResponseType: { ALL: unknown };
    Scope: { ALL: unknown };
  };
}

/**
 * Hook return type for Apple authentication
 */
export interface UseAppleAuthReturn {
  signInWithApple: () => Promise<void>;
  loading: boolean;
}

/**
 * Hook for Apple Sign In authentication using native Apple Authentication
 * Uses @invertase/react-native-apple-authentication for both iOS and Android
 *
 * Implementation:
 * - iOS: Native Apple Sign In with AppleAuthentication
 * - Android: Web-based OAuth flow via Supabase
 * - Integrates with Supabase auth via signInWithIdToken (via useOAuthProvider)
 * - Tracks analytics events with method: 'apple'
 * - Handles errors gracefully with toast notifications
 */
export function useAppleAuth(): UseAppleAuthReturn {
  // Use OAuth provider factory with Apple-specific configuration
  const { signIn, loading } = useOAuthProvider({
    provider: 'apple',

    loadModule: async () => {
      const appleAuth = require('@invertase/react-native-apple-authentication');
      return appleAuth;
    },

    executeSignIn: async (module: unknown): Promise<OAuthSignInResult> => {
      const appleAuth = module as AppleAuthModule;
      if (Platform.OS === 'ios') {
        // iOS: Native Apple Authentication
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Starting iOS Apple Authentication flow',
          level: 'info',
        });

        const credential = await appleAuth.default.performRequest({
          requestedOperation: appleAuth.default.Operation.LOGIN,
          requestedScopes: [appleAuth.default.Scope.EMAIL, appleAuth.default.Scope.FULL_NAME],
        });

        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Apple credential received',
          level: 'info',
          data: {
            hasIdentityToken: !!credential.identityToken,
            hasNonce: !!credential.nonce,
            hasEmail: !!credential.email,
            hasFullName: !!credential.fullName,
          },
        });

        if (!credential.identityToken) {
          throw new Error('No identity token returned from Apple');
        }

        // Save full name if provided (only available on first sign-in)
        // This happens AFTER Supabase auth, so we do it as a side effect
        if (credential.fullName) {
          const fullName =
            `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim();
          if (fullName) {
            // Schedule profile update after auth completes
            setTimeout(async () => {
              try {
                await supabase.auth.updateUser({
                  data: { full_name: fullName },
                });
              } catch {
                // Silently fail - not critical
              }
            }, 100);
          }
        }

        return {
          idToken: credential.identityToken,
          userInfo: {
            email: credential.email ?? undefined,
            name: credential.fullName
              ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
              : undefined,
          },
        };
      } else if (Platform.OS === 'android') {
        // Android: Web-based OAuth flow
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Starting Android Apple Authentication flow (web-based)',
          level: 'info',
        });

        const { appleAuthAndroid } = appleAuth;

        const rawNonce = Math.random().toString(36).substring(2, 10);
        const state = Math.random().toString(36).substring(2, 10);

        const appleServiceId = process.env.EXPO_PUBLIC_APPLE_SERVICE_ID;
        if (!appleServiceId) {
          throw new Error(
            'EXPO_PUBLIC_APPLE_SERVICE_ID environment variable is not configured. ' +
              'Please add it to your .env file for Apple Sign-In on Android to work.',
          );
        }

        appleAuthAndroid.configure({
          clientId: appleServiceId,
          redirectUri: `${SUPABASE_URL}/auth/v1/callback`,
          responseType: appleAuthAndroid.ResponseType.ALL,
          scope: appleAuthAndroid.Scope.ALL,
          nonce: rawNonce,
          state,
        });

        const response = await appleAuthAndroid.signIn();

        if (!response.id_token) {
          throw new Error('No identity token returned from Apple');
        }

        return {
          idToken: response.id_token,
        };
      } else {
        throw new Error('Apple Sign In not supported on this platform');
      }
    },

    handleProviderError: (error: unknown) => {
      // Extract comprehensive Apple native error details
      const errorObj = error && typeof error === 'object' ? error : {};

      // Extract ALL native error properties (iOS NSError)
      const nativeDomain =
        'domain' in errorObj && typeof errorObj.domain === 'string' ? errorObj.domain : undefined;
      const localizedDescription =
        'localizedDescription' in errorObj && typeof errorObj.localizedDescription === 'string'
          ? errorObj.localizedDescription
          : undefined;
      const localizedFailureReason =
        'localizedFailureReason' in errorObj && typeof errorObj.localizedFailureReason === 'string'
          ? errorObj.localizedFailureReason
          : undefined;
      const localizedRecoverySuggestion =
        'localizedRecoverySuggestion' in errorObj &&
        typeof errorObj.localizedRecoverySuggestion === 'string'
          ? errorObj.localizedRecoverySuggestion
          : undefined;
      const userInfo =
        'userInfo' in errorObj && typeof errorObj.userInfo === 'object'
          ? errorObj.userInfo
          : undefined;

      // Extract specific keys from userInfo that Apple provides
      const userInfoDetails: Record<string, unknown> = {};
      if (userInfo && typeof userInfo === 'object') {
        const keysToExtract = [
          'NSLocalizedDescription',
          'NSLocalizedFailureReason',
          'NSLocalizedRecoverySuggestion',
          'NSUnderlyingError',
          'NSDebugDescriptionErrorKey',
        ];
        keysToExtract.forEach(key => {
          if (key in userInfo) {
            userInfoDetails[key] = (userInfo as Record<string, unknown>)[key];
          }
        });
      }

      const errorCode =
        typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown';

      // Get device info for debugging
      const deviceInfo = {
        ios_version: Platform.Version,
        bundle_id: Application.applicationId,
        app_version: Application.nativeApplicationVersion,
        build_number: Application.nativeBuildVersion,
        platform: Platform.OS,
      };

      // Log comprehensive error details to Sentry
      Sentry.captureException(error, {
        tags: {
          location: 'apple_auth',
          step: 'apple_signin',
          platform: Platform.OS,
          errorCode,
          nativeDomain: nativeDomain || 'unknown',
        },
        level: 'error',
        extra: {
          // Apple error information
          appleErrorCode: errorCode,
          appleErrorDomain: nativeDomain,
          appleLocalizedDescription: localizedDescription,
          appleFailureReason: localizedFailureReason,
          appleRecoverySuggestion: localizedRecoverySuggestion,
          appleUserInfo: JSON.stringify(userInfoDetails, null, 2),
          // Device context
          device_ios_version: deviceInfo.ios_version,
          device_platform: deviceInfo.platform,
          app_bundle_id: deviceInfo.bundle_id,
          app_version: deviceInfo.app_version,
          app_build_number: deviceInfo.build_number,
        },
      });

      // Build detailed error message using Apple's native messages
      if (localizedDescription || localizedFailureReason) {
        const parts = [
          '❌ Apple Sign In Error',
          '',
          localizedDescription ? `**Error:**\n${localizedDescription}` : '',
          localizedFailureReason ? `**Reason:**\n${localizedFailureReason}` : '',
          localizedRecoverySuggestion ? `**Suggestion:**\n${localizedRecoverySuggestion}` : '',
          '',
          '**Diagnostic Info:**',
          `• Error Code: ${errorCode}`,
          `• Platform: ${Platform.OS} ${Platform.Version}`,
          nativeDomain ? `• Domain: ${nativeDomain}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        return parts;
      }

      return undefined; // Use default error handling
    },
  });

  return {
    signInWithApple: signIn,
    loading,
  };
}
