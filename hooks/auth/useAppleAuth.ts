import * as Sentry from '@sentry/react-native';
import * as Application from 'expo-application';
import { useState } from 'react';
import { Platform } from 'react-native';

import { useOAuthProvider, type OAuthSignInResult } from '@/hooks/auth/useOAuthProvider';
import { isCancellationError } from '@/utils/authUtils';
import { authBreadcrumb } from '@/utils/errorHandling';

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
 * Native Apple Auth ships as a native module (iOS only), so it is simply absent in
 * Expo Go. Observing the module is more accurate than inferring it from the
 * environment: `Constants.appOwnership` is deprecated, and its only replacement
 * (`ExecutionEnvironment.StoreClient`) also matches dev builds, where native auth
 * does work. Mirrors the guarded-require pattern used for expo-notifications in
 * app/_layout.tsx. Probed lazily, then memoized, so importing this hook stays cheap.
 */
let cachedAppleAuth: AppleAuthModule | null | undefined;

function getAppleAuth(): AppleAuthModule | null {
  if (cachedAppleAuth === undefined) {
    if (Platform.OS !== 'ios') {
      cachedAppleAuth = null;
    } else {
      try {
        cachedAppleAuth =
          require('@invertase/react-native-apple-authentication') as AppleAuthModule;
      } catch {
        cachedAppleAuth = null;
      }
    }
  }
  return cachedAppleAuth;
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
  // Pre-load Apple Auth module synchronously on first render via lazy init.
  // require() is synchronous so the module is fully initialized before first use.
  const [isReady] = useState(() => getAppleAuth() !== null);

  // Use OAuth provider factory with Apple-specific configuration
  const { signIn, loading } = useOAuthProvider({
    provider: 'apple',

    loadModule: async () => {
      const appleAuth = getAppleAuth();
      if (!appleAuth || !isReady) {
        throw new Error('Apple Sign In not available');
      }
      return appleAuth;
    },

    executeSignIn: async (module: unknown): Promise<OAuthSignInResult> => {
      const appleAuth = module as AppleAuthModule;
      if (Platform.OS === 'ios') {
        // iOS: Native Apple Authentication with retry for error 1000
        authBreadcrumb('Starting iOS Apple Authentication flow');

        // Retry logic for ASAuthorizationError.unknown (1000)
        // This error often occurs on first attempt when the module isn't fully ready
        let credential;
        let attempt = 0;
        const maxRetries = 1;

        while (attempt <= maxRetries) {
          try {
            credential = await appleAuth.default.performRequest({
              requestedOperation: appleAuth.default.Operation.LOGIN,
              // IMPORTANT: FULL_NAME must be first per library docs (issue #293)
              requestedScopes: [appleAuth.default.Scope.FULL_NAME, appleAuth.default.Scope.EMAIL],
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

            authBreadcrumb(
              `Apple auth attempt ${attempt + 1} failed`,
              { errorCode, willRetry: shouldRetry },
              shouldRetry ? 'warning' : 'error',
            );

            if (shouldRetry) {
              attempt++;
              // Brief delay before retry
              await new Promise<void>(resolve => setTimeout(resolve, 500));
              continue;
            }

            throw requestError;
          }
        }

        // Safety check - should never happen due to throw above
        if (!credential) {
          throw new Error('Apple Sign In failed: no credential received');
        }

        authBreadcrumb('Apple credential received', {
          hasIdentityToken: !!credential.identityToken,
          hasNonce: !!credential.nonce,
          hasEmail: !!credential.email,
          hasFullName: !!credential.fullName,
        });

        if (!credential.identityToken) {
          throw new Error('No identity token returned from Apple');
        }

        // The full name (only sent on the first authorization) rides out in
        // `userInfo.name`; useOAuthProvider saves it once the session exists.
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
      // User cancellations (error 1001) are expected — let useOAuthProvider handle silently
      if (isCancellationError(error)) {
        return undefined;
      }

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
