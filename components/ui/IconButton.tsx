import { Ionicons } from '@expo/vector-icons';
import { useCallback, type ComponentProps, type FC } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ICON_BUTTON_PRESS_SCALE } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useDebounce, usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { lightFeedback, selectionFeedback } from '@/utils/haptics';
import { createAndroidRipple } from '@/utils/layoutUtils';

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
   * Debounce duration in ms
   */
  debounceDuration?: number;

  /**
   * Type of haptic feedback
   * - 'light': Light haptic feedback (play buttons)
   * - 'selection': Selection haptic feedback (delete/action buttons)
   */
  hapticType?: 'light' | 'selection';

  /**
   * Additional icon style offset (e.g., for play icon alignment)
   */
  iconStyle?: TextStyle;
}

const IconButton: FC<IconButtonProps> = ({
  icon,
  onPress,
  disabled = false,
  backgroundColor,
  iconColor,
  iconSize = LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
  variant = 'default',
  debounce = false,
  debounceDuration = 300,
  hapticType = 'selection',
  iconStyle,
}) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    scaleAmount: ICON_BUTTON_PRESS_SCALE,
  });

  // Create the press handler with haptic feedback
  const pressHandler = useCallback(() => {
    if (disabled) return;

    // Trigger appropriate haptic feedback
    if (hapticType === 'light') {
      lightFeedback();
    } else {
      selectionFeedback();
    }

    onPress();
  }, [disabled, onPress, hapticType]);

  // Always call useDebounce hook (hooks must be called unconditionally)
  const [debouncedHandlePress, isDebouncing] = useDebounce(pressHandler, debounceDuration);

  // Use the appropriate handler based on debounce setting
  const finalHandler = debounce ? debouncedHandlePress : pressHandler;
  const finalDisabled = disabled || (debounce && isDebouncing);

  // Determine colors with theme-aware defaults
  const resolvedBackgroundColor =
    backgroundColor ?? (variant === 'danger' ? colors.error : colors.tint);
  const resolvedIconColor = iconColor ?? (isDarkMode ? colors.text : colors.black);

  return (
    <Pressable
      style={styles.button}
      onPress={finalHandler}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={finalDisabled}
      hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      android_ripple={createAndroidRipple(colors)}
    >
      <Animated.View
        style={[
          styles.button,
          animatedStyle as ViewStyle,
          {
            backgroundColor: resolvedBackgroundColor,
            opacity: finalDisabled ? LAYOUT.OPACITY.MEDIUM : 1,
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
    ...LAYOUT.ELEVATION.SUBTLE,
    alignItems: 'center',
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
    height: MIN_TOUCH_TARGET.MEDIUM,
    justifyContent: 'center',
    width: MIN_TOUCH_TARGET.MEDIUM,
  },
});

export default IconButton;
