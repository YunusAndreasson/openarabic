import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import type { TextTypeName } from '@/types/ui/text.types';

interface TextLinkProps {
  label: string;
  onPress: () => void;
  /** Typography, matched to the text this link sits beside (default: 'body'). */
  type?: TextTypeName;
  /** Underline it — for a link inside a running sentence. */
  underline?: boolean;
  /** Defaults to the label. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A tappable run of text — "Forgot password?", "Create account", the terms and
 * privacy links in the sign-up footer.
 *
 * Nine call sites had each written the same thing by hand, down to a character:
 * `style={({ pressed }) => (pressed ? { opacity: LAYOUT.OPACITY.HIGH } : null)}`
 * around a tint-coloured `ThemedText`.
 *
 * Distinct from `ThemedButton variant="ghost"`, which is a real 44pt-tall
 * control for a standalone tertiary action. This one hugs its text so it can sit
 * inline in a sentence without breaking the line box; `hitSlop` rather than
 * height gives it a reachable target.
 */
export const TextLink: FC<TextLinkProps> = ({
  label,
  onPress,
  type = 'body',
  underline = false,
  accessibilityLabel,
  style,
  testID,
}) => (
  <Pressable
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityRole="link"
    hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
    style={({ pressed }) => [style, pressed ? styles.pressed : null]}
    testID={testID}
    onPress={onPress}
  >
    <ThemedText colorName="tint" style={underline ? styles.underline : undefined} type={type}>
      {label}
    </ThemedText>
  </Pressable>
);

const styles = StyleSheet.create({
  pressed: {
    opacity: LAYOUT.OPACITY.PRESSED,
  },
  underline: {
    textDecorationLine: 'underline',
  },
});

TextLink.displayName = 'TextLink';
