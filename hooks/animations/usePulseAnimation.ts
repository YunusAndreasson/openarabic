import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { TIMING_CONFIG } from './animationConfigs';

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
    'worklet';
    scale.value = 1;
    scale.value = withTiming(pulseMagnitude, { duration: TIMING_CONFIG.FAST.duration }, () => {
      scale.value = withTiming(1, { duration: TIMING_CONFIG.FAST.duration });
    });
  };

  return {
    animatedStyle,
    pulse,
    scale,
  };
};
