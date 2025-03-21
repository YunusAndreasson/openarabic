import { useEffect } from 'react';
import { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTransformAnimation } from './useTransformAnimation';
import { useOpacityAnimation } from './useOpacityAnimation';
import { TIMING_CONFIG } from './animationConfigs';
import { ViewStyle } from 'react-native';

/**
 * Hook for floating button animations that combines slide and opacity effects
 * @param isVisible - Whether the buttons should be visible
 * @returns Combined animated styles for back, bookmark, and play buttons
 */
export const useFloatingButtonAnimation = (isVisible: boolean) => {
  // Animation hooks
  const {
    value: backButtonValue,
    startAnimation: startBackButtonAnimation,
    reset: resetBackButtonAnimation,
  } = useTransformAnimation({
    type: 'slide',
    direction: 'left',
  });

  const {
    value: bookmarkButtonValue,
    startAnimation: startBookmarkButtonAnimation,
    reset: resetBookmarkButtonAnimation,
  } = useTransformAnimation({
    type: 'slide',
    direction: 'left',
  });

  const {
    value: playButtonValue,
    startAnimation: startPlayButtonAnimation,
    reset: resetPlayButtonAnimation,
  } = useTransformAnimation({
    type: 'slide',
    direction: 'right',
  });

  const { opacity: buttonsOpacity } = useOpacityAnimation({
    initialOpacity: 1,
    duration: TIMING_CONFIG.MEDIUM.duration,
  });

  // Combined animated styles
  const combinedBackButtonStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonsOpacity.value,
      transform: [{ translateX: backButtonValue.value }],
    };
  });

  const combinedBookmarkButtonStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonsOpacity.value,
      transform: [{ translateX: bookmarkButtonValue.value }],
    };
  });

  const combinedPlayButtonStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonsOpacity.value,
      transform: [{ translateX: playButtonValue.value }],
    };
  });

  // Update animations based on visibility
  useEffect(() => {
    // Simple fade animation
    buttonsOpacity.value = withTiming(isVisible ? 1 : 0, {
      duration: 200,
    });

    // Position animations
    if (isVisible) {
      startBackButtonAnimation();
      startBookmarkButtonAnimation();
      startPlayButtonAnimation();
    } else {
      resetBackButtonAnimation();
      resetBookmarkButtonAnimation();
      resetPlayButtonAnimation();
    }
  }, [
    isVisible,
    buttonsOpacity,
    startBackButtonAnimation,
    startBookmarkButtonAnimation,
    startPlayButtonAnimation,
    resetBackButtonAnimation,
    resetBookmarkButtonAnimation,
    resetPlayButtonAnimation,
  ]);

  return {
    combinedBackButtonStyle,
    combinedBookmarkButtonStyle,
    combinedPlayButtonStyle,
  };
};

export default useFloatingButtonAnimation;
