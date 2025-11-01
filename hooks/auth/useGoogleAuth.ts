import * as Sentry from '@sentry/react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useMountSafety } from '@/hooks/common/useMountSafety';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';

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
 * - Signs in to Supabase using signInWithIdToken
 * - Tracks analytics events with method: 'google'
 * - Handles errors gracefully with toast notifications
 *
 * Environment Variables Required:
 * - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: Your Google Cloud Console Web Client ID
 * - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: (Optional) iOS Client ID for native config
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const isMountedRef = useMountSafety();

  // Configure Google Sign In on mount
  useEffect(() => {
    const configure = async (): Promise<void> => {
      try {
        // Check if native module is available
        let GoogleSignin;
        try {
          GoogleSignin =
            require('@react-native-google-signin/google-signin').GoogleSignin;
        } catch (moduleError) {
          Sentry.captureMessage('Google Sign In module not available', {
            level: 'warning',
            tags: { location: 'google_auth_config' },
            extra: { error: String(moduleError) },
          });
          return;
        }

        // Get Web Client ID from environment
        const webClientId = process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'];
        const iosClientId = process.env['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'];

        if (!webClientId) {
          Sentry.captureMessage('Google Web Client ID not configured', {
            level: 'warning',
            tags: { location: 'google_auth_config' },
          });
          return;
        }

        await GoogleSignin.configure({
          webClientId,
          iosClientId, // Optional: iOS-specific client ID
          offlineAccess: false, // We only need the ID token, not refresh tokens
        });

        setIsConfigured(true);
      } catch (error) {
        Sentry.captureException(error, {
          tags: { location: 'google_auth_config' },
          level: 'error',
        });
      }
    };

    configure();
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    if (!isConfigured) {
      handleError(new Error('Google Sign In not configured'), {
        toastMessage: 'Google Sign In not available. Please rebuild the app.',
        analyticsEventName: 'Google_Sign_In_Not_Configured',
        sentrySeverity: 'warning',
      });
      return;
    }

    if (!isMountedRef.current) return;
    setLoading(true);

    try {
      // Check if native module is available
      let GoogleSignin;
      try {
        GoogleSignin =
          require('@react-native-google-signin/google-signin').GoogleSignin;
      } catch (moduleError) {
        throw new Error(
          'Google Sign In is not available. Please rebuild the app with: npx expo prebuild',
        );
      }

      // Check if Google Play Services are available (Android)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign in and get user info with ID token
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data?.idToken) {
        throw new Error('No ID token returned from Google Sign In');
      }

      // Sign in to Supabase with Google ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
      });

      if (error) {
        throw error;
      }

      // Track analytics
      await analytics.identify(data.user.id, {
        email: data.user.email,
        last_sign_in: new Date().toISOString(),
      });
      await analytics.trackSignIn('google');

      successFeedback();
      router.replace(ROUTE_PATHS.LIBRARY_TAB);
    } catch (error: unknown) {
      if (!isMountedRef.current) return;

      // Handle user cancellation silently
      let statusCodes;
      try {
        statusCodes =
          require('@react-native-google-signin/google-signin').statusCodes;
      } catch {
        // If we can't get status codes, treat as generic error
        statusCodes = null;
      }

      if (
        statusCodes &&
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === statusCodes.SIGN_IN_CANCELLED
      ) {
        // User cancelled - no error needed
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Google Sign In cancelled by user',
          level: 'info',
        });
        return;
      }

      // Handle Play Services not available (Android)
      if (
        statusCodes &&
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        handleError(
          error instanceof Error ? error : new Error('Play Services not available'),
          {
            toastMessage: 'Google Play Services not available. Please update.',
            analyticsEventName: 'Google_Sign_In_Play_Services_Error',
            sentrySeverity: 'warning',
          },
        );
        return;
      }

      // Handle other errors
      Sentry.captureException(error, {
        tags: { location: 'google_auth' },
        level: 'error',
      });

      handleError(
        error instanceof Error ? error : new Error('Google Sign In failed'),
        {
          toastMessage: `${STRINGS.SOCIAL_AUTH_FAILED}. ${STRINGS.PLEASE_TRY_AGAIN}`,
          analyticsEventName: 'Google_Sign_In_Error',
          sentrySeverity: 'error',
        },
      );
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [isConfigured, isMountedRef]);

  return {
    signInWithGoogle,
    loading,
  };
}
