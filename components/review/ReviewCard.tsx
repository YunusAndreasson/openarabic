import React, { useCallback, memo, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import { WORD_AREA_MIN_HEIGHT, useScreenWidth } from '@/constants/layout';
import type { AnimatedStyleProp } from '@/types/ui/base.types';


import WordDisplay from './WordDisplay';

// Animation config constants
const SWIPE_THRESHOLD_RATIO = 0.04;
const RESET_CONFIG = { duration: 150 }; // Faster reset animation

// Styles moved outside component
const styles = StyleSheet.create({
  swipeContainer: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  wordContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: WORD_AREA_MIN_HEIGHT,
    width: '100%',
  },
});

interface ReviewCardProps {
  word: string;
  fontSize: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
  isUpdating: boolean;
  isTransitioning: boolean;
  opacityStyle: AnimatedStyleProp<ViewStyle>;
}

const ReviewCard = memo(function ReviewCard({
  word,
  fontSize,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  isUpdating,
  isTransitioning,
  opacityStyle,
}: ReviewCardProps) {
  // Animation values
  const translateX = useSharedValue(0);
  const isAnimatingRef = useSharedValue(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenWidth = useScreenWidth();
  const SWIPE_THRESHOLD = screenWidth * SWIPE_THRESHOLD_RATIO;

  // Reset position function with callback
  const resetPosition = useCallback(() => {
    translateX.value = withTiming(0, RESET_CONFIG, finished => {
      if (finished) {
        isAnimatingRef.value = false;
      }
    });
  }, [translateX, isAnimatingRef]);

  // Handle swipe completion
  const handleSwipeComplete = useCallback(
    (isRight: boolean) => {
      isAnimatingRef.value = true;
      // First trigger the swipe action (which will start fading out)
      runOnJS(isRight ? onSwipeRight : onSwipeLeft)();
      // Then reset position after a short delay
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(() => {
        if (isAnimatingRef.value) {
          // Only reset if still animating
          runOnJS(resetPosition)();
        }
      }, 50);
    },
    [isAnimatingRef, onSwipeLeft, onSwipeRight, resetPosition]
  );

  // Create pan gesture - memoized
  const panGesture = useCallback(
    () =>
      Gesture.Pan()
        .enabled(!isUpdating && !isTransitioning && !isAnimatingRef.value)
        .minDistance(0.1)
        .activeOffsetX([-1, 1])
        .onUpdate(event => {
          if (!isUpdating && !isTransitioning && !isAnimatingRef.value) {
            translateX.value = event.translationX;
          }
        })
        .onEnd(event => {
          if (!isAnimatingRef.value && Math.abs(event.translationX) > SWIPE_THRESHOLD) {
            const isRight = event.translationX > 0;
            runOnJS(handleSwipeComplete)(isRight);
          } else {
            runOnJS(resetPosition)();
          }
        }),
    [
      isUpdating,
      isTransitioning,
      isAnimatingRef,
      translateX,
      handleSwipeComplete,
      resetPosition,
      screenWidth,
    ]
  );

  // Create tap gesture - memoized
  const tapGesture = useCallback(
    () =>
      Gesture.Tap()
        .enabled(!isUpdating && !isTransitioning && !isAnimatingRef.value)
        .onEnd(() => {
          if (!isUpdating && !isTransitioning && !isAnimatingRef.value) {
            runOnJS(onTap)();
          }
        }),
    [isUpdating, isTransitioning, isAnimatingRef, onTap]
  );

  // Combine gestures - memoized
  const combinedGestures = useCallback(
    () => Gesture.Exclusive(panGesture(), tapGesture()),
    [panGesture, tapGesture]
  );

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, []);

  // Create animated style for the swipe container
  const swipeContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={combinedGestures()}>
      <Animated.View style={[styles.swipeContainer, swipeContainerStyle]}>
        <Animated.View style={[styles.wordContainer, opacityStyle]}>
          <WordDisplay fontSize={fontSize} word={word} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

ReviewCard.displayName = 'ReviewCard';

export default ReviewCard;
