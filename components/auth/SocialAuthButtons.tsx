import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import type { JSX } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAppleAuth } from '@/hooks/auth/useAppleAuth';
import { useGoogleAuth } from '@/hooks/auth/useGoogleAuth';
import { useColors } from '@/hooks/theme/useColors';
import { showSuccessToast } from '@/utils/errorHandling';

/**
 * Social Authentication Buttons Component
 *
 * Displays Apple and Google sign-in options using custom themed buttons
 * for consistent design across all platforms.
 *
 * **Expo Go Compatibility:**
 * - Buttons visible in Expo Go for UI preview
 * - Buttons will show error messages when pressed (native modules unavailable)
 * - Fully functional in development builds and production builds
 *
 * Features:
 * - Follows design system (Colors.ts, layout.ts)
 * - Integrates with useAppleAuth and useGoogleAuth hooks
 * - Loading states for each button independently
 * - Error handling via hooks (toast notifications)
 * - Accessibility support
 */
export function SocialAuthButtons(): JSX.Element {
  // Call hooks unconditionally (React Rules of Hooks)
  const { signInWithApple, loading: appleLoading } = useAppleAuth();
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth();
  const colors = useColors();

  // DIAGNOSTIC: Show ALL diagnostic information ON SCREEN for TestFlight debugging
  const testSentryError = async () => {
    console.log('[TEST] Running comprehensive diagnostics...');

    // Environment Variables
    const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    const mixpanelToken = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
    const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

    // App Information
    const bundleId = Application.applicationId || 'unknown';
    const appVersion = Application.nativeApplicationVersion || 'unknown';
    const buildNumber = Application.nativeBuildVersion || 'unknown';
    const appName = Application.applicationName || 'unknown';

    // Platform Information
    const isSimulator = Constants['isDevice'] === false;
    const deviceName = Constants['deviceName'] || 'unknown';
    const osVersion = Platform.Version;

    // Build Information
    const buildType = __DEV__ ? 'development' : 'production';
    const expoVersion = Constants.expoVersion || 'unknown';

    // Apple Sign In Capability Check
    let appleSignInSupported = 'unknown';
    let appleSignInError = null;
    try {
      const appleAuth = require('@invertase/react-native-apple-authentication');
      appleSignInSupported = appleAuth.default.isSupported ? 'YES ✅' : 'NO ❌';
    } catch (error) {
      appleSignInSupported = 'Module not available';
      appleSignInError = error instanceof Error ? error.message : String(error);
    }

    // Build comprehensive diagnostic message
    const diagnosticMessage = [
      '🔍 COMPREHENSIVE DIAGNOSTICS',
      '',
      '📱 APP INFORMATION',
      `Bundle ID: ${bundleId}`,
      `App Name: ${appName}`,
      `Version: ${appVersion}`,
      `Build: ${buildNumber}`,
      `Build Type: ${buildType}`,
      '',
      '📲 DEVICE INFORMATION',
      `Platform: ${Platform.OS}`,
      `OS Version: ${osVersion}`,
      `Device: ${deviceName}`,
      `Is Simulator: ${isSimulator ? 'YES ⚠️' : 'NO ✅'}`,
      `Expo Version: ${expoVersion}`,
      '',
      '🍎 APPLE SIGN IN STATUS',
      `Supported: ${appleSignInSupported}`,
      appleSignInError ? `Error: ${appleSignInError}` : '',
      '',
      '🔐 ENVIRONMENT VARIABLES',
      `Sentry DSN: ${sentryDsn ? `${sentryDsn.slice(0, 20)}... (${sentryDsn.length} chars)` : '[NOT SET] ❌'}`,
      `Mixpanel: ${mixpanelToken ? `${mixpanelToken.slice(0, 15)}... (${mixpanelToken.length} chars)` : '[NOT SET] ❌'}`,
      `Google Web: ${googleWebClientId ? `${googleWebClientId.slice(0, 20)}... (${googleWebClientId.length} chars)` : '[NOT SET] ❌'}`,
      `Google iOS: ${googleIosClientId ? `${googleIosClientId.slice(0, 20)}... (${googleIosClientId.length} chars)` : '[NOT SET] ❌'}`,
      '',
      '⚠️ CRITICAL CHECKS',
      `${isSimulator ? '⚠️ SIMULATOR: Apple Sign In will NOT work' : '✅ Physical Device: Apple Sign In should work'}`,
      `${appleSignInSupported === 'YES ✅' ? '✅ Apple Sign In capability detected' : '❌ Apple Sign In capability NOT detected'}`,
      `${bundleId === 'openarabic' ? '✅ Bundle ID matches expected' : `❌ Bundle ID mismatch: expected 'openarabic', got '${bundleId}'`}`,
    ]
      .filter(Boolean)
      .join('\n');

    // Send comprehensive diagnostic to Sentry
    if (sentryDsn) {
      try {
        Sentry.captureException(new Error('TEST: Comprehensive diagnostics'), {
          tags: {
            location: 'auth_test',
            build_type: buildType,
            platform: Platform.OS,
            is_simulator: isSimulator.toString(),
            apple_signin_supported: String(appleSignInSupported),
          },
          level: 'info',
          extra: {
            app_info: {
              bundle_id: bundleId,
              app_version: appVersion,
              build_number: buildNumber,
              app_name: appName,
            },
            device_info: {
              platform: Platform.OS,
              os_version: osVersion,
              device_name: deviceName,
              is_simulator: isSimulator,
              expo_version: expoVersion,
            },
            apple_signin: {
              supported: appleSignInSupported,
              error: appleSignInError,
            },
            env_vars: {
              sentry_dsn_length: sentryDsn?.length || 0,
              sentry_dsn_present: !!sentryDsn,
              mixpanel_token_length: mixpanelToken?.length || 0,
              mixpanel_token_present: !!mixpanelToken,
              google_web_client_id_length: googleWebClientId?.length || 0,
              google_web_client_id_present: !!googleWebClientId,
              google_ios_client_id_length: googleIosClientId?.length || 0,
              google_ios_client_id_present: !!googleIosClientId,
            },
          },
        });
      } catch (error) {
        console.error('[TEST] Failed to send to Sentry:', error);
      }
    }

    // Show on screen for 20 seconds so user can read/screenshot
    showSuccessToast(diagnosticMessage, 20000);
  };

  return (
    <View style={styles.container}>
      {/* DIAGNOSTIC: Comprehensive Diagnostics Button - REMOVE AFTER DEBUGGING */}
      <ThemedButton
        variant="filled"
        title="🔍 Run Diagnostics"
        uppercase={false}
        style={[styles.button, { opacity: 0.7 }]}
        onPress={testSentryError}
      />

      {/* Apple Sign In Button */}
      <ThemedButton
        variant="outlined"
        title={STRINGS.SIGN_IN_WITH_APPLE}
        icon="logo-apple"
        loading={appleLoading}
        disabled={appleLoading || googleLoading}
        uppercase={false}
        style={styles.button}
        testID="apple-sign-in-button"
        accessibilityLabel="Sign in with Apple"
        onPress={signInWithApple}
      />

      {/* Google Sign In Button */}
      <ThemedButton
        variant="outlined"
        title={STRINGS.SIGN_IN_WITH_GOOGLE}
        icon="logo-google"
        loading={googleLoading}
        disabled={appleLoading || googleLoading}
        uppercase={false}
        style={styles.button}
        testID="google-sign-in-button"
        accessibilityLabel="Sign in with Google"
        onPress={signInWithGoogle}
      />

      {/* Divider with "or" text */}
      <View style={styles.dividerContainer}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <ThemedText
          type="caption"
          variant="secondary"
          style={styles.dividerText}
          accessibilityLabel="Or continue with email"
        >
          {STRINGS.CONTINUE_WITH}
        </ThemedText>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  container: {
    marginBottom: LAYOUT.SPACING.LARGE,
    maxWidth: SCREEN_WIDTH * 0.9, // Match form input width constraint
    width: '100%',
  },
  dividerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: LAYOUT.BORDER.WIDTH.THIN,
  },
  dividerText: {
    marginHorizontal: LAYOUT.SPACING.MEDIUM,
  },
});
