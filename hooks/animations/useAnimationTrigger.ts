import { useState, useEffect, useCallback, useRef } from 'react';
import { runOnUI, isWorkletFunction } from 'react-native-reanimated';

import { handleError } from '@/utils/errorHandling';

/**
 * Return type for useAnimationTrigger hook
 */
export interface AnimationTriggerResult {
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
 * @param isLoading - Boolean indicating if data is still loading (default: false)
 * @param startAnimation - Callback function to execute when animations should start
 * @param delay - Delay in ms before starting animations (default: 0)
 * @returns AnimationTriggerResult
 */
export const useAnimationTrigger = (
  isDataReady: boolean,
  isLayoutReady = true,
  isLoading = false,
  startAnimation: () => void,
  inputDelay = 0
): AnimationTriggerResult => {
  // Validate delay parameter
  const delay = Math.max(0, inputDelay);

  const [animationsTriggered, setAnimationsTriggered] = useState(false);
  const [hasBeenReset, setHasBeenReset] = useState(false);

  // Use refs for immediate access to latest state without re-renders
  const isDataReadyRef = useRef(isDataReady);
  const isLayoutReadyRef = useRef(isLayoutReady);
  const isLoadingRef = useRef(isLoading);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const didStartAnimationsRef = useRef(false);
  const isMountedRef = useRef(true);

  // Keep refs in sync with props
  useEffect(() => {
    isDataReadyRef.current = isDataReady;
    isLayoutReadyRef.current = isLayoutReady;
    isLoadingRef.current = isLoading;
  }, [isDataReady, isLayoutReady, isLoading]);

  // Clear timeout helper function to avoid code duplication
  const clearAnimationTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Clear timeout on unmount and when dependencies change
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearAnimationTimeout();
    };
  }, [clearAnimationTimeout]);

  // Reset animations when data is not ready or loading starts
  useEffect(() => {
    if (!isDataReady || isLoading) {
      setAnimationsTriggered(false);
      didStartAnimationsRef.current = false;
      clearAnimationTimeout();
    }
  }, [isDataReady, isLoading, clearAnimationTimeout]);

  // Safe animation starter that checks for mounted state and runs on UI thread when possible
  const safeStartAnimation = useCallback(() => {
    if (isMountedRef.current && startAnimation) {
      try {
        if (isWorkletFunction(startAnimation)) {
          runOnUI(startAnimation)();
        } else {
          startAnimation();
        }
      } catch (e) {
        handleError(e instanceof Error ? e : String(e));
        startAnimation();
      }
    }
  }, [startAnimation]);

  // Function to trigger animations with optional delay
  const triggerAnimationsWithDelay = useCallback(() => {
    if (didStartAnimationsRef.current || !isMountedRef.current) return;

    // First clear any existing timeouts to prevent multiple triggers
    clearAnimationTimeout();

    setHasBeenReset(false);

    if (delay > 0) {
      // Only set didStartAnimationsRef to true AFTER the animation actually starts
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          didStartAnimationsRef.current = true;
          setAnimationsTriggered(true);
          safeStartAnimation();
        }
      }, delay);
    } else {
      didStartAnimationsRef.current = true;
      setAnimationsTriggered(true);
      safeStartAnimation();
    }
  }, [delay, clearAnimationTimeout, safeStartAnimation]);

  // Reset animation state
  const resetAnimations = useCallback(() => {
    if (!isMountedRef.current) return;

    setAnimationsTriggered(false);
    setHasBeenReset(true);
    didStartAnimationsRef.current = false;
    clearAnimationTimeout();
  }, [clearAnimationTimeout]);

  // Function to manually trigger animations
  const triggerAnimations = useCallback(() => {
    if (animationsTriggered || !isMountedRef.current) return;
    triggerAnimationsWithDelay();
  }, [animationsTriggered, triggerAnimationsWithDelay]);

  // Automatically trigger animations when both data and layout are ready
  useEffect(() => {
    if (
      !animationsTriggered &&
      isDataReady &&
      isLayoutReady &&
      !isLoading &&
      !didStartAnimationsRef.current &&
      !hasBeenReset &&
      isMountedRef.current
    ) {
      triggerAnimationsWithDelay();
    }
  }, [
    isDataReady,
    isLayoutReady,
    isLoading,
    animationsTriggered,
    triggerAnimationsWithDelay,
    hasBeenReset,
  ]);

  return {
    animationsTriggered,
    triggerAnimations,
    resetAnimations,
  };
};
