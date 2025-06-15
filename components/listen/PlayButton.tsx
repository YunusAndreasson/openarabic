import { Ionicons } from '@expo/vector-icons';
import { useCallback, type FC, type ComponentProps } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';

import { MIN_TOUCH_TARGET } from '@/constants/layout';
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

const PlayButton: FC<PlayButtonProps> = ({
  onPress,
  isPlaying = false,
  isLoading = false,
  disabled = false,
  iconColor,
}) => {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    scaleAmount: 0.9,
  });

  const handlePress = useCallback(() => {
    if (disabled || isLoading) return;

    selectionFeedback();
    onPress();
  }, [disabled, isLoading, onPress]);

  const getIconName = () => {
    return isPlaying ? 'pause' : 'play';
  };

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
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
      accessibilityHint={isPlaying ? 'Pause the audio playback' : 'Start playing this article'}
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
          <Ionicons name={getIconName()} size={18} color={resolvedIconColor} style={styles.icon} />
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
    elevation: 2,
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
