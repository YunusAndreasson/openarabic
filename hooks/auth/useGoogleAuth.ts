import * as Sentry from '@sentry/react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { useMountSafety } from '@/hooks/common/useMountSafety';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { waitForAuthEvent } from '@/utils/authEventWaiter';
import { isCancellationError } from '@/utils/authUtils';
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

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    // Log initial state
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Google Sign In initiated',
      level: 'info',
      data: {
        isConfigured,
        webClientIdSet: !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientIdSet: !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
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
          webClientIdAvailable: !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          iosClientIdAvailable: !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
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
        data: {
          hasIdToken: !!userInfo.data.idToken,
          tokenLength: userInfo.data.idToken.length,
          tokenStructureValid: userInfo.data.idToken.split('.').length === 3,
          webClientIdConfigured: !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          iosClientIdConfigured: !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        },
      });

      let authResponse;
      try {
        authResponse = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken,
        });
      } catch (supabaseError) {
        // Capture detailed error information
        const errorDetails = {
          errorMessage:
            supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
          errorType:
            typeof supabaseError === 'object' && supabaseError
              ? supabaseError.constructor?.name
              : typeof supabaseError,
          errorStatus:
            typeof supabaseError === 'object' &&
            supabaseError &&
            'status' in supabaseError &&
            typeof supabaseError.status === 'number'
              ? supabaseError.status
              : 'unknown',
          tokenLength: userInfo.data.idToken.length,
          tokenStructureValid: userInfo.data.idToken.split('.').length === 3,
        };

        Sentry.captureException(supabaseError, {
          tags: {
            location: 'google_auth',
            step: 'supabase_signin',
          },
          level: 'error',
          extra: errorDetails,
        });
        throw supabaseError;
      }

      const { data, error } = authResponse;

      if (error) {
        const supabaseErrorDetails = {
          errorMessage: error.message,
          errorStatus: 'status' in error ? error.status : 'unknown',
          errorName: error.name,
        };

        Sentry.captureException(error, {
          tags: {
            location: 'google_auth',
            step: 'supabase_response',
          },
          level: 'error',
          extra: supabaseErrorDetails,
        });

        // Create enriched error with Supabase details
        const enrichedError = new Error(
          `Supabase authentication failed: ${error.message} (Status: ${supabaseErrorDetails.errorStatus})`,
        );
        // Preserve original error properties
        Object.assign(enrichedError, {
          originalError: error,
          ...supabaseErrorDetails,
        });
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

      // Track analytics (first-party analytics only, no PII to third parties)
      await analytics.identify(data.user.id, {
        last_sign_in: new Date().toISOString(),
      });
      await analytics.trackSignIn('google');

      // Check if session is already available (might be ready immediately)
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        // Wait for auth state change event if session not ready yet
        try {
          await waitForAuthEvent('SIGNED_IN', 5000);
        } catch {
          // Timeout is OK - session might be ready anyway, continue
        }
      }

      successFeedback();
      router.replace(ROUTE_PATHS.EXPLORE_TAB);
    } catch (error: unknown) {
      if (!isMountedRef.current) return;

      // Handle user cancellation silently
      if (isCancellationError(error)) {
        // User cancelled - no error needed
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Google Sign In cancelled by user',
          level: 'info',
        });
        return;
      }

      // Check Play Services not available (Android) - needs statusCodes
      let statusCodes;
      try {
        statusCodes = require('@react-native-google-signin/google-signin').statusCodes;
      } catch {
        statusCodes = null;
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

      // Handle other errors with comprehensive logging and step-specific messages
      const errorDetails = {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode:
          typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown',
        errorStack: error instanceof Error ? error.stack : undefined,
        isConfigured,
      };

      // Determine which step failed based on error message
      let failedStep = 'unknown';
      let stepMessage = 'Sign in failed';

      const errorMsg = errorDetails.errorMessage.toLowerCase();
      if (
        errorMsg.includes('module') ||
        errorMsg.includes('not available') ||
        errorMsg.includes('rebuild')
      ) {
        failedStep = 'module_load';
        stepMessage = 'Google Sign In not available';
      } else if (errorMsg.includes('play services')) {
        failedStep = 'play_services';
        stepMessage = 'Google Play Services issue';
      } else if (errorMsg.includes('id token') && errorMsg.includes('returned')) {
        failedStep = 'token_validation';
        stepMessage = 'Google sign-in succeeded, but no auth token received';
      } else if (
        errorMsg.includes('supabase') ||
        errorMsg.includes('auth') ||
        errorMsg.includes('server')
      ) {
        failedStep = 'supabase_exchange';
        stepMessage = 'Google sign-in succeeded, but server authentication failed';
      } else if (errorMsg.includes('sign') || errorMsg.includes('google')) {
        failedStep = 'google_signin';
        stepMessage = 'Google sign-in failed';
      }

      // Extract Supabase error details if available
      const supabaseError =
        typeof error === 'object' && error && 'originalError' in error
          ? (error as { originalError: { message?: string; status?: number; name?: string } })
              .originalError
          : null;

      // Build full error message for toast with ALL details
      const detailedErrorMessage = [
        `❌ Google Sign In Failed`,
        ``,
        `Step: ${stepMessage}`,
        errorDetails.errorCode !== 'unknown' ? `Error Code: ${errorDetails.errorCode}` : '',
        ``,
        `Error Message:`,
        errorDetails.errorMessage,
        ``,
        supabaseError
          ? [
              `Supabase Details:`,
              `• Message: ${supabaseError.message || 'none'}`,
              `• Status: ${supabaseError.status || 'unknown'}`,
              `• Name: ${supabaseError.name || 'unknown'}`,
              ``,
            ].join('\n')
          : '',
        `Error Stack (first 200 chars):`,
        errorDetails.errorStack?.substring(0, 200) || '[no stack]',
        ``,
        `Config Status: ${errorDetails.isConfigured ? 'Configured' : 'Not Configured'}`,
      ]
        .filter(Boolean)
        .join('\n');

      // Use handleError to avoid duplicate Sentry captures
      handleError(error instanceof Error ? error : new Error('Google Sign In failed'), {
        toastMessage: detailedErrorMessage,
        toastDuration: 20000, // 20 seconds to read ALL details and screenshot
        analyticsEventName: 'Google_Sign_In_Error',
        sentrySeverity: 'error',
        sentryTags: {
          location: 'google_auth',
          step: failedStep,
          errorCode: errorDetails.errorCode,
        },
        sentryExtra: { ...errorDetails, failedStep, supabaseError },
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
