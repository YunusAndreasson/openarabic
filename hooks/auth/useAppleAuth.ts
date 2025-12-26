import * as Sentry from '@sentry/react-native';
import * as Application from 'expo-application';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useOAuthProvider, type OAuthSignInResult } from '@/hooks/auth/useOAuthProvider';
import { supabase } from '@/services/supabase';

/** Type for dynamically imported Apple Auth module (iOS only) */
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
}

/**
 * Hook return type for Apple authentication
 */
export interface UseAppleAuthReturn {
  signInWithApple: () => Promise<void>;
  loading: boolean;
}

/**
 * Hook for Apple Sign In authentication using native Apple Authentication (iOS only)
 * Uses @invertase/react-native-apple-authentication
 *
 * Implementation:
 * - iOS: Native Apple Sign In with AppleAuthentication
 * - Integrates with Supabase auth via signInWithIdToken (via useOAuthProvider)
 * - Tracks analytics events with method: 'apple'
 * - Handles errors gracefully with toast notifications
 *
 * Note: Apple Sign In is only supported on iOS. Android users use Google Sign In.
 */
export function useAppleAuth(): UseAppleAuthReturn {
  const [isReady, setIsReady] = useState(false);

  // Pre-load Apple Auth module on mount (matches Google pattern)
  // This ensures the native module is fully initialized before first use
  // Note: require() is synchronous, so no async wrapper needed
  useEffect(() => {
    try {
      // Pre-load the native module to ensure it's ready
      require('@invertase/react-native-apple-authentication');
      setIsReady(true);

      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Apple Auth module pre-loaded successfully',
        level: 'info',
      });
    } catch (error) {
      Sentry.captureMessage('Apple Auth module not available', {
        level: 'warning',
        tags: { location: 'apple_auth_init' },
        extra: { error: String(error) },
      });
    }
  }, []);

  // Use OAuth provider factory with Apple-specific configuration
  const { signIn, loading } = useOAuthProvider({
    provider: 'apple',

    loadModule: async () => {
      if (!isReady) {
        throw new Error('Apple Sign In is initializing. Please try again.');
      }
      const appleAuth = require('@invertase/react-native-apple-authentication');
      return appleAuth;
    },

    executeSignIn: async (module: unknown): Promise<OAuthSignInResult> => {
      const appleAuth = module as AppleAuthModule;
      if (Platform.OS === 'ios') {
        // iOS: Native Apple Authentication with retry for error 1000
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Starting iOS Apple Authentication flow',
          level: 'info',
        });

        // Retry logic for ASAuthorizationError.unknown (1000)
        // This error often occurs on first attempt when the module isn't fully ready
        let credential;
        let attempt = 0;
        const maxRetries = 1;

        while (attempt <= maxRetries) {
          try {
            credential = await appleAuth.default.performRequest({
              requestedOperation: appleAuth.default.Operation.LOGIN,
              requestedScopes: [appleAuth.default.Scope.EMAIL, appleAuth.default.Scope.FULL_NAME],
            });
            break; // Success
          } catch (requestError) {
            const errorCode =
              typeof requestError === 'object' && requestError && 'code' in requestError
                ? String(requestError.code)
                : 'unknown';

            // Retry only for error 1000 (ASAuthorizationError.unknown) on first attempt
            const isUnknownError = errorCode === '1000';
            const shouldRetry = isUnknownError && attempt < maxRetries;

            Sentry.addBreadcrumb({
              category: 'auth',
              message: `Apple auth attempt ${attempt + 1} failed`,
              level: shouldRetry ? 'warning' : 'error',
              data: { errorCode, willRetry: shouldRetry },
            });

            if (shouldRetry) {
              attempt++;
              // Brief delay before retry
              await new Promise(resolve => setTimeout(resolve, 500));
              continue;
            }

            throw requestError;
          }
        }

        // Safety check - should never happen due to throw above
        if (!credential) {
          throw new Error('Apple Sign In failed: no credential received');
        }

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
        // Fire-and-forget update - doesn't block auth flow, no mount safety concerns
        if (credential.fullName) {
          const fullName =
            `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim();
          if (fullName) {
            supabase.auth
              .updateUser({ data: { full_name: fullName } })
              .catch(() => {
                // Silently fail - not critical
              });
          }
        }

        return {
          idToken: credential.identityToken,
          nonce: credential.nonce ?? undefined,
          userInfo: {
            email: credential.email ?? undefined,
            name: credential.fullName
              ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
              : undefined,
          },
        };
      }

      // Apple Sign In is only supported on iOS
      throw new Error('Apple Sign In is only available on iOS');
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
