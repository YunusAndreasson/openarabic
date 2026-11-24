import type { StartReaderAuth } from '@/services/readerSaveAuth';
import type { JSX } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { NativeAppleSignIn } from './NativeAppleSignIn';
import { ListSeparator } from '@/components/common';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { AUTH_CONTENT_MAX_WIDTH_RATIO, LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { UseAppleAuthReturn } from '@/hooks/auth/useAppleAuth';
import { getGoogleSignin, type UseGoogleAuthReturn } from '@/hooks/auth/useGoogleAuth';
import { useColors } from '@/hooks/theme/useColors';

const isIOS = Platform.OS === 'ios';

interface SocialAuthButtonsProps {
  startAttempt?: StartReaderAuth;
  reader?: boolean;
  appleAuth: UseAppleAuthReturn;
  googleAuth: UseGoogleAuthReturn;
}

export function SocialAuthButtons({
  appleAuth,
  googleAuth,
  startAttempt,
  reader,
}: SocialAuthButtonsProps): JSX.Element {
  const { signInWithApple, loading: appleLoading } = appleAuth;
  const { signInWithGoogle, loading: googleLoading } = googleAuth;
  const colors = useColors();
  const GoogleButton = reader ? getGoogleSignin()?.GoogleSigninButton : undefined;
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.container, { maxWidth: width * AUTH_CONTENT_MAX_WIDTH_RATIO }]}>
      {/* Apple Sign In Button - iOS only */}
      {isIOS && (
        <NativeAppleSignIn
          disabled={appleLoading || googleLoading}
          onPress={() => void signInWithApple(startAttempt)}
        />
      )}

      {/* Google Sign In Button */}
      {GoogleButton ? (
        <GoogleButton
          size={GoogleButton.Size.Wide}
          style={styles.nativeButton}
          accessibilityLabel={STRINGS.SIGN_IN_WITH_GOOGLE}
          disabled={appleLoading || googleLoading}
          onPress={() => void signInWithGoogle(startAttempt)}
        />
      ) : (
        <ThemedButton
          variant="outlined"
          title={STRINGS.SIGN_IN_WITH_GOOGLE}
          icon="logo-google"
          loading={googleLoading}
          disabled={isIOS ? appleLoading || googleLoading : googleLoading}
          fullWidth
          testID="google-sign-in-button"
          accessibilityLabel="Sign in with Google"
          onPress={() => void signInWithGoogle(startAttempt)}
        />
      )}

      {/* Divider with "or" text - appears after social buttons */}
      {!reader && (
        <View style={styles.dividerContainer}>
          <ListSeparator
            color={colors.border}
            height={ListSeparator.RULE_HEIGHT}
            style={styles.dividerLine}
          />
          <ThemedText
            type="caption"
            colorName="secondaryText"
            style={styles.dividerText}
            accessibilityLabel="Or continue with email"
          >
            {STRINGS.CONTINUE_WITH}
          </ThemedText>
          <ListSeparator
            color={colors.border}
            height={ListSeparator.RULE_HEIGHT}
            style={styles.dividerLine}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  nativeButton: { width: '100%', height: MIN_TOUCH_TARGET.LARGE },
  container: {
    gap: LAYOUT.SPACING.SMALL, // Tighter grouping between social buttons (proximity)
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
  },
  dividerText: {
    marginHorizontal: LAYOUT.SPACING.LARGE, // More breathing room around "or"
  },
});
