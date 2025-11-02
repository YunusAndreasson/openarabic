import * as Sentry from '@sentry/react-native';
import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

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

  // DIAGNOSTIC: Show ALL environment variables ON SCREEN for TestFlight debugging
  const testSentryError = () => {
    console.log('[TEST] Showing environment variables on screen...');

    // Get ALL environment variables
    const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    const mixpanelToken = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
    const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

    // Build on-screen diagnostic message with FULL values
    const diagnosticMessage = [
      '🔍 Environment Variables (TestFlight)',
      '',
      `Sentry DSN:`,
      sentryDsn || '[NOT SET]',
      `(${sentryDsn?.length || 0} chars)`,
      '',
      `Mixpanel:`,
      mixpanelToken || '[NOT SET]',
      `(${mixpanelToken?.length || 0} chars)`,
      '',
      `Google Web ID:`,
      googleWebClientId || '[NOT SET]',
      `(${googleWebClientId?.length || 0} chars)`,
      '',
      `Google iOS ID:`,
      googleIosClientId || '[NOT SET]',
      `(${googleIosClientId?.length || 0} chars)`,
    ].join('\n');

    // Also send test error to Sentry if DSN is present
    if (sentryDsn) {
      try {
        Sentry.captureException(new Error('TEST: Environment variables diagnostic'), {
          tags: {
            location: 'auth_test',
            build_type: __DEV__ ? 'development' : 'production',
          },
          level: 'info',
          extra: {
            sentry_dsn_length: sentryDsn?.length || 0,
            mixpanel_token_length: mixpanelToken?.length || 0,
            google_web_client_id_length: googleWebClientId?.length || 0,
            google_ios_client_id_length: googleIosClientId?.length || 0,
          },
        });
      } catch {
        // Ignore Sentry errors
      }
    }

    // Show on screen for 15 seconds so user can read/screenshot
    showSuccessToast(diagnosticMessage, 15000);
  };

  return (
    <View style={styles.container}>
      {/* DIAGNOSTIC: Test Sentry Button - REMOVE AFTER DEBUGGING */}
      <ThemedButton
        variant="filled"
        title="🔍 Test Sentry Error"
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
