import * as Sentry from '@sentry/react-native';
import * as Application from 'expo-application';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { ROUTE_PATHS } from '@/constants/routes';
import { SUPABASE_URL } from '@/constants/supabase';
import { useMountSafety } from '@/hooks/common/useMountSafety';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { waitForAuthEvent } from '@/utils/authEventWaiter';
import { isCancellationError } from '@/utils/authUtils';
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
          // Check if user canceled - this is expected and shouldn't be reported as an error
          if (isCancellationError(credentialError)) {
            // User canceled - this is normal behavior, not an error
            Sentry.addBreadcrumb({
              category: 'auth',
              message: 'User canceled Apple Sign In',
              level: 'info',
            });
            return;
          }

          // Mark error with step information for outer catch handler
          if (credentialError instanceof Error && !('step' in credentialError)) {
            (credentialError as Error & { step?: string }).step = 'credential_request';
          }
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
          data: {
            hasNonce: !!credential.nonce,
            nonceValue: credential.nonce ? 'present' : 'undefined',
          },
        });

        let authResponse;
        try {
          // Only pass nonce if it exists to avoid Supabase validation error
          // Error: "Passed nonce and nonce in id_token should either both exist or not"
          authResponse = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
            ...(credential.nonce ? { nonce: credential.nonce } : {}),
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
              nonceWasPassed: !!credential.nonce,
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

        // Track analytics (first-party analytics only, no PII to third parties)
        await analytics.identify(data.user.id, {
          last_sign_in: new Date().toISOString(),
        });
        await analytics.trackSignIn('apple');

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

        const appleServiceId = process.env.EXPO_PUBLIC_APPLE_SERVICE_ID;
        if (!appleServiceId) {
          throw new Error(
            'EXPO_PUBLIC_APPLE_SERVICE_ID environment variable is not configured. ' +
              'Please add it to your .env file for Apple Sign-In on Android to work.',
          );
        }

        appleAuthAndroid.configure({
          clientId: appleServiceId,
          redirectUri: `${SUPABASE_URL}/auth/v1/callback`,
          responseType: appleAuthAndroid.ResponseType.ALL,
          scope: appleAuthAndroid.Scope.ALL,
          nonce: rawNonce,
          state,
        });

        let response;
        try {
          response = await appleAuthAndroid.signIn();
        } catch (androidError) {
          // Check if user cancelled - this is normal behavior, not an error
          if (isCancellationError(androidError)) {
            Sentry.addBreadcrumb({
              category: 'auth',
              message: 'User canceled Apple Sign In (Android)',
              level: 'info',
            });
            return;
          }

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

        // Track analytics (first-party analytics only, no PII to third parties)
        await analytics.identify(data.user.id, {
          last_sign_in: new Date().toISOString(),
        });
        await analytics.trackSignIn('apple');

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
      if (isCancellationError(error)) {
        // User cancelled - no error needed
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Apple Sign In cancelled by user',
          level: 'info',
        });
        return;
      }

      // Capture comprehensive diagnostic data for troubleshooting
      // Log the full error object structure before processing - NO TRUNCATION
      let fullErrorStringified = '';
      try {
        // Capture complete error object with all properties, including arrays
        fullErrorStringified = JSON.stringify(
          error,
          (_key, value) => {
            // Preserve all values, especially long arrays like nativeStackIOS
            if (Array.isArray(value)) {
              return value; // Keep full arrays
            }
            return value;
          },
          2, // Pretty print with indentation
        );
      } catch (stringifyError) {
        fullErrorStringified = `[Serialization failed: ${String(stringifyError)}]`;
      }

      Sentry.addBreadcrumb({
        category: 'error',
        message: 'Apple Sign In error occurred',
        level: 'error',
        data: {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorStringified: fullErrorStringified,
          errorStringifiedLength: fullErrorStringified.length,
          timestamp: new Date().toISOString(),
        },
      });

      // Handle other errors with comprehensive logging and native error extraction
      const errorObj = error && typeof error === 'object' ? error : {};

      // Extract ALL native error properties (iOS NSError has many useful fields)
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
        // Extract common NSError userInfo keys
        const keysToExtract = [
          'NSLocalizedDescription',
          'NSLocalizedFailureReason',
          'NSLocalizedRecoverySuggestion',
          'NSLocalizedRecoveryOptions',
          'NSRecoveryAttempterErrorKey',
          'NSUnderlyingError',
          'NSDebugDescriptionErrorKey',
        ];
        keysToExtract.forEach(key => {
          if (key in userInfo) {
            userInfoDetails[key] = (userInfo as Record<string, unknown>)[key];
          }
        });
      }

      // Extract underlying error safely
      const underlyingError =
        'underlyingError' in errorObj
          ? (errorObj as { underlyingError?: unknown }).underlyingError
          : userInfoDetails['NSUnderlyingError'];

      const errorDetails = {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode:
          typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown',
        errorStack: error instanceof Error ? error.stack : undefined,
        platform: Platform.OS,
        // Native error details - all available properties
        nativeDomain,
        localizedDescription:
          localizedDescription || (userInfoDetails['NSLocalizedDescription'] as string | undefined),
        localizedFailureReason:
          localizedFailureReason ||
          (userInfoDetails['NSLocalizedFailureReason'] as string | undefined),
        localizedRecoverySuggestion:
          localizedRecoverySuggestion ||
          (userInfoDetails['NSLocalizedRecoverySuggestion'] as string | undefined),
        userInfo:
          Object.keys(userInfoDetails).length > 0 ? JSON.stringify(userInfoDetails) : undefined,
        underlyingError: underlyingError ? JSON.stringify(underlyingError) : undefined,
        debugDescription: userInfoDetails['NSDebugDescriptionErrorKey'] as string | undefined,
      };

      // Get comprehensive device and app diagnostic information
      // Note: Accurate simulator detection requires native module, using Platform.OS as fallback
      const deviceInfo = {
        ios_version: Platform.Version,
        bundle_id: Application.applicationId,
        app_version: Application.nativeApplicationVersion,
        build_number: Application.nativeBuildVersion,
        platform: Platform.OS,
        // Platform info - Sentry will provide accurate simulator detection in device context
        platform_version: Platform.Version,
      };

      // Capture full raw error object with all properties for deep debugging
      let rawErrorObject: Record<string, unknown> = {};
      try {
        // Serialize the error object preserving all enumerable and non-enumerable properties
        if (error && typeof error === 'object') {
          rawErrorObject = {
            // Standard Error properties
            name: error instanceof Error ? error.name : undefined,
            message: error instanceof Error ? error.message : undefined,
            stack: error instanceof Error ? error.stack : undefined,
            // All own properties
            ...Object.getOwnPropertyNames(error).reduce(
              (acc, key) => {
                try {
                  acc[key] = (error as Record<string, unknown>)[key];
                } catch {
                  // Skip if we can't access
                }
                return acc;
              },
              {} as Record<string, unknown>,
            ),
            // Stringified version for full structure - NO TRUNCATION
            stringified: JSON.stringify(
              error,
              (_key, value) => {
                // Preserve everything, especially nativeStackIOS arrays
                if (Array.isArray(value)) {
                  return value; // Keep full arrays (like nativeStackIOS)
                }
                // Keep all other values as-is
                return value;
              },
              2, // Pretty print
            ),
          };
        }
      } catch (serializationError) {
        rawErrorObject = { serializationError: String(serializationError) };
      }

      // Extract Apple's native error messages
      const appleErrorDescription = errorDetails.localizedDescription;
      const appleFailureReason = errorDetails.localizedFailureReason;
      const appleRecoverySuggestion = errorDetails.localizedRecoverySuggestion;
      const appleDebugDescription = errorDetails.debugDescription;

      // Build error message using Apple's native messages
      const debugErrorMessage = [
        `❌ Apple Sign In Error`,
        ``,
        appleErrorDescription ? `**Error:**\n${appleErrorDescription}` : '',
        appleFailureReason ? `**Reason:**\n${appleFailureReason}` : '',
        appleRecoverySuggestion ? `**Suggestion:**\n${appleRecoverySuggestion}` : '',
        appleDebugDescription ? `**Debug:**\n${appleDebugDescription}` : '',
        ``,
        `**Diagnostic Info:**`,
        `• Error Code: ${errorDetails.errorCode}`,
        `• Platform: ${Platform.OS} ${Platform.Version}`,
        `• Bundle ID: ${deviceInfo.bundle_id}`,
        nativeDomain ? `• Domain: ${nativeDomain}` : '',
        ``,
        // Show full error object if we have detailed userInfo
        errorDetails.userInfo && errorDetails.userInfo !== '{}'
          ? `**Full Error Details:**\n${errorDetails.userInfo}`
          : '',
        errorDetails.underlyingError
          ? `**Underlying Error:**\n${errorDetails.underlyingError}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');

      // Determine the step where the error occurred
      const errorStep =
        (error instanceof Error && 'step' in error
          ? (error as Error & { step?: string }).step
          : undefined) || 'unknown';

      // Use handleError to avoid duplicate Sentry captures
      handleError(error instanceof Error ? error : new Error('Apple Sign In failed'), {
        toastMessage: debugErrorMessage,
        analyticsEventName: 'Apple_Sign_In_Error',
        sentrySeverity: 'error',
        sentryTags: {
          location: 'apple_auth',
          step: errorStep,
          platform: Platform.OS,
          errorCode: errorDetails.errorCode,
          nativeDomain: nativeDomain || 'unknown',
          ios_version: String(deviceInfo.ios_version),
        },
        sentryExtra: {
          // ============================================
          // APPLE ERROR INFORMATION (Pure native data)
          // ============================================
          appleErrorCode: errorDetails.errorCode,
          appleErrorDomain: nativeDomain,
          appleLocalizedDescription: appleErrorDescription,
          appleFailureReason: appleFailureReason,
          appleRecoverySuggestion: appleRecoverySuggestion,
          appleDebugDescription: appleDebugDescription,
          appleUserInfo: errorDetails.userInfo,
          appleUnderlyingError: errorDetails.underlyingError,
          appleFullUserInfo: JSON.stringify(userInfoDetails, null, 2),

          // ============================================
          // RAW ERROR OBJECT (Complete structure)
          // ============================================
          rawErrorObject: JSON.stringify(rawErrorObject, null, 2),
          rawErrorType: errorDetails.errorType,
          rawErrorMessage: errorDetails.errorMessage,
          rawErrorStack: errorDetails.errorStack,
          rawErrorCode: errorDetails.errorCode,

          // ============================================
          // DEVICE & APP CONTEXT
          // ============================================
          device_ios_version: deviceInfo.ios_version,
          device_platform: deviceInfo.platform,
          device_platform_version: deviceInfo.platform_version,
          app_bundle_id: deviceInfo.bundle_id,
          app_version: deviceInfo.app_version,
          app_build_number: deviceInfo.build_number,
          build_type: __DEV__ ? 'development' : 'production',
          app_identifier: Application.applicationId,

          // ============================================
          // ERROR CONTEXT
          // ============================================
          error_step: errorStep,
          error_timestamp: new Date().toISOString(),
          error_occurred_at: new Date().toISOString(),

          // ============================================
          // FULL NATIVE ERROR STRUCTURE
          // ============================================
          native_error_domain: nativeDomain,
          native_error_code: errorDetails.errorCode,
          native_error_description: appleErrorDescription,
          native_error_failure_reason: appleFailureReason,
          native_error_recovery_suggestion: appleRecoverySuggestion,
          native_error_debug_description: appleDebugDescription,
          native_error_userinfo: errorDetails.userInfo,
          native_error_underlying: errorDetails.underlyingError,

          // ============================================
          // COMPLETE ERROR OBJECT (For debugging - NO TRUNCATION)
          // ============================================
          complete_error_object: JSON.stringify(
            {
              error: error,
              errorObj: errorObj,
              errorDetails: errorDetails,
              deviceInfo: deviceInfo,
            },
            (_key, value) => {
              // Preserve everything - especially nativeStackIOS arrays
              if (Array.isArray(value)) {
                return value; // Keep full arrays (native stack traces)
              }
              // Keep all other values - no truncation
              return value;
            },
            2, // Pretty print
          ),
          // Full stringified error (no truncation)
          full_error_stringified: fullErrorStringified,
          full_error_stringified_length: fullErrorStringified.length,
        },
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
