import type { JSX } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { UseAppleAuthReturn } from '@/hooks/auth/useAppleAuth';
import type { UseGoogleAuthReturn } from '@/hooks/auth/useGoogleAuth';
import { useColors } from '@/hooks/theme/useColors';

const isIOS = Platform.OS === 'ios';

interface SocialAuthButtonsProps {
  appleAuth: UseAppleAuthReturn;
  googleAuth: UseGoogleAuthReturn;
}

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
export function SocialAuthButtons({ appleAuth, googleAuth }: SocialAuthButtonsProps): JSX.Element {
  const { signInWithApple, loading: appleLoading } = appleAuth;
  const { signInWithGoogle, loading: googleLoading } = googleAuth;
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Apple Sign In Button - iOS only */}
      {isIOS && (
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
      )}

      {/* Google Sign In Button */}
      <ThemedButton
        variant="outlined"
        title={STRINGS.SIGN_IN_WITH_GOOGLE}
        icon="logo-google"
        loading={googleLoading}
        disabled={isIOS ? appleLoading || googleLoading : googleLoading}
        uppercase={false}
        style={styles.button}
        testID="google-sign-in-button"
        accessibilityLabel="Sign in with Google"
        onPress={signInWithGoogle}
      />

      {/* Divider with "or" text - appears after social buttons */}
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
    marginBottom: LAYOUT.SPACING.SMALL, // Tighter grouping between social buttons (proximity)
    width: '100%',
  },
  container: {
    maxWidth: SCREEN_WIDTH * 0.9,
    width: '100%',
  },
  dividerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: LAYOUT.SPACING.XLARGE, // Equal space above and below divider
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: LAYOUT.BORDER.WIDTH.THIN,
  },
  dividerText: {
    marginHorizontal: LAYOUT.SPACING.LARGE, // More breathing room around "or"
  },
});
