import { useLayoutReady } from './useLayoutReady';
import { useOpacityAnimation } from './animations';
import { useAnimationTrigger } from './useAnimationTrigger';
import { useCallback } from 'react';
import { AnimatedStyle } from '@/hooks/animations/types';

/**
 * Return type for useScreenAnimation hook
 */
interface ScreenAnimationResult {
  /** Whether layout calculations are complete */
  isLayoutReady: boolean;
  /** Whether animations have been triggered */
  animationsTriggered: boolean;
  /** Animated style for fade-in effect */
  fadeInStyle: AnimatedStyle<any>;
  /** Function to manually trigger animations */
  triggerAnimations: () => void;
  /** Function to reset animation state */
  resetAnimations: () => void;
  /** Function to reset all states (layout and animations) */
  reset: () => void;
  /** Helper for conditional rendering */
  shouldRenderAnimatedContent: boolean;
}

/**
 * Combined hook for screen animations
 * Integrates layout readiness, fade-in animation, and animation triggering
 *
 * @param isDataReady - Boolean indicating if data is ready
 * @param isLoading - Boolean indicating if loading is in progress (default: false)
 * @param animationDuration - Duration of the fade-in animation in ms (default: 300)
 * @param layoutDelay - Delay in ms before marking layout as ready (default: 0)
 * @param animationDelay - Delay in ms before starting animation (default: 0)
 * @returns Object with animation state and styles
 */
export const useScreenAnimation = (
  isDataReady: boolean,
  isLoading = false,
  animationDuration = 300,
  layoutDelay = 0,
  animationDelay = 0
): ScreenAnimationResult => {
  // Get layout ready state
  const { isLayoutReady, resetLayout } = useLayoutReady(layoutDelay);

  // Get fade-in animation
  const {
    animatedStyle: fadeInStyle,
    startAnimation: startFadeIn,
    opacity,
  } = useOpacityAnimation({
    initialOpacity: 0,
    duration: animationDuration,
  });

  // Get animation trigger
  const { animationsTriggered, triggerAnimations, resetAnimations } = useAnimationTrigger(
    isDataReady,
    isLayoutReady,
    isLoading,
    startFadeIn,
    animationDelay
  );

  // Reset all animation states
  const reset = useCallback(() => {
    resetLayout();
    resetAnimations();
    opacity.value = 0;
  }, [resetLayout, resetAnimations, opacity]);

  return {
    isLayoutReady,
    animationsTriggered,
    fadeInStyle,
    triggerAnimations,
    resetAnimations,
    reset,
    // Helper for conditional rendering
    shouldRenderAnimatedContent: isLayoutReady && (animationsTriggered || isDataReady),
  };
};
