import { useEffect } from 'react';
import { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSlideAnimation } from './useSlideAnimation';
import { useOpacityAnimation } from './useOpacityAnimation';
import { TIMING_CONFIG } from './animationConfigs';

/**
 * Hook for floating button animations that combines slide and opacity effects
 * @param isVisible - Whether the buttons should be visible
 * @returns Combined animated styles for back, bookmark, and play buttons
 */
export const useFloatingButtonAnimation = (isVisible: boolean) => {
  // Animation hooks
  const {
    animatedStyle: backButtonAnimatedStyle,
    startAnimation: startBackButtonAnimation,
    reset: resetBackButtonAnimation,
  } = useSlideAnimation(0, undefined, undefined, 'left');

  const {
    animatedStyle: bookmarkButtonAnimatedStyle,
    startAnimation: startBookmarkButtonAnimation,
    reset: resetBookmarkButtonAnimation,
  } = useSlideAnimation(0, undefined, undefined, 'left');

  const {
    animatedStyle: playButtonAnimatedStyle,
    startAnimation: startPlayButtonAnimation,
    reset: resetPlayButtonAnimation,
  } = useSlideAnimation(0, undefined, undefined, 'right');

  const { opacity: buttonsOpacity } = useOpacityAnimation({
    initialOpacity: 1,
    duration: TIMING_CONFIG.MEDIUM.duration,
  });

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

  const combinedPlayButtonStyle = useAnimatedStyle(
    () => ({
      transform: [...(playButtonAnimatedStyle.transform || [])],
      opacity: buttonsOpacity.value,
    }),
    [playButtonAnimatedStyle, buttonsOpacity]
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
