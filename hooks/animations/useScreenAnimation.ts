import { useCallback, useRef, useEffect } from 'react';
import { useLayoutReady } from '../useLayoutReady';
import { useOpacityAnimation } from './useOpacityAnimation';
import { useAnimationTrigger } from './useAnimationTrigger';
import { AnimatedStyle } from './types';
import { runOnUI } from 'react-native-reanimated';

/**
 * Return type for useScreenAnimation hook
 */
export interface ScreenAnimationResult {
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
 * Hook for managing screen animations and layout readiness
 * Coordinates the timing of animations to ensure they happen after data and layout are ready
 *
 * @param isDataReady - Boolean indicating if data is ready to animate
 * @param isLoading - Boolean indicating if data is still loading (default: false)
 * @param animationDuration - Duration of the fade-in animation in ms (default: 50ms for snappier transitions)
 * @param layoutDelay - Delay in ms before layout is considered ready (default: 0)
 * @param animationDelay - Delay in ms before starting animations (default: 0)
 * @returns ScreenAnimationResult
 */
export const useScreenAnimation = (
  isDataReady: boolean,
  isLoading = false,
  animationDuration = 50,
  layoutDelay = 0,
  animationDelay = 0
): ScreenAnimationResult => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Manages layout readiness with optional delay
  const { isLayoutReady, resetLayout } = useLayoutReady(layoutDelay);

  // Setup opacity animation (starts at 0)
  const {
    animatedStyle: fadeInStyle,
    setOpacity,
    reset: resetOpacity,
  } = useOpacityAnimation({
    initialOpacity: 0,
    duration: animationDuration,
  });

  // Function to start the fade-in animation - ensure it's a worklet
  const startFadeInAnimation = useCallback(() => {
    if (!isMountedRef.current) return;

    // Ensure this runs on the UI thread
    runOnUI(() => {
      'worklet';
      setOpacity(1);
    })();
  }, [setOpacity]);

  // Trigger animations when both data and layout are ready
  const { animationsTriggered, triggerAnimations, resetAnimations } = useAnimationTrigger(
    isDataReady,
    isLayoutReady,
    isLoading,
    startFadeInAnimation,
    animationDelay
  );

  // Reset all animations and layout state
  const reset = useCallback(() => {
    resetAnimations();
    resetLayout();
    // Ensure opacity reset runs on the UI thread
    runOnUI(() => {
      'worklet';
      resetOpacity();
    })();
  }, [resetAnimations, resetLayout, resetOpacity]);

  // Helper for conditional rendering - only show content when layout is ready
  const shouldRenderAnimatedContent = isLayoutReady;

  return {
    isLayoutReady,
    animationsTriggered,
    fadeInStyle,
    triggerAnimations,
    resetAnimations,
    reset,
    shouldRenderAnimatedContent,
  };
};
