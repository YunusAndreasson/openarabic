import { Ionicons } from '@/components/ui/Icon';
import type { ComponentProps, FC } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { PRESS_SCALE } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useButtonPress } from '@/hooks/ui/useButtonPress';

interface IconButtonProps {
  /**
   * The icon name from Ionicons
   */
  icon: ComponentProps<typeof Ionicons>['name'];

  /**
   * Callback when button is pressed
   */
  onPress: () => void;

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;

  /**
   * Background color (defaults to tint)
   */
  backgroundColor?: string;

  /**
   * Icon color (auto-computed from theme if not provided)
   */
  iconColor?: string;

  /**
   * Icon size (defaults to MEDIUM)
   */
  iconSize?: number;

  /**
   * Button variant
   * - 'default': Uses tint background
   * - 'danger': Uses error background
   */
  variant?: 'default' | 'danger';

  /**
   * Whether to use debouncing (useful for rapid clicks)
   */
  debounce?: boolean;

  /**
   * Type of haptic feedback
   * - 'light': Light haptic feedback (play buttons)
   * - 'selection': Selection haptic feedback (delete/action buttons)
   * - 'none': No haptic feedback
   */
  hapticType?: 'light' | 'selection' | 'none';

  /**
   * Additional icon style offset (e.g., for play icon alignment)
   */
  iconStyle?: TextStyle;

  /**
   * What the button does, for screen readers. An icon-only control has no
   * text to fall back on, so pass this wherever the icon isn't self-evident.
   */
  accessibilityLabel?: string;
}

// Internal constant for debounce duration
const DEBOUNCE_DURATION_MS = 300;

export const IconButton: FC<IconButtonProps> = ({
  icon,
  onPress,
  disabled = false,
  backgroundColor,
  iconColor,
  iconSize = LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
  variant = 'default',
  debounce = false,
  hapticType = 'selection',
  iconStyle,
  accessibilityLabel,
}) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Use shared button press hook
  const { handlePress, animatedStyle, handlePressIn, handlePressOut, rippleConfig, isDisabled } =
    useButtonPress({
      onPress,
      disabled,
      hapticType,
      debounce,
      debounceDuration: DEBOUNCE_DURATION_MS,
      animationOptions: { scaleAmount: PRESS_SCALE.STRONG },
    });

  // Determine colors with theme-aware defaults
  const resolvedBackgroundColor =
    backgroundColor ?? (variant === 'danger' ? colors.error : colors.tint);
  const resolvedIconColor = iconColor ?? (isDarkMode ? colors.text : colors.black);

  return (
    <Pressable
      style={styles.button}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      android_ripple={rippleConfig}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[
          styles.button,
          LAYOUT.ELEVATION.SUBTLE,
          { shadowColor: colors.shadow },
          animatedStyle as ViewStyle,
          {
            backgroundColor: resolvedBackgroundColor,
            opacity: isDisabled ? LAYOUT.OPACITY.MEDIUM : 1,
          },
        ]}
      >
        <Ionicons name={icon} size={iconSize} color={resolvedIconColor} style={iconStyle} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
    height: MIN_TOUCH_TARGET.MEDIUM,
    justifyContent: 'center',
    width: MIN_TOUCH_TARGET.MEDIUM,
  },
});
