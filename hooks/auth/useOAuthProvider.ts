import { useCallback, useState } from 'react';

import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { getErrorCode, isCancellationError } from '@/utils/authUtils';
import { authBreadcrumb, handleError } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';
import { toError } from '@/utils/toError';

/**
 * OAuth provider type
 */
export type OAuthProvider = 'google' | 'apple';

/**
 * OAuth sign-in result returned by provider-specific implementation
 */
export interface OAuthSignInResult {
  /**
   * ID token from the OAuth provider
   */
  idToken: string;

  /**
   * Optional nonce for providers that require it (e.g., Apple on iOS)
   * Must be passed to Supabase if the ID token contains a nonce
   */
  nonce?: string;

  /**
   * Optional user info for analytics
   */
  userInfo?: {
    email?: string;
    name?: string;
  };
}

/**
 * The stage a sign-in had reached when it failed.
 *
 * Tracked as the flow advances, never guessed afterwards. The guess used to be
 * a substring match on the lowercased error message, and `includes('auth')`
 * matched Apple's own native error text
 * (com.apple.AuthenticationServices.AuthorizationError): a failed Apple sheet
 * told the learner "Apple sign-in succeeded, but server authentication failed"
 * and was filed as a Supabase failure.
 */
export type OAuthSignInStep =
  'module_load' | 'provider_signin' | 'token_validation' | 'supabase_exchange';

const STEP_MESSAGES: Record<OAuthSignInStep, (providerName: string) => string> = {
  module_load: providerName => `${providerName} Sign In not available`,
  provider_signin: providerName => `${providerName} sign-in failed`,
  token_validation: providerName => `${providerName} sign-in succeeded, but no auth token received`,
  supabase_exchange: providerName =>
    `${providerName} sign-in succeeded, but server authentication failed`,
};

/**
 * Provider-specific configuration and implementation
 */
export interface OAuthProviderConfig<TModule = unknown> {
  /**
   * Provider name for analytics and logging
   */
  provider: OAuthProvider;

  /**
   * Load and return the native module
   * Should throw if module is not available
   */
  loadModule: () => Promise<TModule>;

  /**
   * Run the provider's own sign-in flow on the module `loadModule` returned.
   * Resolves the ID token, or `null` when the user backed out — a cancel is an
   * outcome, not an error, so it is never thrown. Throws on failure.
   */
  executeSignIn: (module: TModule) => Promise<OAuthSignInResult | null>;

  /**
   * Optional: Check if error is provider-specific and should be handled specially
   * Return error message if handled, undefined to use default handling
   */
  handleProviderError?: (error: unknown) => string | undefined;

  /**
   * Module not available error message
   */
  moduleNotAvailableMessage?: string;
}

/**
 * Factory hook for OAuth authentication
 *
 * Consolidates common OAuth patterns:
 * - Loading state
 * - Module availability checking
 * - Sentry breadcrumb tracking
 * - Supabase token exchange
 * - Analytics tracking
 * - Success handling (haptics; navigation follows the session)
 * - Error handling: ONE report per failed sign-in, tagged with the step that
 *   failed. Each step used to capture to Sentry itself and then `handleError`
 *   captured again, so every failure was two or three events.
 *
 * Provider-specific logic is delegated to configuration callbacks.
 *
 * @example
 * ```ts
 * export function useGoogleAuth() {
 *   return useOAuthProvider({
 *     provider: 'google',
 *     loadModule: async () => getGoogleSignin(),
 *     executeSignIn: async google => {
 *       const response = await google.GoogleSignin.signIn();
 *       return google.isCancelledResponse(response) ? null : { idToken: … };
 *     },
 *   });
 * }
 * ```
 */
export function useOAuthProvider<TModule>(config: OAuthProviderConfig<TModule>) {
  const [loading, setLoading] = useState(false);

  const signIn = useCallback(async (): Promise<void> => {
    setLoading(true);

    const providerName = config.provider.charAt(0).toUpperCase() + config.provider.slice(1);
    let step: OAuthSignInStep = 'module_load';

    try {
      authBreadcrumb(`Checking ${providerName} Auth native module availability`);

      let nativeModule: TModule;
      try {
        nativeModule = await config.loadModule();
      } catch (moduleError) {
        authBreadcrumb(
          `${providerName} Auth native module unavailable`,
          { errorMessage: toError(moduleError).message },
          'error',
        );
        throw new Error(
          config.moduleNotAvailableMessage ??
            `${providerName} Sign In is not available. Please rebuild the app with: npx expo prebuild`,
        );
      }
      authBreadcrumb(`${providerName} Auth native module loaded successfully`);

      step = 'provider_signin';
      authBreadcrumb(`Starting ${providerName} sign-in flow`);

      let signInResult: OAuthSignInResult | null;
      try {
        signInResult = await config.executeSignIn(nativeModule);
      } catch (signInError) {
        // Let provider handle specific errors
        const handledMessage = config.handleProviderError?.(signInError);
        if (handledMessage) {
          // Create error with formatted message but preserve original error code
          // This ensures isCancellationError can correctly identify non-cancellation errors
          const formattedError = new Error(handledMessage);
          const code = getErrorCode(signInError);
          if (code !== undefined) Object.assign(formattedError, { code });
          throw formattedError;
        }
        throw signInError;
      }

      if (signInResult === null) {
        authBreadcrumb(`${providerName} sign-in cancelled by the user`);
        return;
      }

      authBreadcrumb(`${providerName} sign-in successful`, {
        hasIdToken: !!signInResult.idToken,
        hasUserInfo: !!signInResult.userInfo,
      });

      step = 'token_validation';
      if (!signInResult.idToken) {
        throw new Error(`No ID token returned from ${providerName} Sign In`);
      }

      step = 'supabase_exchange';
      authBreadcrumb(`Exchanging ${providerName} token with Supabase`, {
        hasIdToken: true,
        tokenLength: signInResult.idToken.length,
      });

      // Pass nonce only if provided (required for Apple iOS where token contains nonce)
      const { data, error: authError } = await supabase.auth.signInWithIdToken({
        provider: config.provider,
        token: signInResult.idToken,
        ...(signInResult.nonce ? { nonce: signInResult.nonce } : {}),
      });

      if (authError) {
        const enrichedError = new Error(`Supabase authentication failed: ${authError.message}`);
        Object.assign(enrichedError, { originalError: authError });
        throw enrichedError;
      }

      authBreadcrumb('Supabase authentication successful', {
        userId: data.user.id,
        hasSession: !!data.session,
      });

      // Apple hands over the user's name ONCE — on the very first authorization
      // — and outside the ID token, so Supabase cannot record it by itself. It
      // can only be saved now that a session exists: the Apple step used to
      // save it before signInWithIdToken, where updateUser resolves with "auth
      // session missing" (it does not reject, so nothing noticed) and the name
      // was gone for good. A provider whose token already carries the name
      // (Google) has it in the metadata, so this never overwrites one.
      const providedName = signInResult.userInfo?.name;
      if (providedName && !data.user.user_metadata['full_name']) {
        void supabase.auth
          .updateUser({ data: { full_name: providedName } })
          .then(({ error }) => {
            if (error) {
              authBreadcrumb(
                'Saving the provider name failed',
                { message: error.message },
                'warning',
              );
            }
          })
          .catch(() => {
            // Not critical: the account works without a display name.
          });
      }

      // Track analytics
      await analytics.identify(data.user.id, {
        last_sign_in: new Date().toISOString(),
      });
      await analytics.trackSignIn(config.provider);

      // Success handling - haptic feedback only
      // Navigation is handled by root layout when session state updates
      successFeedback();
    } catch (error: unknown) {
      const errorCode = getErrorCode(error);
      const errorMessage = toError(error).message;
      const isCancellation = isCancellationError(error);

      // Add diagnostic breadcrumb BEFORE cancellation check for debugging
      authBreadcrumb(
        `${providerName} Sign In error caught`,
        {
          step,
          errorCode: errorCode ?? 'none',
          errorMessage: errorMessage.substring(0, 100),
          isCancellation,
        },
        isCancellation ? 'info' : 'warning',
      );

      // Handle user cancellation silently
      if (isCancellation) {
        return;
      }

      const detailedErrorMessage = [
        `❌ ${providerName} Sign In Failed`,
        ``,
        `Step: ${STEP_MESSAGES[step](providerName)}`,
        errorCode === undefined ? '' : `Error Code: ${errorCode}`,
        ``,
        `Error Message:`,
        errorMessage,
      ]
        .filter(Boolean)
        .join('\n');

      void handleError(error, {
        toastMessage: detailedErrorMessage,
        toastDuration: 15000,
        analyticsEventName: `${providerName}_Sign_In_Error`,
        sentrySeverity: 'error',
        sentryTags: {
          location: `${config.provider}_auth`,
          step,
          errorCode: errorCode ?? 'unknown',
        },
        sentryExtra: {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage,
          errorCode: errorCode ?? 'unknown',
          errorStack: error instanceof Error ? error.stack : undefined,
          failedStep: step,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [config]);

  return {
    signIn,
    loading,
  };
}
