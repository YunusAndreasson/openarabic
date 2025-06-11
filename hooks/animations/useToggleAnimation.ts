 
import { useEffect, useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnUI,
  useWorkletCallback,
  type SharedValue,
} from 'react-native-reanimated';

import { SPRING_CONFIG, TIMING_CONFIG } from './animationConfigs';

interface ToggleAnimationResult {
  containerAnimatedStyle: { transform: { scale: number }[] };
  handleAnimatedStyle: { transform: { translateX: number }[] };
  translateX: SharedValue<number>;
  toggleScale: SharedValue<number>;
  forceAnimateToInitialState: (toActive: boolean) => void;
}

/**
 * Hook for toggle component animations with translation and scale effects
 * @param isActive - Current state of the toggle
 * @param travelDistance - Distance the toggle handle should travel
 * @returns Animation controls and styles for the toggle
 */
export const useToggleAnimation = (
  isActive: boolean,
  travelDistance: number
): ToggleAnimationResult => {
  const translateX = useSharedValue(isActive ? travelDistance : 0);
  const toggleScale = useSharedValue(1);

  // Create animation worklet that can run on UI thread
  const animateToggle = useWorkletCallback(
    (toActive: boolean, distance: number) => {
      'worklet';

      // Use spring for smoother, more natural movement
      translateX.value = withSpring(
        toActive ? distance : 0,
        SPRING_CONFIG.TOGGLE
      );

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
    },
    [translateX, toggleScale]
  );

  // Function to immediately set toggle state without animation
  const forceAnimateToInitialState = useCallback(
    (toActive: boolean) => {
      'worklet';
      translateX.value = toActive ? travelDistance : 0;
      toggleScale.value = 1;
    },
    [translateX, toggleScale, travelDistance]
  );

  // Update animation when value changes
  useEffect(() => {
    // Run animation on UI thread
    runOnUI(animateToggle)(isActive, travelDistance);
  }, [isActive, travelDistance]);

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
    forceAnimateToInitialState,
  };
};
