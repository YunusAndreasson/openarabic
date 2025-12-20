import * as Sentry from '@sentry/react-native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { useMountSafety } from '@/hooks/common/useMountSafety';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { waitForAuthEvent } from '@/utils/authEventWaiter';
import { isCancellationError } from '@/utils/authUtils';
import { handleError } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';

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
   * Optional user info for analytics
   */
  userInfo?: {
    email?: string;
    name?: string;
  };
}

/**
 * Provider-specific configuration and implementation
 */
export interface OAuthProviderConfig {
  /**
   * Provider name for analytics and logging
   */
  provider: OAuthProvider;

  /**
   * Load and return the native module
   * Should throw if module is not available
   */
  loadModule: () => Promise<unknown>;

  /**
   * Execute provider-specific sign-in flow
   * Should return ID token on success
   * Should throw on error (cancellation, failure, etc.)
   */
  executeSignIn: (module: unknown) => Promise<OAuthSignInResult>;

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
 * - Loading state and mount safety
 * - Module availability checking
 * - Sentry breadcrumb tracking
 * - Supabase token exchange
 * - Analytics tracking
 * - Session waiting
 * - Success handling (haptics + navigation)
 * - Comprehensive error handling
 *
 * Provider-specific logic is delegated to configuration callbacks.
 *
 * @example
 * ```ts
 * export function useGoogleAuth() {
 *   return useOAuthProvider({
 *     provider: 'google',
 *     loadModule: async () => {
 *       const { GoogleSignin } = require('@react-native-google-signin/google-signin');
 *       await GoogleSignin.configure({ webClientId: '...' });
 *       return GoogleSignin;
 *     },
 *     executeSignIn: async (GoogleSignin) => {
 *       const result = await GoogleSignin.signIn();
 *       return { idToken: result.data.idToken };
 *     },
 *   });
 * }
 * ```
 */
export function useOAuthProvider(config: OAuthProviderConfig) {
  const [loading, setLoading] = useState(false);
  const isMountedRef = useMountSafety();

  const signIn = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    setLoading(true);

    const providerName = config.provider.charAt(0).toUpperCase() + config.provider.slice(1);

    try {
      // STEP 1: Load native module
      Sentry.addBreadcrumb({
        category: 'auth',
        message: `Checking ${providerName} Auth native module availability`,
        level: 'info',
      });

      let nativeModule;
      try {
        nativeModule = await config.loadModule();
        Sentry.addBreadcrumb({
          category: 'auth',
          message: `${providerName} Auth native module loaded successfully`,
          level: 'info',
        });
      } catch (moduleError) {
        Sentry.captureException(moduleError, {
          tags: {
            location: `${config.provider}_auth`,
            step: 'module_load',
          },
          level: 'error',
          extra: {
            errorType: 'module_not_available',
            errorMessage: String(moduleError),
          },
        });
        throw new Error(
          config.moduleNotAvailableMessage ??
            `${providerName} Sign In is not available. Please rebuild the app with: npx expo prebuild`,
        );
      }

      // STEP 2: Execute provider-specific sign-in
      Sentry.addBreadcrumb({
        category: 'auth',
        message: `Starting ${providerName} sign-in flow`,
        level: 'info',
      });

      let signInResult: OAuthSignInResult;
      try {
        signInResult = await config.executeSignIn(nativeModule);
      } catch (signInError) {
        // Let provider handle specific errors
        if (config.handleProviderError) {
          const handledMessage = config.handleProviderError(signInError);
          if (handledMessage) {
            throw new Error(handledMessage);
          }
        }
        throw signInError;
      }

      Sentry.addBreadcrumb({
        category: 'auth',
        message: `${providerName} sign-in successful`,
        level: 'info',
        data: {
          hasIdToken: !!signInResult.idToken,
          hasUserInfo: !!signInResult.userInfo,
        },
      });

      if (!signInResult.idToken) {
        const error = new Error(`No ID token returned from ${providerName} Sign In`);
        Sentry.captureException(error, {
          tags: {
            location: `${config.provider}_auth`,
            step: 'token_validation',
          },
          level: 'error',
        });
        throw error;
      }

      // STEP 3: Exchange token with Supabase
      Sentry.addBreadcrumb({
        category: 'auth',
        message: `Exchanging ${providerName} token with Supabase`,
        level: 'info',
        data: {
          hasIdToken: true,
          tokenLength: signInResult.idToken.length,
        },
      });

      let authResponse;
      try {
        authResponse = await supabase.auth.signInWithIdToken({
          provider: config.provider,
          token: signInResult.idToken,
        });
      } catch (supabaseError) {
        Sentry.captureException(supabaseError, {
          tags: {
            location: `${config.provider}_auth`,
            step: 'supabase_signin',
          },
          level: 'error',
          extra: {
            errorMessage:
              supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
            errorType:
              typeof supabaseError === 'object' && supabaseError
                ? supabaseError.constructor?.name
                : typeof supabaseError,
          },
        });
        throw supabaseError;
      }

      const { data, error: authError } = authResponse;

      if (authError) {
        Sentry.captureException(authError, {
          tags: {
            location: `${config.provider}_auth`,
            step: 'supabase_response',
          },
          level: 'error',
          extra: {
            errorMessage: authError.message,
            errorName: authError.name,
          },
        });

        const enrichedError = new Error(`Supabase authentication failed: ${authError.message}`);
        Object.assign(enrichedError, { originalError: authError });
        throw enrichedError;
      }

      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Supabase authentication successful',
        level: 'info',
        data: {
          userId: data.user.id,
          hasSession: !!data.session,
        },
      });

      // STEP 4: Track analytics
      await analytics.identify(data.user.id, {
        last_sign_in: new Date().toISOString(),
      });
      await analytics.trackSignIn(config.provider);

      // STEP 5: Wait for session to be ready
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        try {
          await waitForAuthEvent('SIGNED_IN', 5000);
        } catch {
          // Timeout is OK - session might be ready anyway
        }
      }

      // STEP 6: Success handling
      successFeedback();
      router.replace(ROUTE_PATHS.EXPLORE_TAB);
    } catch (error: unknown) {
      if (!isMountedRef.current) return;

      // Handle user cancellation silently
      if (isCancellationError(error)) {
        Sentry.addBreadcrumb({
          category: 'auth',
          message: `${providerName} Sign In cancelled by user`,
          level: 'info',
        });
        return;
      }

      // Build error details
      const errorDetails = {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode:
          typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown',
        errorStack: error instanceof Error ? error.stack : undefined,
      };

      // Determine failed step
      let failedStep = 'unknown';
      let stepMessage = 'Sign in failed';

      const errorMsg = errorDetails.errorMessage.toLowerCase();

      if (
        errorMsg.includes('module') ||
        errorMsg.includes('not available') ||
        errorMsg.includes('rebuild')
      ) {
        failedStep = 'module_load';
        stepMessage = `${providerName} Sign In not available`;
      } else if (errorMsg.includes('id token') && errorMsg.includes('returned')) {
        failedStep = 'token_validation';
        stepMessage = `${providerName} sign-in succeeded, but no auth token received`;
      } else if (
        errorMsg.includes('supabase') ||
        errorMsg.includes('auth') ||
        errorMsg.includes('server')
      ) {
        failedStep = 'supabase_exchange';
        stepMessage = `${providerName} sign-in succeeded, but server authentication failed`;
      } else if (errorMsg.includes('sign') || errorMsg.includes(config.provider)) {
        failedStep = `${config.provider}_signin`;
        stepMessage = `${providerName} sign-in failed`;
      }

      // Build detailed error message
      const detailedErrorMessage = [
        `❌ ${providerName} Sign In Failed`,
        ``,
        `Step: ${stepMessage}`,
        errorDetails.errorCode !== 'unknown' ? `Error Code: ${errorDetails.errorCode}` : '',
        ``,
        `Error Message:`,
        errorDetails.errorMessage,
      ]
        .filter(Boolean)
        .join('\n');

      // Use handleError to avoid duplicate Sentry captures
      handleError(error instanceof Error ? error : new Error(`${providerName} Sign In failed`), {
        toastMessage: detailedErrorMessage,
        toastDuration: 15000,
        analyticsEventName: `${providerName}_Sign_In_Error`,
        sentrySeverity: 'error',
        sentryTags: {
          location: `${config.provider}_auth`,
          step: failedStep,
          errorCode: errorDetails.errorCode,
        },
        sentryExtra: { ...errorDetails, failedStep },
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [config, isMountedRef]);

  return {
    signIn,
    loading,
  };
}
