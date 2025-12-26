import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { PanGesture } from 'react-native-gesture-handler';
import { Gesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { SPRING_CONFIG } from '@/constants/animation';
import { SCREEN_WIDTH } from '@/constants/layout';
import { GESTURE_CONFIG, GESTURE_CONSTANTS } from '@/utils/gestureUtils';

export interface SwipeGestureOptions {
  enabled?: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeComplete?: (isRight: boolean) => void;
  onGestureBegin?: () => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
  minDistance?: number;
  activeOffsetX?: [number, number];
  swipeThresholdRatio?: number;
  maxTranslationRatio?: number;
  springConfig?: typeof SPRING_CONFIG.CARD;
}

export interface SwipeGestureResult {
  gesture: PanGesture;
  translateX: SharedValue<number>;
  isAnimatingRef: SharedValue<boolean>;
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
    onGestureBegin,
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
    isAnimatingRef.set(true);
    translateX.set(
      withSpring(0, springConfig, () => {
        isAnimatingRef.set(false);
      }),
    );
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
    [onSwipeLeft, onSwipeRight, onSwipeComplete, resetPosition],
  );

  // Optimized gesture handler with v2 best practices
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .minDistance(minDistance)
        .activeOffsetX(activeOffsetX)
        .onBegin(() => {
          'worklet';
          if (onGestureBegin) {
            scheduleOnRN(onGestureBegin);
          }
        })
        .onStart(() => {
          'worklet';
          if (onGestureStart) {
            scheduleOnRN(onGestureStart);
          }
        })
        .onUpdate(event => {
          'worklet';
          if (!isAnimatingRef.get() && event.translationX !== undefined) {
            // Inline clamping logic for better performance
            const maxTranslation = SCREEN_WIDTH * maxTranslationRatio;
            const clampedTranslation = Math.max(
              -maxTranslation,
              Math.min(maxTranslation, event.translationX),
            );
            translateX.set(clampedTranslation);
          }
        })
        .onEnd(event => {
          'worklet';
          if (
            !isAnimatingRef.get() &&
            event.translationX !== undefined &&
            event.velocityX !== undefined
          ) {
            const translationX = event.translationX;
            const velocityX = event.velocityX;

            // Call end callback before processing swipe
            if (onGestureEnd) {
              scheduleOnRN(onGestureEnd);
            }

            // Inline swipe action logic
            const swipeThreshold = SCREEN_WIDTH * swipeThresholdRatio;
            const hasSignificantVelocity =
              Math.abs(velocityX) > GESTURE_CONSTANTS.VELOCITY_THRESHOLD;

            if (Math.abs(translationX) > swipeThreshold || hasSignificantVelocity) {
              const isRight = translationX > 0;
              // Trigger swipe completion immediately for snappy response
              scheduleOnRN(handleSwipeComplete, isRight);
            } else {
              // Simple reset on UI thread with spring animation
              isAnimatingRef.set(true);
              translateX.set(
                withSpring(0, springConfig, () => {
                  isAnimatingRef.set(false);
                }),
              );
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
      onGestureBegin,
      onGestureStart,
      onGestureEnd,
    ],
  );

  // Cleanup timer on unmount to prevent stale callbacks after app resume
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, []);

  return {
    gesture,
    translateX,
    isAnimatingRef,
    resetPosition,
  };
};
