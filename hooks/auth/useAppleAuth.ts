import * as Sentry from '@sentry/react-native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useMountSafety } from '@/hooks/common/useMountSafety';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';

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
 * - Integrates with Supabase auth via signInWithIdToken
 * - Tracks analytics events with method: 'apple'
 * - Handles errors gracefully with toast notifications
 */
export function useAppleAuth(): UseAppleAuthReturn {
  const [loading, setLoading] = useState(false);
  const isMountedRef = useMountSafety();

  const signInWithApple = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    setLoading(true);

    try {
      // Check if native module is available
      let appleAuth;
      try {
        appleAuth = require('@invertase/react-native-apple-authentication');
      } catch (moduleError) {
        throw new Error(
          'Apple Sign In is not available. Please rebuild the app with: npx expo prebuild',
        );
      }

      // Platform-specific imports
      if (Platform.OS === 'ios') {
        // iOS: Use native Apple Authentication

        // Request Apple ID credential
        const credential = await appleAuth.default.performRequest({
          requestedOperation: appleAuth.default.Operation.LOGIN,
          requestedScopes: [
            appleAuth.default.Scope.EMAIL,
            appleAuth.default.Scope.FULL_NAME,
          ],
        });

        if (!credential.identityToken) {
          throw new Error('No identity token returned from Apple');
        }

        // Sign in to Supabase with Apple ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
          nonce: credential.nonce,
        });

        if (error) {
          throw error;
        }

        // Save full name if provided (only available on first sign-in)
        if (credential.fullName) {
          const fullName =
            `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim();
          if (fullName && data.user) {
            await supabase.auth.updateUser({
              data: { full_name: fullName },
            });
          }
        }

        // Track analytics
        await analytics.identify(data.user.id, {
          email: data.user.email,
          last_sign_in: new Date().toISOString(),
        });
        await analytics.trackSignIn('apple');

        successFeedback();
        router.replace(ROUTE_PATHS.LIBRARY_TAB);
      } else if (Platform.OS === 'android') {
        // Android: Use web-based OAuth flow
        const { appleAuthAndroid } = require('@invertase/react-native-apple-authentication');

        // Configure the request
        const rawNonce = Math.random().toString(36).substring(2, 10);
        const state = Math.random().toString(36).substring(2, 10);

        // Note: This requires proper Apple Service ID configuration
        // See: https://github.com/invertase/react-native-apple-authentication#android
        appleAuthAndroid.configure({
          clientId: 'YOUR_APPLE_SERVICE_ID', // TODO: Add to env vars
          redirectUri: 'https://your-project.supabase.co/auth/v1/callback', // TODO: Configure
          responseType: appleAuthAndroid.ResponseType.ALL,
          scope: appleAuthAndroid.Scope.ALL,
          nonce: rawNonce,
          state,
        });

        const response = await appleAuthAndroid.signIn();

        if (!response.id_token) {
          throw new Error('No identity token returned from Apple');
        }

        // Sign in to Supabase
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: response.id_token,
          nonce: rawNonce,
        });

        if (error) {
          throw error;
        }

        // Track analytics
        await analytics.identify(data.user.id, {
          email: data.user.email,
          last_sign_in: new Date().toISOString(),
        });
        await analytics.trackSignIn('apple');

        successFeedback();
        router.replace(ROUTE_PATHS.LIBRARY_TAB);
      } else {
        throw new Error('Apple Sign In not supported on this platform');
      }
    } catch (error: unknown) {
      if (!isMountedRef.current) return;

      // Handle user cancellation silently
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '1001'
      ) {
        // User cancelled - no error needed
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Apple Sign In cancelled by user',
          level: 'info',
        });
        return;
      }

      // Handle other errors
      Sentry.captureException(error, {
        tags: { location: 'apple_auth' },
        level: 'error',
      });

      handleError(
        error instanceof Error ? error : new Error('Apple Sign In failed'),
        {
          toastMessage: `${STRINGS.SOCIAL_AUTH_FAILED}. ${STRINGS.PLEASE_TRY_AGAIN}`,
          analyticsEventName: 'Apple_Sign_In_Error',
          sentrySeverity: 'error',
        },
      );
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [isMountedRef]);

  return {
    signInWithApple,
    loading,
  };
}
