import { useEffect, useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import { PRESS_SCALE, SPRING_CONFIG, TIMING_CONFIG } from '@/constants/animation';

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
  travelDistance: number,
): ToggleAnimationResult => {
  const translateX = useSharedValue(isActive ? travelDistance : 0);
  const toggleScale = useSharedValue(1);

  // Create animation worklet that can run on UI thread
  const animateToggle = useCallback(
    (toActive: boolean, distance: number) => {
      'worklet';

      // Use spring for smoother, more natural movement
      translateX.set(withSpring(toActive ? distance : 0, SPRING_CONFIG.TOGGLE));

      // Add subtle scale animation for better feedback
      toggleScale.set(
        withSequence(
          withTiming(PRESS_SCALE.MODERATE, {
            duration: TIMING_CONFIG.FAST.duration,
            easing: TIMING_CONFIG.FAST.easing,
          }),
          withTiming(1, {
            duration: TIMING_CONFIG.FAST.duration,
            easing: TIMING_CONFIG.FAST.easing,
          }),
        ),
      );
    },
    [translateX, toggleScale],
  );

  // Function to immediately set toggle state without animation
  const forceAnimateToInitialState = useCallback(
    (toActive: boolean) => {
      'worklet';
      translateX.set(toActive ? travelDistance : 0);
      toggleScale.set(1);
    },
    [translateX, toggleScale, travelDistance],
  );

  // Update animation when value changes
  useEffect(() => {
    // Run animation on UI thread
    scheduleOnUI(animateToggle, isActive, travelDistance);
  }, [isActive, travelDistance, animateToggle]);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: toggleScale.get() }],
    };
  });

  const handleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.get() }],
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
