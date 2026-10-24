import type { ComponentType } from 'react';
import type { Insets, StyleProp, ViewStyle } from 'react-native';
import { Pressable as RNPressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/ui/Icon';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress, type UseButtonPressOptions } from '@/hooks/ui/useButtonPress';
import type { PressableLikeProps } from '@/types/ui/base.types';

/** A press dims the glyph. Nothing scales: a bare glyph has no surface to move. */
const PRESS_DIM = {
  type: 'custom',
  scaleAmount: 1,
  includeOpacity: true,
  opacityAmount: LAYOUT.OPACITY.PRESSED,
} as const;

interface GlyphButtonProps {
  icon: IconName;
  /** What it does. Required: the control is a glyph, with no text to fall back on. */
  accessibilityLabel: string;
  onPress?: () => void;
  /** Defaults to the tertiary ink: the quietest control on its surface. */
  color?: string;
  size?: number;
  /** The glyph is small; the target should not be. */
  hitSlop?: number | Insets;
  /** Defaults to none, like the hand-written glyph buttons this replaced. */
  hapticType?: UseButtonPressOptions['hapticType'];
  /** Positioning for the pressable — where the glyph sits in its row. */
  style?: StyleProp<ViewStyle>;
  /** Pressable implementation. Inside the article reader, pass `ReaderPressable`. */
  PressableComponent?: ComponentType<PressableLikeProps>;
  testID?: string;
}

/**
 * An icon with no surface around it, as a button: the close glyph on a card,
 * the eye in a password field — the least important control in its place, and
 * drawn to look it.
 *
 * Three of these were hand-rolled, and they disagreed on the one thing a press
 * should do: two dimmed while held, the reader's tutorial-card close gave no
 * feedback at all. This dims through `useButtonPress`, which also brings the
 * repeat-press lock every other button has.
 */
export function GlyphButton({
  icon,
  accessibilityLabel,
  onPress,
  color,
  size = LAYOUT.BUTTON.ICON_SIZE.SMALL,
  hitSlop = LAYOUT.HIT_SLOP.MEDIUM,
  hapticType = 'none',
  style,
  PressableComponent = RNPressable,
  testID,
}: GlyphButtonProps) {
  const colors = useColors();
  const { handlePress, handlePressIn, handlePressOut, animatedStyle } = useButtonPress({
    onPress,
    hapticType,
    animationOptions: PRESS_DIM,
  });

  return (
    <PressableComponent
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={hitSlop}
      style={style}
      testID={testID}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={animatedStyle}>
        <Icon color={color ?? colors.textTertiary} name={icon} size={size} />
      </Animated.View>
    </PressableComponent>
  );
}
