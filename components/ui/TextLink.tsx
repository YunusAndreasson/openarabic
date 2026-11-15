import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useButtonPress } from '@/hooks/ui/useButtonPress';
import type { TextTypeName } from '@/types/ui/text.types';

interface TextLinkProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
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
export const TextLink = ({
  label,
  onPress,
  disabled = false,
  type = 'body',
  underline = false,
  accessibilityLabel,
  style,
  testID,
}: TextLinkProps) => {
  const { handlePress } = useButtonPress({ onPress, disabled });

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="link"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      style={({ pressed }) => [style, pressed ? styles.pressed : null]}
      testID={testID}
      onPress={handlePress}
    >
      <ThemedText
        colorName={disabled ? 'disabled' : 'tint'}
        style={underline ? styles.underline : undefined}
        type={type}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: {
    opacity: LAYOUT.OPACITY.PRESSED,
  },
  underline: {
    textDecorationLine: 'underline',
  },
});

TextLink.displayName = 'TextLink';
