import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { TextLink } from '@/components/ui/TextLink';
import { LAYOUT } from '@/constants/layout';

interface AuthSwitchPromptProps {
  /** The question, e.g. "Don't have an account?" */
  prompt: string;
  /** The link label, e.g. "Create account". */
  label: string;
  accessibilityLabel: string;
  testID: string;
  onPress: () => void;
}

/**
 * The "Don't have an account? Create account" row at the foot of an auth form.
 *
 * Both forms carried this JSX and an identical five-property style object under
 * two different style names (`createAccountContainer` / `signInContainer`).
 */
export function AuthSwitchPrompt({
  prompt,
  label,
  accessibilityLabel,
  testID,
  onPress,
}: AuthSwitchPromptProps): JSX.Element {
  return (
    <View style={styles.container}>
      <ThemedText type="body" colorName="secondaryText">
        {prompt}{' '}
      </ThemedText>
      <TextLink
        accessibilityLabel={accessibilityLabel}
        label={label}
        testID={testID}
        type="bodyBold"
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
});

AuthSwitchPrompt.displayName = 'AuthSwitchPrompt';
