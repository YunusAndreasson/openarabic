import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Return type for useAnimationTrigger hook
 */
interface AnimationTriggerResult {
  /** Whether animations have been triggered */
  animationsTriggered: boolean;
  /** Function to manually trigger animations */
  triggerAnimations: () => void;
  /** Function to reset animation state */
  resetAnimations: () => void;
}

/**
 * Hook to manage animation triggers based on data and layout readiness
 * Ensures animations only start when both data and layout are ready
 *
 * @param isDataReady - Boolean indicating if data is ready
 * @param isLayoutReady - Boolean indicating if layout is ready (default: true)
 * @param isLoading - Boolean indicating if loading is in progress (default: false)
 * @param startAnimation - Function to start the animation
 * @param delay - Delay in ms before starting animation (default: 0)
 * @returns Object with animation state and control functions
 */
export const useAnimationTrigger = (
  isDataReady: boolean,
  isLayoutReady = true,
  isLoading = false,
  startAnimation: () => void,
  delay = 0
): AnimationTriggerResult => {
  const [animationsTriggered, setAnimationsTriggered] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  const resetRef = useRef(false);

  // Reset animations when data changes
  useEffect(() => {
    if (!isDataReady || isLoading) {
      setAnimationsTriggered(false);
    }
  }, [isDataReady, isLoading]);

  // Trigger animations when data and layout are ready
  useEffect(() => {
    // Clear any existing timeouts
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = undefined;
    }

    // Don't trigger animations if reset was called
    if (resetRef.current) {
      resetRef.current = false;
      return;
    }

    if (isDataReady && !animationsTriggered && !isLoading && isLayoutReady) {
      if (delay > 0) {
        animationTimeoutRef.current = setTimeout(() => {
          startAnimation();
          setAnimationsTriggered(true);
        }, delay);
      } else {
        startAnimation();
        setAnimationsTriggered(true);
      }
    }

    // Cleanup function
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = undefined;
      }
    };
  }, [isDataReady, animationsTriggered, isLoading, isLayoutReady, startAnimation, delay]);

  // Function to manually trigger animations
  const triggerAnimations = useCallback(() => {
    if (!animationsTriggered) {
      startAnimation();
      setAnimationsTriggered(true);
    }
  }, [animationsTriggered, startAnimation]);

  // Function to reset animation state
  const resetAnimations = useCallback(() => {
    // Clear any existing timeouts
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = undefined;
    }

    // Set reset flag to prevent immediate re-triggering
    resetRef.current = true;

    // Force state update to ensure it's reflected immediately
    setAnimationsTriggered(false);
  }, []);

  return {
    animationsTriggered,
    triggerAnimations,
    resetAnimations,
  };
};
