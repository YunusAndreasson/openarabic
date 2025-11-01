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
import { ToastType } from '@/types/enums';
import { handleError } from '@/utils/errorHandling';
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

  // DIAGNOSTIC: Test Sentry error capture with detailed diagnostics
  const testSentryError = () => {
    console.log('[TEST] Triggering test Sentry error...');

    // Get diagnostic information
    const sentryDsn = process.env['EXPO_PUBLIC_SENTRY_DSN'];
    const isDsnPresent = !!sentryDsn;
    const dsnLength = sentryDsn?.length || 0;
    const isSentryEnabled = isDsnPresent;

    console.log('[TEST] Sentry diagnostics:', {
      isDsnPresent,
      dsnLength,
      isSentryEnabled,
    });

    try {
      // Attempt to send test error to Sentry
      Sentry.captureException(new Error('TEST: Manual Sentry error from auth screen'), {
        tags: {
          location: 'auth_test',
          test: 'manual_error',
          build_type: __DEV__ ? 'development' : 'production',
        },
        level: 'error',
        extra: {
          testTimestamp: new Date().toISOString(),
          sentryEnabled: isSentryEnabled,
          dsnPresent: isDsnPresent,
          dsnLength,
        },
      });

      console.log('[TEST] Sentry error capture called');

      // Show concise diagnostic toast (3 lines max)
      const diagnosticMessage = isSentryEnabled
        ? [
            '🔍 Sentry Test: Event Sent ✅',
            `DSN configured (${dsnLength} chars)`,
            'Check Sentry dashboard for event',
          ].join('\n')
        : [
            '🔍 Sentry Test: Disabled ❌',
            'DSN missing - Sentry not enabled',
            'Add EXPO_PUBLIC_SENTRY_DSN to enable',
          ].join('\n');

      if (isSentryEnabled) {
        showSuccessToast(diagnosticMessage, 10000);
      } else {
        handleError(new Error('Sentry is disabled'), {
          toastMessage: diagnosticMessage,
          toastType: ToastType.INFO,
          toastDuration: 10000,
          captureSentry: false, // Don't try to capture this to Sentry
          trackAnalytics: false,
        });
      }
    } catch (error) {
      console.error('[TEST] Failed to send Sentry error:', error);

      const errorMessage = [
        '❌ Sentry Test Failed',
        error instanceof Error ? error.message : String(error),
        `DSN: ${isDsnPresent ? `${dsnLength} chars` : 'Missing'}`,
      ].join('\n');

      handleError(error instanceof Error ? error : new Error('Sentry test failed'), {
        toastMessage: errorMessage,
        toastType: ToastType.ERROR,
        toastDuration: 10000,
        captureSentry: false, // Don't try to capture this to Sentry
        trackAnalytics: false,
      });
    }
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
