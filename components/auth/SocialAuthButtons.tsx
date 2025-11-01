import Constants from 'expo-constants';
import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAppleAuth } from '@/hooks/auth/useAppleAuth';
import { useGoogleAuth } from '@/hooks/auth/useGoogleAuth';

/**
 * Social Authentication Buttons Component
 *
 * Displays Apple and Google sign-in options using custom themed buttons
 * for consistent design across all platforms.
 *
 * **Expo Go Compatibility:**
 * - Hidden in Expo Go (native modules not available)
 * - Visible in development builds and production builds
 *
 * Features:
 * - Follows design system (Colors.ts, layout.ts)
 * - Integrates with useAppleAuth and useGoogleAuth hooks
 * - Loading states for each button independently
 * - Error handling via hooks (toast notifications)
 * - Accessibility support
 */
export function SocialAuthButtons(): JSX.Element | null {
  // Hide social auth in Expo Go (native modules not supported)
  const isExpoGo = Constants.appOwnership === 'expo';
  if (isExpoGo) {
    return null;
  }

  const { signInWithApple, loading: appleLoading } = useAppleAuth();
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth();

  return (
    <View style={styles.container}>
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
        <View style={styles.dividerLine} />
        <ThemedText
          type="caption"
          variant="secondary"
          style={styles.dividerText}
          accessibilityLabel="Or continue with email"
        >
          {STRINGS.CONTINUE_WITH}
        </ThemedText>
        <View style={styles.dividerLine} />
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
    width: '100%',
  },
  dividerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  dividerLine: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)', // Will be themed in dark mode automatically
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: LAYOUT.SPACING.MEDIUM,
  },
});
