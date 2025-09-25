import { useCallback, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, withSpring } from 'react-native-reanimated';

import { SPRING_CONFIG } from '@/constants/animation';
import { SCREEN_WIDTH } from '@/constants/layout';
import { GESTURE_CONFIG, GESTURE_CONSTANTS } from '@/utils/gestureUtils';

export interface SwipeGestureOptions {
  enabled?: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeComplete?: (isRight: boolean) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
  minDistance?: number;
  activeOffsetX?: [number, number];
  swipeThresholdRatio?: number;
  maxTranslationRatio?: number;
  springConfig?: typeof SPRING_CONFIG.CARD;
}

export interface SwipeGestureResult {
  gesture: any;
  translateX: any;
  isAnimatingRef: any;
  resetPosition: () => void;
}

/**
 * Custom hook for swipe gestures with v2 optimizations
 * Provides consistent swipe behavior across components
 */
export const useSwipeGesture = (options: SwipeGestureOptions): SwipeGestureResult => {
  const {
    enabled = true,
    onSwipeLeft,
    onSwipeRight,
    onSwipeComplete,
    onGestureStart,
    onGestureEnd,
    minDistance = GESTURE_CONFIG.MIN_DISTANCE,
    activeOffsetX = GESTURE_CONFIG.ACTIVE_OFFSET_X,
    swipeThresholdRatio = GESTURE_CONSTANTS.SWIPE_THRESHOLD_RATIO,
    maxTranslationRatio = GESTURE_CONSTANTS.MAX_TRANSLATION_RATIO,
    springConfig = SPRING_CONFIG.CARD,
  } = options;

  const translateX = useSharedValue(0);
  const isAnimatingRef = useSharedValue(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Optimized reset function (worklet-ready)
  const resetPosition = useCallback(() => {
    'worklet';
    isAnimatingRef.value = true;
    translateX.value = withSpring(0, springConfig, () => {
      isAnimatingRef.value = false;
    });
  }, [translateX, isAnimatingRef, springConfig]);

  // Optimized swipe handler with minimal JS bridging
  const handleSwipeComplete = useCallback(
    (isRight: boolean) => {
      // Trigger the swipe action immediately
      if (isRight) {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }

      // Call optional completion handler
      if (onSwipeComplete) {
        onSwipeComplete(isRight);
      }

      // Reset position after a brief delay
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(() => {
        resetPosition();
      }, GESTURE_CONSTANTS.RESET_DELAY);
    },
    [onSwipeLeft, onSwipeRight, onSwipeComplete, resetPosition]
  );

  // Optimized gesture handler with v2 best practices
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .minDistance(minDistance)
        .activeOffsetX(activeOffsetX)
        .onStart(() => {
          'worklet';
          if (onGestureStart) {
            runOnJS(onGestureStart)();
          }
        })
        .onUpdate(event => {
          'worklet';
          if (!isAnimatingRef.value && event.translationX !== undefined) {
            // Inline clamping logic for better performance
            const maxTranslation = SCREEN_WIDTH * maxTranslationRatio;
            const clampedTranslation = Math.max(
              -maxTranslation,
              Math.min(maxTranslation, event.translationX)
            );
            translateX.value = clampedTranslation;
          }
        })
        .onEnd(event => {
          'worklet';
          if (!isAnimatingRef.value && event.translationX !== undefined) {
            const translationX = event.translationX;

            // Call end callback before processing swipe
            if (onGestureEnd) {
              runOnJS(onGestureEnd)();
            }

            // Inline swipe action logic
            const swipeThreshold = SCREEN_WIDTH * swipeThresholdRatio;
            if (Math.abs(translationX) > swipeThreshold) {
              const isRight = translationX > 0;
              runOnJS(handleSwipeComplete)(isRight);
            } else {
              // Simple reset on UI thread with spring animation
              isAnimatingRef.value = true;
              translateX.value = withSpring(0, springConfig, () => {
                isAnimatingRef.value = false;
              });
            }
          }
        }),
    [
      enabled,
      minDistance,
      activeOffsetX,
      isAnimatingRef,
      translateX,
      handleSwipeComplete,
      maxTranslationRatio,
      swipeThresholdRatio,
      springConfig,
      onGestureStart,
      onGestureEnd,
    ]
  );

  return {
    gesture,
    translateX,
    isAnimatingRef,
    resetPosition,
  };
};
