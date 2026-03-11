import { useCallback, useMemo } from 'react';
import type { PanGesture } from 'react-native-gesture-handler';
import { Gesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
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

  // JS-only callback for swipe actions (reset stays on UI thread)
  const handleSwipeAction = useCallback(
    (isRight: boolean) => {
      if (isRight) {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }

      if (onSwipeComplete) {
        onSwipeComplete(isRight);
      }
    },
    [onSwipeLeft, onSwipeRight, onSwipeComplete],
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
              // Fire JS callbacks for business logic
              scheduleOnRN(handleSwipeAction, isRight);
              // Reset position entirely on UI thread (no JS bridge round-trip)
              isAnimatingRef.set(true);
              translateX.set(
                withDelay(
                  GESTURE_CONSTANTS.RESET_DELAY,
                  withSpring(0, springConfig, () => {
                    isAnimatingRef.set(false);
                  }),
                ),
              );
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
      handleSwipeAction,
      maxTranslationRatio,
      swipeThresholdRatio,
      springConfig,
      onGestureBegin,
      onGestureStart,
      onGestureEnd,
    ],
  );

  return {
    gesture,
    translateX,
    isAnimatingRef,
    resetPosition,
  };
};
