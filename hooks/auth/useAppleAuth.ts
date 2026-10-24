import type * as AppleAuthLibrary from '@invertase/react-native-apple-authentication';
import { useState } from 'react';
import { Platform } from 'react-native';

import { useOAuthProvider } from '@/hooks/auth/useOAuthProvider';
import { delay } from '@/utils/async';
import { getErrorCode, isCancellationError } from '@/utils/authUtils';
import { authBreadcrumb } from '@/utils/errorHandling';

/**
 * The library's own types. `import type` is erased under `verbatimModuleSyntax`,
 * so the guarded `require()` below stays the only runtime load.
 */
type AppleAuth = typeof AppleAuthLibrary.appleAuth;

/**
 * Native Apple Auth ships as a native module (iOS only), so it is simply absent in
 * Expo Go. Observing the module is more accurate than inferring it from the
 * environment: `Constants.appOwnership` is deprecated, and its only replacement
 * (`ExecutionEnvironment.StoreClient`) also matches dev builds, where native auth
 * does work. Mirrors the guarded-require pattern used for expo-notifications in
 * app/_layout.tsx. Probed lazily, then memoized, so importing this hook stays cheap.
 */
let cachedAppleAuth: AppleAuth | null | undefined;

function getAppleAuth(): AppleAuth | null {
  if (cachedAppleAuth === undefined) {
    if (Platform.OS !== 'ios') {
      cachedAppleAuth = null;
    } else {
      try {
        const library =
          require('@invertase/react-native-apple-authentication') as typeof AppleAuthLibrary;
        cachedAppleAuth = library.appleAuth;
      } catch {
        cachedAppleAuth = null;
      }
    }
  }
  return cachedAppleAuth;
}

/** One retry for ASAuthorizationError.unknown (1000), after a brief pause. */
const MAX_REQUEST_RETRIES = 1;
const RETRY_DELAY_MS = 500;

/**
 * The NSUserInfo keys worth having on the trail. React Native builds the JS
 * error from the NSError with `message`, `code`, `domain` and `userInfo` only —
 * there are no `localized*` properties to read — so these are the details.
 */
const USER_INFO_KEYS = [
  'NSLocalizedDescription',
  'NSLocalizedFailureReason',
  'NSLocalizedRecoverySuggestion',
  'NSUnderlyingError',
  'NSDebugDescriptionErrorKey',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

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

    executeSignIn: async appleAuth => {
      if (Platform.OS === 'ios') {
        // iOS: Native Apple Authentication with retry for error 1000
        authBreadcrumb('Starting iOS Apple Authentication flow');

        // Retry logic for ASAuthorizationError.unknown (1000)
        // This error often occurs on first attempt when the module isn't fully ready
        let credential: AppleAuthLibrary.AppleRequestResponse | undefined;
        let attempt = 0;
        while (!credential) {
          try {
            credential = await appleAuth.performRequest({
              requestedOperation: appleAuth.Operation.LOGIN,
              // IMPORTANT: FULL_NAME must be first per library docs (issue #293)
              requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
            });
          } catch (requestError) {
            const errorCode = getErrorCode(requestError);
            const shouldRetry =
              errorCode === appleAuth.Error.UNKNOWN && attempt < MAX_REQUEST_RETRIES;

            authBreadcrumb(
              `Apple auth attempt ${attempt + 1} failed`,
              { errorCode: errorCode ?? 'unknown', willRetry: shouldRetry },
              shouldRetry ? 'warning' : 'error',
            );

            if (!shouldRetry) throw requestError;
            attempt += 1;
            await delay(RETRY_DELAY_MS);
          }
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
          nonce: credential.nonce,
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

      // The native details ride on the trail to the one report
      // useOAuthProvider makes for this failure.
      const errorObj = isRecord(error) ? error : {};
      const nativeDomain = typeof errorObj['domain'] === 'string' ? errorObj['domain'] : undefined;
      const userInfo = isRecord(errorObj['userInfo']) ? errorObj['userInfo'] : {};
      const userInfoDetails = Object.fromEntries(
        USER_INFO_KEYS.filter(key => key in userInfo).map(key => [key, userInfo[key]]),
      );

      authBreadcrumb(
        'Apple authorization failed',
        {
          errorCode: getErrorCode(error) ?? 'unknown',
          nativeDomain: nativeDomain ?? 'unknown',
          userInfo: userInfoDetails,
        },
        'error',
      );

      return undefined; // Use default error handling
    },
  });

  return {
    signInWithApple: signIn,
    loading,
  };
}
