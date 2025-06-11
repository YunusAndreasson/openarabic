import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { lightFeedback } from '@/utils/haptics';

interface PlayButtonProps {
  onPress: () => void;
  isPlaying?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
}

const PlayButton: React.FC<PlayButtonProps> = ({
  onPress,
  isPlaying = false,
  isLoading = false,
  disabled = false,
}) => {
  const colors = useColors();
  const scale = useSharedValue(1);

  const handlePress = React.useCallback(() => {
    if (disabled || isLoading) return;

    lightFeedback();

    // Scale animation for press feedback
    scale.value = withTiming(0.9, { duration: 100 }, () => {
      scale.value = withTiming(1, { duration: 100 });
    });

    onPress();
  }, [disabled, isLoading, onPress, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getIconName = () => {
    return isPlaying ? 'pause' : 'play';
  };

  // Use filled style like PLAY ALL button - always tint background with white icon
  const backgroundColor = colors.tint;
  const iconColor = colors.white;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      style={styles.touchable}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
      accessibilityHint={isPlaying ? 'Pause the audio playback' : 'Start playing this article'}
    >
      <Animated.View
        style={[
          styles.button,
          animatedStyle,
          {
            backgroundColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={getIconName()} size={18} color={iconColor} style={styles.icon} />
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
    ...LAYOUT.SHADOW.SMALL,
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
