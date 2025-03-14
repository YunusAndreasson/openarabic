import { useEffect } from 'react';
import { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSlideAnimation } from './useSlideAnimation';
import { useOpacityAnimation } from './useOpacityAnimation';
import { TIMING_CONFIG } from './animationConfigs';

/**
 * Hook for floating button animations that combines slide and opacity effects
 * @param isVisible - Whether the buttons should be visible
 * @returns Combined animated styles for back and bookmark buttons
 */
export const useFloatingButtonAnimation = (isVisible: boolean) => {
  // Animation hooks
  const {
    animatedStyle: backButtonAnimatedStyle,
    startAnimation: startBackButtonAnimation,
    reset: resetBackButtonAnimation,
  } = useSlideAnimation(0, 20, 100, 'left');

  const {
    animatedStyle: bookmarkButtonAnimatedStyle,
    startAnimation: startBookmarkButtonAnimation,
    reset: resetBookmarkButtonAnimation,
  } = useSlideAnimation(0, 20, 100, 'left');

  const { opacity: buttonsOpacity } = useOpacityAnimation(1, TIMING_CONFIG.MEDIUM.duration);

  // Combined animated styles
  const combinedBackButtonStyle = useAnimatedStyle(
    () => ({
      transform: [...(backButtonAnimatedStyle.transform || [])],
      opacity: buttonsOpacity.value,
    }),
    [backButtonAnimatedStyle, buttonsOpacity]
  );

  const combinedBookmarkButtonStyle = useAnimatedStyle(
    () => ({
      transform: [...(bookmarkButtonAnimatedStyle.transform || [])],
      opacity: buttonsOpacity.value,
    }),
    [bookmarkButtonAnimatedStyle, buttonsOpacity]
  );

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
    } else {
      resetBackButtonAnimation();
      resetBookmarkButtonAnimation();
    }
  }, [
    isVisible,
    buttonsOpacity,
    startBackButtonAnimation,
    startBookmarkButtonAnimation,
    resetBackButtonAnimation,
    resetBookmarkButtonAnimation,
  ]);

  return {
    combinedBackButtonStyle,
    combinedBookmarkButtonStyle,
  };
};

export default useFloatingButtonAnimation;
