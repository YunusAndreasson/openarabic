import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAppleAuth } from '@/hooks/auth/useAppleAuth';
import { useGoogleAuth } from '@/hooks/auth/useGoogleAuth';
import { useColors } from '@/hooks/theme/useColors';

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

  return (
    <View style={styles.container}>
      {/* Divider with "or" text */}
      <View style={styles.dividerContainer}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <ThemedText
          type="caption"
          variant="secondary"
          style={styles.dividerText}
          accessibilityLabel="Or sign in with social"
        >
          {STRINGS.CONTINUE_WITH}
        </ThemedText>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  container: {
    marginTop: LAYOUT.SPACING.XXLARGE, // Major section separator email → social (was XLARGE)
    maxWidth: SCREEN_WIDTH * 0.9, // Match form input width constraint
    width: '100%',
  },
  dividerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: LAYOUT.SPACING.LARGE, // More breathing room after divider (was MEDIUM)
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
