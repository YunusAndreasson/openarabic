import { useCallback, memo, useEffect, useRef, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

import { TIMING_CONFIG } from '@/constants/animation';
import { WORD_AREA_MIN_HEIGHT, useScreenWidth } from '@/constants/layout';
import type { AnimatedStyleProp } from '@/types/ui/base.types';

import WordDisplay from './WordDisplay';

// Animation config constants
const SWIPE_THRESHOLD_RATIO = 0.04;

// Styles moved outside component for better performance
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
  testID?: string;
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
  testID,
}: ReviewCardProps) {
  // Animation values
  const translateX = useSharedValue(0);
  const isAnimatingRef = useSharedValue(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoize screen width and threshold
  const screenWidth = useScreenWidth();
  const SWIPE_THRESHOLD = useMemo(() => screenWidth * SWIPE_THRESHOLD_RATIO, [screenWidth]);

  // Animated style for swipe container
  const swipeContainerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: translateX.value }],
    };
  }, []);

  // Simple reset function that works from JS thread
  const resetPosition = useCallback(() => {
    isAnimatingRef.value = true;
    translateX.value = withTiming(0, TIMING_CONFIG.FAST, () => {
      isAnimatingRef.value = false;
    });
  }, [translateX, isAnimatingRef]);

  // Simplified swipe completion handling
  const handleSwipeComplete = useCallback(
    (isRight: boolean) => {
      // Trigger the swipe action
      if (isRight) {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }

      // Reset position after a brief delay
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(() => {
        resetPosition();
      }, 50);
    },
    [onSwipeLeft, onSwipeRight, resetPosition]
  );

  // Pan gesture
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isUpdating && !isTransitioning)
        .minDistance(0.1)
        .activeOffsetX([-1, 1])
        .onUpdate(event => {
          'worklet';
          if (!isUpdating && !isTransitioning && !isAnimatingRef.value) {
            translateX.value = event.translationX;
          }
        })
        .onEnd(event => {
          'worklet';
          if (!isAnimatingRef.value && Math.abs(event.translationX) > SWIPE_THRESHOLD) {
            const isRight = event.translationX > 0;
            runOnJS(handleSwipeComplete)(isRight);
          } else {
            // Simple reset on UI thread
            isAnimatingRef.value = true;
            translateX.value = withTiming(0, TIMING_CONFIG.FAST, () => {
              isAnimatingRef.value = false;
            });
          }
        }),
    [isUpdating, isTransitioning, isAnimatingRef, translateX, handleSwipeComplete, SWIPE_THRESHOLD]
  );

  // Tap gesture
  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(!isUpdating && !isTransitioning)
        .onEnd(() => {
          'worklet';
          if (!isUpdating && !isTransitioning && !isAnimatingRef.value) {
            runOnJS(onTap)();
          }
        }),
    [isUpdating, isTransitioning, isAnimatingRef, onTap]
  );

  // Combined gestures
  const combinedGestures = useMemo(
    () => Gesture.Exclusive(panGesture, tapGesture),
    [panGesture, tapGesture]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      cancelAnimation(translateX);
    };
  }, [translateX]);

  return (
    <GestureDetector gesture={combinedGestures}>
      <Animated.View style={[styles.swipeContainer, swipeContainerStyle]} testID={testID}>
        <Animated.View style={[styles.wordContainer, opacityStyle]}>
          <WordDisplay fontSize={fontSize} word={word} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

ReviewCard.displayName = 'ReviewCard';

export default ReviewCard;
