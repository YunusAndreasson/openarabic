import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress } from '@/hooks/ui/useButtonPress';

export interface HeaderTextButtonProps {
  /** The label. It IS the affordance — keep it to one or two words. */
  title: string;
  /** Press handler */
  onPress: () => void;
  /** Swap the label for a spinner while the action is starting up */
  loading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * A screen's primary action, as words, in the navigation bar's trailing slot.
 *
 * The text-not-icon choice is the point of this component. An icon in a header
 * is a guess the user has to make; "Play all" and "Review" are the two actions
 * their tabs exist for, so they say so. Both platforms have done this for a
 * decade — UIKit bar button items and Material's text buttons are both labels —
 * which is exactly why it needs no explanation on first sight.
 *
 * Sibling of `TransparentHeaderButton` (the icon form) and deliberately not a
 * `ThemedButton`: a button in native chrome gets no press-scale, because a
 * control that shrinks inside a navigation bar reads as loose. Pressed opacity
 * plus the Android ripple carry the feedback instead — the same trade
 * `HeaderIconButton` documents.
 *
 * @example
 * <HeaderTextButton title="Play all" onPress={handlePlayAll} />
 */
export const HeaderTextButton = memo<HeaderTextButtonProps>(
  ({ title, onPress, loading = false, disabled = false, testID }) => {
    const colors = useColors();
    const isInert = disabled || loading;

    const { handlePress, rippleConfig } = useButtonPress({
      onPress,
      disabled: isInert,
      hapticType: 'selection',
    });

    return (
      <Pressable
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled: isInert }}
        android_ripple={rippleConfig}
        disabled={isInert}
        hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        testID={testID}
        onPress={handlePress}
      >
        {loading ? (
          <ActivityIndicator color={colors.tint} size="small" />
        ) : (
          <ThemedText
            colorName={disabled ? 'disabled' : 'tint'}
            numberOfLines={1}
            skipDefaultColor
            type="bodyBold"
          >
            {title}
          </ThemedText>
        )}
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    // A label has no surface to pad against, so this is touch target rather
    // than padding: the text alone is well under the 44pt minimum.
    minHeight: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  pressed: {
    opacity: LAYOUT.OPACITY.PRESSED,
  },
});

HeaderTextButton.displayName = 'HeaderTextButton';
