import { router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

/**
 * Email authentication navigation buttons (Sign In / Create Account).
 */
export function EmailAuthOptions(): JSX.Element {
  const handleSignIn = useCallback(() => {
    router.push(ROUTE_PATHS.AUTH_SIGN_IN);
  }, []);

  const handleSignUp = useCallback(() => {
    router.push(ROUTE_PATHS.AUTH_SIGN_UP);
  }, []);

  return (
    <View style={styles.container}>
      <ThemedButton
        variant="outlined"
        title={STRINGS.SIGN_IN_WITH_EMAIL}
        icon="mail-outline"
        testID="navigate-to-sign-in-button"
        accessibilityLabel="Go to sign in screen"
        onPress={handleSignIn}
      />

      <ThemedButton
        variant="outlined"
        title={STRINGS.CREATE_ACCOUNT_WITH_EMAIL}
        icon="mail-outline"
        testID="navigate-to-sign-up-button"
        accessibilityLabel="Go to create account screen"
        onPress={handleSignUp}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
});
