import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { SPRING_CONFIG, TIMING_CONFIG } from './animationConfigs';

/**
 * Hook for toggle component animations with translation and scale effects
 * @param isActive - Current state of the toggle
 * @param travelDistance - Distance the toggle handle should travel
 * @returns Animation controls and styles for the toggle
 */
export const useToggleAnimation = (isActive: boolean, travelDistance: number) => {
  const translateX = useSharedValue(isActive ? travelDistance : 0);
  const toggleScale = useSharedValue(1);

  // Update animation when value changes
  useEffect(() => {
    // Use spring for smoother, more natural movement
    translateX.value = withSpring(isActive ? travelDistance : 0, SPRING_CONFIG.TOGGLE);

    // Add subtle scale animation for better feedback
    toggleScale.value = withSequence(
      withTiming(0.95, {
        duration: TIMING_CONFIG.FAST.duration,
        easing: TIMING_CONFIG.FAST.easing,
      }),
      withTiming(1, {
        duration: TIMING_CONFIG.FAST.duration,
        easing: TIMING_CONFIG.FAST.easing,
      })
    );
  }, [isActive, translateX, travelDistance, toggleScale]);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: toggleScale.value }],
    };
  });

  const handleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return {
    containerAnimatedStyle,
    handleAnimatedStyle,
    translateX,
    toggleScale,
  };
};
