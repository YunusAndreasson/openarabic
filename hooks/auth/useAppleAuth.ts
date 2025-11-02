import * as Application from 'expo-application';
import * as Sentry from '@sentry/react-native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { ROUTE_PATHS } from '@/constants/routes';
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

    // Diagnostic variables accessible in catch block
    let capabilityStatus = 'not_checked';
    let credentialState = 'not_checked';

    // Log environment context for debugging
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Apple Sign In initiated',
      level: 'info',
      data: {
        platform: Platform.OS,
        platformVersion: Platform.Version,
      },
    });

    try {
      // STEP 1: Check if native module is available
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Checking Apple Auth native module availability',
        level: 'info',
      });

      let appleAuth;
      try {
        appleAuth = require('@invertase/react-native-apple-authentication');
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Apple Auth native module loaded successfully',
          level: 'info',
        });
      } catch (moduleError) {
        Sentry.captureException(moduleError, {
          tags: {
            location: 'apple_auth',
            step: 'module_load',
            platform: Platform.OS,
          },
          level: 'error',
          extra: {
            errorType: 'module_not_available',
            errorMessage: String(moduleError),
          },
        });
        throw new Error(
          'Apple Sign In is not available. Please rebuild the app with: npx expo prebuild',
        );
      }

      // DIAGNOSTIC: Check Apple Sign In capability status BEFORE attempting sign in
      try {
        if (appleAuth.default.isSupported) {
          capabilityStatus = 'supported';
        } else {
          capabilityStatus = 'not_supported';
        }
      } catch {
        capabilityStatus = 'check_failed';
      }

      // Also check credential state if possible
      try {
        // This will only work if we have a user identifier from previous sign-in
        // For now, just log that we checked
        credentialState = 'not_checked_no_previous_user';
      } catch {
        credentialState = 'check_failed';
      }

      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Apple Sign In capability check',
        level: 'info',
        data: {
          capability_status: capabilityStatus,
          credential_state: credentialState,
        },
      });

      // Platform-specific imports
      if (Platform.OS === 'ios') {
        // iOS: Use native Apple Authentication
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Starting iOS Apple Authentication flow',
          level: 'info',
        });

        // STEP 2: Request Apple ID credential
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Requesting Apple credential',
          level: 'info',
          data: {
            requestedScopes: ['email', 'fullName'],
          },
        });

        let credential;
        try {
          credential = await appleAuth.default.performRequest({
            requestedOperation: appleAuth.default.Operation.LOGIN,
            requestedScopes: [appleAuth.default.Scope.EMAIL, appleAuth.default.Scope.FULL_NAME],
          });
        } catch (credentialError) {
          Sentry.captureException(credentialError, {
            tags: {
              location: 'apple_auth',
              step: 'credential_request',
              platform: 'ios',
            },
            level: 'error',
            extra: {
              errorType:
                typeof credentialError === 'object'
                  ? credentialError?.constructor?.name
                  : typeof credentialError,
              errorCode:
                typeof credentialError === 'object' && credentialError && 'code' in credentialError
                  ? credentialError.code
                  : 'unknown',
              errorMessage:
                credentialError instanceof Error
                  ? credentialError.message
                  : String(credentialError),
            },
          });
          throw credentialError;
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
          const error = new Error('No identity token returned from Apple');
          Sentry.captureException(error, {
            tags: {
              location: 'apple_auth',
              step: 'token_validation',
              platform: 'ios',
            },
            level: 'error',
            extra: {
              credentialData: {
                hasUser: !!credential.user,
                hasEmail: !!credential.email,
                hasNonce: !!credential.nonce,
              },
            },
          });
          throw error;
        }

        // STEP 3: Sign in to Supabase with Apple ID token
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Exchanging Apple token with Supabase',
          level: 'info',
        });

        let authResponse;
        try {
          authResponse = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
            nonce: credential.nonce,
          });
        } catch (supabaseError) {
          Sentry.captureException(supabaseError, {
            tags: {
              location: 'apple_auth',
              step: 'supabase_signin',
              platform: 'ios',
            },
            level: 'error',
            extra: {
              errorMessage:
                supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
              hasNonce: !!credential.nonce,
            },
          });
          throw supabaseError;
        }

        const { data, error } = authResponse;

        if (error) {
          Sentry.captureException(error, {
            tags: {
              location: 'apple_auth',
              step: 'supabase_response',
              platform: 'ios',
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

        // STEP 4: Save full name if provided (only available on first sign-in)
        if (credential.fullName) {
          const fullName =
            `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim();
          if (fullName && data.user) {
            Sentry.addBreadcrumb({
              category: 'auth',
              message: 'Updating user profile with full name',
              level: 'info',
            });
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

        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Apple Sign In completed successfully',
          level: 'info',
        });

        successFeedback();
        router.replace(ROUTE_PATHS.LIBRARY_TAB);
      } else if (Platform.OS === 'android') {
        // Android: Use web-based OAuth flow
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Starting Android Apple Authentication flow (web-based)',
          level: 'info',
        });

        const { appleAuthAndroid } = require('@invertase/react-native-apple-authentication');

        // Configure the request
        const rawNonce = Math.random().toString(36).substring(2, 10);
        const state = Math.random().toString(36).substring(2, 10);

        // Note: This requires proper Apple Service ID configuration
        // See: https://github.com/invertase/react-native-apple-authentication#android
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Configuring Apple Auth for Android',
          level: 'info',
          data: {
            hasClientId: true, // Don't log actual client ID
            hasRedirectUri: true,
          },
        });

        appleAuthAndroid.configure({
          clientId: 'YOUR_APPLE_SERVICE_ID', // TODO: Add to env vars
          redirectUri: 'https://your-project.supabase.co/auth/v1/callback', // TODO: Configure
          responseType: appleAuthAndroid.ResponseType.ALL,
          scope: appleAuthAndroid.Scope.ALL,
          nonce: rawNonce,
          state,
        });

        let response;
        try {
          response = await appleAuthAndroid.signIn();
        } catch (androidError) {
          Sentry.captureException(androidError, {
            tags: {
              location: 'apple_auth',
              step: 'android_signin',
              platform: 'android',
            },
            level: 'error',
            extra: {
              errorMessage:
                androidError instanceof Error ? androidError.message : String(androidError),
            },
          });
          throw androidError;
        }

        if (!response.id_token) {
          const error = new Error('No identity token returned from Apple');
          Sentry.captureException(error, {
            tags: {
              location: 'apple_auth',
              step: 'android_token_validation',
              platform: 'android',
            },
            level: 'error',
            extra: {
              responseKeys: Object.keys(response),
            },
          });
          throw error;
        }

        // Sign in to Supabase
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Exchanging Android Apple token with Supabase',
          level: 'info',
        });

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: response.id_token,
          nonce: rawNonce,
        });

        if (error) {
          Sentry.captureException(error, {
            tags: {
              location: 'apple_auth',
              step: 'supabase_signin_android',
              platform: 'android',
            },
            level: 'error',
            extra: {
              errorMessage: error.message,
              errorStatus: 'status' in error ? error.status : 'unknown',
            },
          });
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
        const error = new Error('Apple Sign In not supported on this platform');
        Sentry.captureException(error, {
          tags: {
            location: 'apple_auth',
            step: 'platform_check',
            platform: Platform.OS,
          },
          level: 'error',
        });
        throw error;
      }
    } catch (error: unknown) {
      if (!isMountedRef.current) return;

      // Handle user cancellation silently
      if (error && typeof error === 'object' && 'code' in error && error.code === '1001') {
        // User cancelled - no error needed
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Apple Sign In cancelled by user',
          level: 'info',
        });
        return;
      }

      // Handle other errors with comprehensive logging and native error extraction
      const errorObj = error && typeof error === 'object' ? error : {};

      // Extract native error properties (iOS specific)
      const nativeDomain =
        'domain' in errorObj && typeof errorObj.domain === 'string' ? errorObj.domain : undefined;
      const localizedDescription =
        'localizedDescription' in errorObj && typeof errorObj.localizedDescription === 'string'
          ? errorObj.localizedDescription
          : undefined;
      const userInfo =
        'userInfo' in errorObj && typeof errorObj.userInfo === 'object'
          ? errorObj.userInfo
          : undefined;

      const errorDetails = {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode:
          typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown',
        errorStack: error instanceof Error ? error.stack : undefined,
        platform: Platform.OS,
        // Native error details
        nativeDomain,
        localizedDescription,
        userInfo: userInfo ? JSON.stringify(userInfo) : undefined,
      };

      // Get device and app diagnostic information
      const deviceInfo = {
        ios_version: Platform.Version,
        bundle_id: Application.applicationId,
        app_version: Application.nativeApplicationVersion,
        build_number: Application.nativeBuildVersion,
      };

      // Map common Apple error codes to short user-friendly messages
      const errorCode = errorDetails.errorCode;
      let shortMessage = 'Sign In Failed';
      let explanation = '';

      if (errorCode === '1000') {
        shortMessage = 'Unknown Error (1000)';
        explanation =
          'Possible causes:\n• Apple ID not signed in on device\n• Keychain access issues\n• Bundle ID mismatch\n• Provisioning profile problem';
      } else if (errorCode === '1002') {
        shortMessage = 'Invalid Response';
        explanation = 'Apple Sign In response invalid';
      } else if (errorCode === '1003') {
        shortMessage = 'Not Handled';
        explanation = 'Operation not handled';
      } else if (errorCode === '1004') {
        shortMessage = 'Request Failed';
        explanation = 'Apple Sign In request failed';
      } else if (nativeDomain?.includes('AuthenticationServices')) {
        shortMessage = 'Auth Service Error';
        explanation = 'Authentication services error';
      }

      Sentry.captureException(error, {
        tags: {
          location: 'apple_auth',
          step: 'unknown',
          platform: Platform.OS,
          errorCode: errorDetails.errorCode,
          nativeDomain: nativeDomain || 'unknown',
          ios_version: String(deviceInfo.ios_version),
        },
        level: 'error',
        extra: {
          ...errorDetails,
          ...deviceInfo,
        },
      });

      // DIAGNOSTIC: Show FULL error details ON SCREEN with debugging info
      const primaryMessage = localizedDescription || errorDetails.errorMessage;

      const debugErrorMessage = [
        `❌ Apple Sign In Error ${errorDetails.errorCode}`,
        ``,
        shortMessage,
        ``,
        explanation,
        ``,
        `Full Error Message:`,
        primaryMessage,
        ``,
        `Diagnostic Info:`,
        `• Platform: ${Platform.OS} ${Platform.Version}`,
        `• Capability: ${capabilityStatus || 'unknown'}`,
        `• Credential State: ${credentialState || 'unknown'}`,
        `• Bundle ID: ${deviceInfo.bundle_id}`,
        ``,
        nativeDomain ? `Native Domain: ${nativeDomain}` : '',
        userInfo ? `UserInfo: ${JSON.stringify(userInfo, null, 2)}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      handleError(error instanceof Error ? error : new Error('Apple Sign In failed'), {
        toastMessage: debugErrorMessage,
        analyticsEventName: 'Apple_Sign_In_Error',
        sentrySeverity: 'error',
        sentryExtra: { ...errorDetails, ...deviceInfo, capabilityStatus, credentialState },
        toastDuration: 20000, // Show for 20 seconds to read and screenshot
      });
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
