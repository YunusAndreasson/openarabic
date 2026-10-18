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
   * and turns the glyph to the tint.
   */
  active?: boolean;
  /** Defaults to `secondaryText` (or `tint` when `active`). */
  iconColor?: string;
  iconSize?: number;
  /**
   * Haptic fired on press. Defaults to 'selection', like ThemedButton,
   * IconButton and HeaderTextButton: the utils/haptics ladder keeps 'light'
   * for outcomes, and a press on this button is a choice.
   */
  hapticType?: HapticType;
  hitSlop?: number | Insets;
  accessibilityState?: AccessibilityState;
  /** Positioning for the outer pressable — where the button sits on screen. */
  style?: StyleProp<ViewStyle>;
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
 * content — the article reader's close/listen/playlist controls.
 *
 * One glass style for every instance. The reader's close button used to take
 * `clear` glass while Listen and Playlist beside it, over the same image, took
 * the default, so one row of controls drew as two kinds of object.
 */
export const GlassIconButton = ({
  icon,
  accessibilityLabel,
  onPress,
  active = false,
  iconColor,
  iconSize = LAYOUT.BUTTON.ICON_SIZE.LARGE,
  hapticType = 'selection',
  hitSlop,
  accessibilityState,
  style,
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
  // this button gave no visual response to a tap at all. The scale only runs
  // on the fallback path so the two never double up.
  const { handlePress, animatedStyle, handlePressIn, handlePressOut } = useButtonPress({
    onPress,
    hapticType,
    animationOptions: PRESS_ANIMATION_BUTTON,
  });

  // Fallback background for platforms without liquid glass — and for a user on
  // Reduce Transparency, where it is what the button is made of. On the glass
  // path the effect paints over this; everywhere else it IS the button.
  //
  // No `opacity` on either state. It used to be 0.6 at rest (the PRESSED token)
  // and 0.75 when on, and opacity on this view reaches the glyph too, so every
  // control in the row drew at a pressed/disabled strength. The state is
  // carried by the surface level and the glyph colour instead.
  const surfaceStyle = { backgroundColor: active ? colors.elevation2 : colors.elevation1 };

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
