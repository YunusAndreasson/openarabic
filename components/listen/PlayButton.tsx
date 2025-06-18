import { Ionicons } from '@expo/vector-icons';
import { useCallback, type FC, type ComponentProps } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';

import { ICON_BUTTON_PRESS_SCALE } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { BaseIconButtonProps } from '@/types/ui/button.types';
import { selectionFeedback } from '@/utils/haptics';

interface PlayButtonProps
  extends Omit<BaseIconButtonProps<ComponentProps<typeof Ionicons>['name']>, 'icon'> {
  isPlaying?: boolean;
  isLoading?: boolean;
  iconColor?: string;
}

function getIconName(isPlaying: boolean) {
  return isPlaying ? 'pause' : 'play';
}

const PlayButton: FC<PlayButtonProps> = ({
  onPress,
  isPlaying = false,
  isLoading = false,
  disabled = false,
  iconColor,
}) => {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    scaleAmount: ICON_BUTTON_PRESS_SCALE,
  });

  const handlePress = useCallback(() => {
    if (disabled || isLoading) return;

    selectionFeedback();
    onPress();
  }, [disabled, isLoading, onPress]);

  // Use filled style like PLAY ALL button - always tint background with white icon
  const backgroundColor = colors.tint;
  // Use iconColor prop if provided, otherwise use dark text/tint for contrast
  const resolvedIconColor = iconColor || colors.text;

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      style={styles.touchable}
      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
    >
      <Animated.View
        style={[
          styles.button,
          animatedStyle as ViewStyle,
          {
            backgroundColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={resolvedIconColor} />
        ) : (
          <Ionicons
            name={getIconName(isPlaying)}
            size={18}
            color={resolvedIconColor}
            style={styles.icon}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    ...LAYOUT.ELEVATION.SUBTLE,
    alignItems: 'center',
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2, // Circular
    height: MIN_TOUCH_TARGET.MEDIUM,
    justifyContent: 'center',
    width: MIN_TOUCH_TARGET.MEDIUM,
  },
  icon: {
    marginLeft: 1, // Slight optical adjustment for play icon
  },
});

export default PlayButton;
