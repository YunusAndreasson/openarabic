import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

/**
 * Hook for creating a pulse animation effect
 * @param pulseMagnitude - Maximum scale during pulse (default 1.1)
 * @returns Animation controls and style
 */
export const usePulseAnimation = (pulseMagnitude = 1.1) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const pulse = () => {
    scale.value = 1;
    scale.value = withTiming(pulseMagnitude, { duration: 150 }, () => {
      scale.value = withTiming(1, { duration: 150 });
    });
  };

  return {
    animatedStyle,
    pulse,
    scale,
  };
};
