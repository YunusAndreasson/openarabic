import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
} from 'react-native-reanimated';
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

  // Improved pulse function with worklet directive
  const pulse = () => {
    'worklet';
    // Reset to initial state
    scale.value = 1;

    // Use withSequence for smoother animation
    scale.value = withSequence(
      // Grow to pulseMagnitude
      withTiming(pulseMagnitude, {
        duration: TIMING_CONFIG.FAST.duration,
      }),
      // Shrink back to normal
      withTiming(1, {
        duration: TIMING_CONFIG.FAST.duration,
      })
    );
  };

  // Continuous pulse animation
  const startContinuousPulse = (repetitions = 3) => {
    'worklet';
    scale.value = 1;
    scale.value = withRepeat(
      withSequence(
        withTiming(pulseMagnitude, {
          duration: TIMING_CONFIG.FAST.duration,
        }),
        withTiming(1, {
          duration: TIMING_CONFIG.FAST.duration,
        })
      ),
      repetitions,
      false // Don't reverse the animation
    );
  };

  return {
    animatedStyle,
    pulse,
    startContinuousPulse,
    scale,
  };
};
