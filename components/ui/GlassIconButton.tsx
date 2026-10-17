import { Icon, type IconName } from '@/components/ui/Icon';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ComponentType } from 'react';
import type { AccessibilityState, Insets, StyleProp, ViewStyle } from 'react-native';
import { Pressable as RNPressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ICON_BUTTON_SIZES } from '@/constants/iconButton';
import { LAYOUT } from '@/constants/layout';
import { PRESS_ANIMATION_BUTTON } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress, type HapticType } from '@/hooks/ui/useButtonPress';
import { useReduceTransparency } from '@/hooks/ui/useReduceTransparency';
import type { PressableLikeProps } from '@/types/ui/base.types';

// Resolved once: `isLiquidGlassAvailable()` is a native capability check, not
// state, so it cannot change for the life of the process. It is only half the
// question though — it reports that the components EXIST, and stays true for a
// user running Reduce Transparency. See `onGlass` below.
const GLASS_AVAILABLE = isLiquidGlassAvailable();
const AnimatedView = Animated.createAnimatedComponent(View);

export interface GlassIconButtonProps {
  /** Icon name from Ionicons */
  icon: IconName;
  /**
   * What the button does. Required, not optional: this control is icon-only, so
   * there is no text for a screen reader to fall back on.
   */
  accessibilityLabel: string;
  onPress: () => void;
  /**
   * Emphasised state — a toggle that is currently on. Lifts the surface a level
   * and raises its opacity so an active control reads as pressed-in.
   */
  active?: boolean;
  /** Defaults to `secondaryText` (or `tint` when `active`). */
  iconColor?: string;
  iconSize?: number;
  /** Haptic weight fired on press (default: 'light'). */
  hapticType?: HapticType;
  hitSlop?: number | Insets;
  accessibilityState?: AccessibilityState;
  /** Positioning for the outer pressable — where the button sits on screen. */
  style?: StyleProp<ViewStyle>;
  /**
   * Use the `clear` liquid-glass style rather than the default. Chrome that
   * floats over content (headers) wants `clear`; controls that sit on a busy
   * image read better with the default.
   */
  clear?: boolean;
  /**
   * Pressable implementation. Defaults to react-native's.
   *
   * Pass react-native-gesture-handler's when an RNGH ancestor owns the gesture
   * arena — an RNGH ancestor beats descendants using the JS responder system, so
   * a react-native Pressable nested under one silently stops receiving taps.
   * The article reader wraps its whole content in an RNGH Pressable to dismiss
   * the word tooltip, which is exactly that situation.
   */
  PressableComponent?: ComponentType<PressableLikeProps>;
  testID?: string;
}

/**
 * A circular icon button on a liquid-glass surface, for chrome that floats over
 * content — the article reader's close/listen/playlist controls and the review
 * header's mic/close.
 *
 * Both of those built this independently, down to a byte-identical
 * `GLASS_AVAILABLE`/`GlassContainer` pair, the same six-property circle style
 * and the same non-glass fallback. Neither labelled its close button.
 */
export const GlassIconButton = ({
  icon,
  accessibilityLabel,
  onPress,
  active = false,
  iconColor,
  iconSize = LAYOUT.BUTTON.ICON_SIZE.LARGE,
  hapticType = 'light',
  hitSlop,
  accessibilityState,
  style,
  clear = false,
  PressableComponent = RNPressable,
  testID,
}: GlassIconButtonProps) => {
  const colors = useColors();
  // Reduce Transparency takes the glass path off the table: iOS flattens the
  // material for that user, and `isInteractive` has correspondingly little to
  // show for a press. Branching on availability alone therefore handed the
  // no-feedback button described below to precisely the people least able to
  // absorb it — the glass path deliberately drops the scale animation, so
  // there would have been nothing left answering the tap.
  const reduceTransparency = useReduceTransparency();
  const onGlass = GLASS_AVAILABLE && !reduceTransparency;

  // On iOS 26 the glass container answers the press itself (`isInteractive`).
  // Everywhere else the fallback is a plain View, which for a long time meant
  // this button — the article reader's floating controls and the review
  // header's mic and close — gave no visual response to a tap at all. The
  // scale only runs on the fallback path so the two never double up.
  const { handlePress, animatedStyle, handlePressIn, handlePressOut } = useButtonPress({
    onPress,
    hapticType,
    animationOptions: PRESS_ANIMATION_BUTTON,
  });

  // Fallback background for platforms without liquid glass — and for a user on
  // Reduce Transparency, where it is what the button is made of. On the glass
  // path the effect paints over this; everywhere else it IS the button.
  const surfaceStyle = active
    ? { backgroundColor: colors.elevation2, opacity: LAYOUT.OPACITY.ACTIVE }
    : { backgroundColor: colors.elevation1, opacity: LAYOUT.OPACITY.PRESSED };

  const resolvedIconColor = iconColor ?? (active ? colors.tint : colors.secondaryText);

  return (
    <PressableComponent
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      hitSlop={hitSlop}
      style={style}
      testID={testID}
      onPress={handlePress}
      onPressIn={onGlass ? undefined : handlePressIn}
      onPressOut={onGlass ? undefined : handlePressOut}
    >
      {onGlass ? (
        <GlassView
          style={[ICON_BUTTON_SIZES.medium.container, styles.button, surfaceStyle]}
          isInteractive
          {...(clear && { glassEffectStyle: 'clear' as const })}
        >
          <Icon color={resolvedIconColor} name={icon} size={iconSize} />
        </GlassView>
      ) : (
        <AnimatedView
          style={[ICON_BUTTON_SIZES.medium.container, styles.button, surfaceStyle, animatedStyle]}
        >
          <Icon color={resolvedIconColor} name={icon} size={iconSize} />
        </AnimatedView>
      )}
    </PressableComponent>
  );
};

// Clips the glass/surface fill to the token's corner radius. Its own
// StyleSheet rather than a property on ICON_BUTTON_SIZES.medium.container:
// that token is shared with HeaderIconButton and IconButton, neither of which
// asked to be clipped.
const styles = StyleSheet.create({
  button: { overflow: 'hidden' },
});

GlassIconButton.displayName = 'GlassIconButton';
