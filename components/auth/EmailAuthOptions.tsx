import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

/**
 * Email authentication navigation buttons (Sign In / Create Account).
 */
export function EmailAuthOptions({
  onSelect,
}: {
  onSelect: (form: 'sign-in' | 'sign-up') => void;
}): JSX.Element {
  return (
    <View style={styles.container}>
      <ThemedButton
        variant="outlined"
        title={STRINGS.SIGN_IN_WITH_EMAIL}
        icon="mail-outline"
        testID="navigate-to-sign-in-button"
        accessibilityLabel="Go to sign in screen"
        onPress={() => onSelect('sign-in')}
      />

      <ThemedButton
        variant="outlined"
        title={STRINGS.CREATE_ACCOUNT_WITH_EMAIL}
        icon="mail-outline"
        testID="navigate-to-sign-up-button"
        accessibilityLabel="Go to create account screen"
        onPress={() => onSelect('sign-up')}
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
