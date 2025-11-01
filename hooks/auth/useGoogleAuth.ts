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
        const webClientId = process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'];
        const iosClientId = process.env['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'];

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

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    // Log initial state
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Google Sign In initiated',
      level: 'info',
      data: {
        isConfigured,
        webClientIdSet: !!process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'],
        iosClientIdSet: !!process.env['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'],
      },
    });

    if (!isConfigured) {
      const error = new Error('Google Sign In not configured');
      Sentry.captureException(error, {
        tags: {
          location: 'google_auth',
          step: 'config_check',
        },
        level: 'warning',
        extra: {
          webClientIdAvailable: !!process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'],
          iosClientIdAvailable: !!process.env['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'],
        },
      });
      handleError(error, {
        toastMessage: 'Google Sign In not available. Please rebuild the app.',
        analyticsEventName: 'Google_Sign_In_Not_Configured',
        sentrySeverity: 'warning',
      });
      return;
    }

    if (!isMountedRef.current) return;
    setLoading(true);

    try {
      // STEP 1: Check if native module is available
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Checking Google Sign In native module availability',
        level: 'info',
      });

      let GoogleSignin;
      try {
        GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Google Sign In native module loaded successfully',
          level: 'info',
        });
      } catch (moduleError) {
        Sentry.captureException(moduleError, {
          tags: {
            location: 'google_auth',
            step: 'module_load',
          },
          level: 'error',
          extra: {
            errorType: 'module_not_available',
            errorMessage: String(moduleError),
          },
        });
        throw new Error(
          'Google Sign In is not available. Please rebuild the app with: npx expo prebuild',
        );
      }

      // STEP 2: Check if Google Play Services are available (Android)
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Checking Google Play Services availability',
        level: 'info',
      });

      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Google Play Services available',
          level: 'info',
        });
      } catch (playServicesError) {
        Sentry.captureException(playServicesError, {
          tags: {
            location: 'google_auth',
            step: 'play_services_check',
          },
          level: 'error',
          extra: {
            errorMessage:
              playServicesError instanceof Error
                ? playServicesError.message
                : String(playServicesError),
            errorCode:
              typeof playServicesError === 'object' &&
              playServicesError &&
              'code' in playServicesError
                ? playServicesError.code
                : 'unknown',
          },
        });
        throw playServicesError;
      }

      // STEP 3: Sign in and get user info with ID token
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Requesting Google Sign In',
        level: 'info',
      });

      let userInfo;
      try {
        userInfo = await GoogleSignin.signIn();
      } catch (signInError) {
        Sentry.captureException(signInError, {
          tags: {
            location: 'google_auth',
            step: 'google_signin',
          },
          level: 'error',
          extra: {
            errorType:
              typeof signInError === 'object' ? signInError?.constructor?.name : typeof signInError,
            errorCode:
              typeof signInError === 'object' && signInError && 'code' in signInError
                ? signInError.code
                : 'unknown',
            errorMessage: signInError instanceof Error ? signInError.message : String(signInError),
          },
        });
        throw signInError;
      }

      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Google Sign In successful',
        level: 'info',
        data: {
          hasUserInfo: !!userInfo,
          hasData: !!userInfo?.data,
          hasIdToken: !!userInfo?.data?.idToken,
          hasEmail: !!userInfo?.data?.user?.email,
        },
      });

      if (!userInfo.data?.idToken) {
        const error = new Error('No ID token returned from Google Sign In');
        Sentry.captureException(error, {
          tags: {
            location: 'google_auth',
            step: 'token_validation',
          },
          level: 'error',
          extra: {
            userInfoKeys: userInfo ? Object.keys(userInfo) : [],
            dataKeys: userInfo?.data ? Object.keys(userInfo.data) : [],
            hasUser: !!userInfo?.data?.user,
          },
        });
        throw error;
      }

      // STEP 4: Sign in to Supabase with Google ID token
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Exchanging Google token with Supabase',
        level: 'info',
      });

      let authResponse;
      try {
        authResponse = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken,
        });
      } catch (supabaseError) {
        Sentry.captureException(supabaseError, {
          tags: {
            location: 'google_auth',
            step: 'supabase_signin',
          },
          level: 'error',
          extra: {
            errorMessage:
              supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
          },
        });
        throw supabaseError;
      }

      const { data, error } = authResponse;

      if (error) {
        Sentry.captureException(error, {
          tags: {
            location: 'google_auth',
            step: 'supabase_response',
          },
          level: 'error',
          extra: {
            errorMessage: error.message,
            errorStatus: 'status' in error ? error.status : 'unknown',
            errorName: error.name,
          },
        });
        throw error;
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

      // Track analytics
      await analytics.identify(data.user.id, {
        email: data.user.email,
        last_sign_in: new Date().toISOString(),
      });
      await analytics.trackSignIn('google');

      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Google Sign In completed successfully',
        level: 'info',
      });

      successFeedback();
      router.replace(ROUTE_PATHS.LIBRARY_TAB);
    } catch (error: unknown) {
      if (!isMountedRef.current) return;

      // Handle user cancellation silently
      let statusCodes;
      try {
        statusCodes = require('@react-native-google-signin/google-signin').statusCodes;
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
        const errorDetails = {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorCode: String(error.code),
        };

        Sentry.captureException(error, {
          tags: {
            location: 'google_auth',
            step: 'play_services',
            errorCode: errorDetails.errorCode,
          },
          level: 'warning',
          extra: errorDetails,
        });

        handleError(error instanceof Error ? error : new Error('Play Services not available'), {
          toastMessage: 'Google Play Services not available. Please update.',
          analyticsEventName: 'Google_Sign_In_Play_Services_Error',
          sentrySeverity: 'warning',
        });
        return;
      }

      // Handle other errors with comprehensive logging
      const errorDetails = {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode:
          typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown',
        errorStack: error instanceof Error ? error.stack : undefined,
        isConfigured,
      };

      Sentry.captureException(error, {
        tags: {
          location: 'google_auth',
          step: 'unknown',
          errorCode: errorDetails.errorCode,
        },
        level: 'error',
        extra: errorDetails,
      });

      handleError(error instanceof Error ? error : new Error('Google Sign In failed'), {
        toastMessage: `${STRINGS.SOCIAL_AUTH_FAILED}. ${STRINGS.PLEASE_TRY_AGAIN}`,
        analyticsEventName: 'Google_Sign_In_Error',
        sentrySeverity: 'error',
        sentryExtra: errorDetails,
      });
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
