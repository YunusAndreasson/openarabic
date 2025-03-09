import { useCallback, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { springConfig } from './useButtonAnimation';

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
    translateX.value = withSpring(isActive ? travelDistance : 0, {
      ...springConfig,
      mass: 0.5, // Lower mass for quicker response
      damping: 15, // Slightly higher damping for less bounce
      stiffness: 120, // Increased stiffness for faster animation
    });

    // Add subtle scale animation for better feedback
    toggleScale.value = withSequence(
      withTiming(0.95, { duration: 100, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 150, easing: Easing.inOut(Easing.quad) })
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
  };
};
