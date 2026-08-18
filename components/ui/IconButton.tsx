import { Ionicons, type IoniconName } from '@/components/ui/Icon';
import type { FC } from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { PRESS_SCALE } from '@/constants/animation';
import { getElevation } from '@/constants/elevation';
import { LAYOUT } from '@/constants/layout';
import { ICON_BUTTON_SIZES, type IconButtonSize } from '@/constants/iconButton';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress, type HapticType } from '@/hooks/ui/useButtonPress';
import type { ButtonTone } from '@/types/ui/button.types';

interface IconButtonProps {
  /**
   * The icon name from Ionicons
   */
  icon: IoniconName;

  /**
   * Callback when button is pressed
   */
  onPress: () => void;

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;

  /**
   * Overall button size. Drives the dimension, corner radius, icon size and
   * hit slop from one token — the same scale `HeaderIconButton` uses.
   */
  size?: IconButtonSize;

  /**
   * Background color (defaults to the tone's hue)
   */
  backgroundColor?: string;

  /**
   * Icon color (defaults to the tone's contrast color)
   */
  iconColor?: string;

  /**
   * Icon size override, when the glyph needs to be smaller or larger than the
   * button's `size` implies. Prefer `size`.
   */
  iconSize?: number;

  /**
   * Which hue the button paints itself with — same axis as `ThemedButton`.
   * - 'default': the theme tint
   * - 'destructive': the error color, for delete/reset actions
   */
  tone?: ButtonTone;

  /**
   * Type of haptic feedback
   * - 'light': Light haptic feedback (play buttons)
   * - 'selection': Selection haptic feedback (delete/action buttons)
   * - 'none': No haptic feedback
   */
  hapticType?: HapticType;

  /**
   * What the button does, for screen readers. An icon-only control has no
   * text to fall back on, so pass this wherever the icon isn't self-evident.
   */
  accessibilityLabel?: string;
}

/**
 * A filled, circular icon button — the app's compact action control (play,
 * delete, reset). For the transparent variant used in navigation headers see
 * `HeaderIconButton`; for chrome floating over content see `GlassIconButton`.
 */
export const IconButton: FC<IconButtonProps> = ({
  icon,
  onPress,
  disabled = false,
  size = 'medium',
  backgroundColor,
  iconColor,
  iconSize,
  tone = 'default',
  hapticType = 'selection',
  accessibilityLabel,
}) => {
  const colors = useColors();
  const config = ICON_BUTTON_SIZES[size];

  // Use shared button press hook
  const { handlePress, animatedStyle, handlePressIn, handlePressOut, rippleConfig } =
    useButtonPress({
      onPress,
      disabled,
      hapticType,
      animationOptions: { scaleAmount: PRESS_SCALE.STRONG },
    });

  // Determine colors from the tone. The icon color used to default to
  // `isDarkMode ? text : black`, which ignored the surface it sits on — on a
  // destructive button that painted near-black glyphs onto red in light mode.
  // The `onTint`/`onError` pair is the contrast color each hue was designed
  // with, and it is what ThemedButton uses for the same job.
  const hue = tone === 'destructive' ? colors.error : colors.tint;
  const onHue = tone === 'destructive' ? colors.onError : colors.onTint;

  const resolvedBackgroundColor = backgroundColor ?? hue;
  const resolvedIconColor = iconColor ?? onHue;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      android_ripple={rippleConfig}
      disabled={disabled}
      hitSlop={config.hitSlop}
      style={config.container}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          config.container,
          getElevation(colors, 'HAIRLINE'),
          animatedStyle,
          {
            backgroundColor: resolvedBackgroundColor,
            opacity: disabled ? LAYOUT.OPACITY.MEDIUM : 1,
          },
        ]}
      >
        <Ionicons color={resolvedIconColor} name={icon} size={iconSize ?? config.iconSize} />
      </Animated.View>
    </Pressable>
  );
};

IconButton.displayName = 'IconButton';
