import { Ionicons } from '@expo/vector-icons';
import { useCallback, type ComponentProps, type FC } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ICON_BUTTON_PRESS_SCALE } from '@/constants/animation';
import { Theme } from '@/constants/colors';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useDebounce, usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useCurrentTheme, useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { BaseIconButtonProps } from '@/types/ui/button.types';
import { selectionFeedback } from '@/utils/haptics';

interface PlayButtonProps
  extends Omit<BaseIconButtonProps<ComponentProps<typeof Ionicons>['name']>, 'icon'> {
  isPlaying?: boolean;
  iconColor?: string;
  /** Whether to enable haptic feedback on press */
  hapticFeedback?: boolean;
  /** Debounce delay in milliseconds to prevent rapid successive presses */
  debounceMs?: number;
}

function getIconName(isPlaying: boolean) {
  return isPlaying ? 'pause' : 'play';
}

const PlayButton: FC<PlayButtonProps> = ({
  onPress,
  isPlaying = false,
  disabled = false,
  iconColor,
  hapticFeedback = true,
  debounceMs = 300,
}) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const currentTheme = useCurrentTheme();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    scaleAmount: ICON_BUTTON_PRESS_SCALE,
  });

  // Create the press handler with haptic feedback
  const pressHandler = useCallback(() => {
    if (disabled) return;
    if (hapticFeedback) {
      selectionFeedback();
    }
    onPress();
  }, [disabled, onPress, hapticFeedback]);

  // Apply debouncing to the press handler
  const [debouncedHandlePress, isDebouncing] = useDebounce(pressHandler, debounceMs);

  const backgroundColor = colors.tint;
  // Use appropriate icon color for each theme for optimal contrast
  const resolvedIconColor =
    iconColor ||
    (currentTheme === Theme.Sepia
      ? colors.white // Use white icon for sepia theme for better contrast on amber background
      : isDarkMode
      ? colors.black
      : colors.text);

  return (
    <Pressable
      style={styles.button}
      onPress={debouncedHandlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || isDebouncing}
      hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      android_ripple={{ color: colors.navigationRipple, radius: MIN_TOUCH_TARGET.MEDIUM / 2 }}
    >
      <Animated.View
        style={[
          styles.button,
          animatedStyle as ViewStyle,
          {
            backgroundColor,
            opacity: disabled || isDebouncing ? LAYOUT.OPACITY.MEDIUM : 1,
          },
        ]}
      >
        <Ionicons
          name={getIconName(isPlaying)}
          size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
          color={resolvedIconColor}
          style={styles.icon}
        />
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
  icon: {
    marginLeft: LAYOUT.SPACING.MICRO,
  },
});

export default PlayButton;
