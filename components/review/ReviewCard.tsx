import React, { useCallback } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'; // TODO: Use hooks

import { SCREEN_WIDTH } from '@/constants/layout';

import WordDisplay from './WordDisplay';

// Animation config constants
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.04;
const RESET_CONFIG = { duration: 150 }; // Faster reset animation

interface ReviewCardProps {
  word: string;
  fontSize: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
  isUpdating: boolean;
  isTransitioning: boolean;
  opacity: Animated.SharedValue<number>;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  word,
  fontSize,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  isUpdating,
  isTransitioning,
  opacity,
}) => {
  // Animation values
  const translateX = useSharedValue(0);
  const isAnimatingRef = useSharedValue(false);

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
      const resetTimer = setTimeout(() => {
        if (isAnimatingRef.value) {
          // Only reset if still animating
          runOnJS(resetPosition)();
        }
      }, 50);

      return () => {
        clearTimeout(resetTimer);
        isAnimatingRef.value = false;
      };
    },
    [isAnimatingRef, onSwipeLeft, onSwipeRight, resetPosition]
  );

  // Create pan gesture
  const panGesture = Gesture.Pan()
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
    });

  // Create tap gesture
  const tapGesture = Gesture.Tap()
    .enabled(!isUpdating && !isTransitioning && !isAnimatingRef.value)
    .onEnd(() => {
      if (!isUpdating && !isTransitioning && !isAnimatingRef.value) {
        runOnJS(onTap)();
      }
    });

  // Combine gestures
  const combinedGestures = Gesture.Exclusive(panGesture, tapGesture);

  // Create animated style for the swipe container
  const swipeContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Create animated style for the word container
  const wordContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={combinedGestures}>
      <Animated.View style={[styles.swipeContainer, swipeContainerStyle]}>
        <Animated.View style={[styles.wordContainer, wordContainerStyle]}>
          <WordDisplay word={word} fontSize={fontSize} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  wordContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  } as ViewStyle,
});

export default ReviewCard;
