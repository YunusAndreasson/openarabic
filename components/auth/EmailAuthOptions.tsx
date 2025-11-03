import { router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

/**
 * Email Authentication Options Component
 *
 * Displays navigation buttons to dedicated Sign In and Sign Up screens.
 * Shown when user expands "Continue with email" option.
 *
 * Features:
 * - Two clear CTAs for signing in vs creating account
 * - Navigates to separate dedicated screens
 * - Consistent button styling with design system
 */
export function EmailAuthOptions(): JSX.Element {
  const handleSignIn = useCallback(() => {
    router.push('/auth/sign-in');
  }, []);

  const handleSignUp = useCallback(() => {
    router.push('/auth/sign-up');
  }, []);

  return (
    <View style={styles.container}>
      <ThemedButton
        variant="filled"
        title={STRINGS.SIGN_IN}
        uppercase={false}
        testID="navigate-to-sign-in-button"
        accessibilityLabel="Go to sign in screen"
        onPress={handleSignIn}
      />

      <ThemedButton
        variant="outlined"
        title={STRINGS.CREATE_ACCOUNT}
        uppercase={false}
        style={styles.createAccountButton}
        testID="navigate-to-sign-up-button"
        accessibilityLabel="Go to create account screen"
        onPress={handleSignUp}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  createAccountButton: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
