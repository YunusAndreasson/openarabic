import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { TIMING_CONFIG } from '@/constants/animation';
import { SCREEN_WIDTH, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import type { AnimatedStyleProp } from '@/types/ui/base.types';

import WordDisplay from './WordDisplay';

// ===== STATIC CONSTANTS EXTRACTION (CRITICAL FOR PERFORMANCE) =====
const REVIEW_CARD_CONSTANTS = {
  SWIPE_THRESHOLD_RATIO: 0.04,
  RESET_DELAY: 50,
  MIN_DISTANCE: 0.1,
};

// Static gesture detection thresholds
const GESTURE_CONFIG = {
  MIN_DISTANCE: REVIEW_CARD_CONSTANTS.MIN_DISTANCE,
  ACTIVE_OFFSET_X: [-1, 1] as [number, number],
};

// Static animation configuration
const ANIMATION_CONFIG = {
  TIMING: TIMING_CONFIG.FAST,
  RESET_DELAY: REVIEW_CARD_CONSTANTS.RESET_DELAY,
} as const;

// ===== STATIC STYLES USING STYLESHEET.CREATE =====
const STATIC_STYLES = StyleSheet.create({
  swipeContainer: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  } as ViewStyle,
  wordContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: WORD_AREA_MIN_HEIGHT,
    width: '100%',
  } as ViewStyle,
});

interface ReviewCardProps {
  word: string;
  fontSize: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isUpdating: boolean;
  isTransitioning: boolean;
  opacityStyle: AnimatedStyleProp<ViewStyle>;
  testID?: string;
}

// ===== HELPER FUNCTIONS EXTRACTED (PURE FUNCTIONS OUTSIDE COMPONENT) =====
const calculateSwipeThreshold = (screenWidth: number): number =>
  screenWidth * REVIEW_CARD_CONSTANTS.SWIPE_THRESHOLD_RATIO;

// ===== COMPONENT WITH ADVANCED OPTIMIZATION =====
const ReviewCardInternal = ({
  word,
  fontSize,
  onSwipeLeft,
  onSwipeRight,
  isUpdating,
  isTransitioning,
  opacityStyle,
  testID,
}: ReviewCardProps) => {
  // ===== ANIMATION VALUES =====
  const translateX = useSharedValue(0);
  const isAnimatingRef = useSharedValue(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== MEMOIZED VALUES (PREVENT EXPENSIVE RECALCULATIONS) =====
  const screenWidth = SCREEN_WIDTH;
  const swipeThreshold = useMemo(() => calculateSwipeThreshold(screenWidth), [screenWidth]);

  // ===== ADVANCED STYLE MEMOIZATION =====
  const swipeContainerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: translateX.value }],
    };
  }, []);

  const wordContainerStyle = useMemo(
    () => [STATIC_STYLES.wordContainer, opacityStyle],
    [opacityStyle]
  );

  // ===== OPTIMIZED CALLBACK FUNCTIONS =====
  const resetPosition = useCallback(() => {
    isAnimatingRef.value = true;
    translateX.value = withTiming(0, ANIMATION_CONFIG.TIMING, () => {
      isAnimatingRef.value = false;
    });
  }, [translateX, isAnimatingRef]);

  const handleSwipeComplete = useCallback(
    (isRight: boolean) => {
      // Trigger the swipe action
      if (isRight) {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }

      // Reset position after a brief delay using static constant
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(() => {
        resetPosition();
      }, ANIMATION_CONFIG.RESET_DELAY);
    },
    [onSwipeLeft, onSwipeRight, resetPosition]
  );

  // ===== GESTURE OPTIMIZATION WITH MEMOIZATION =====
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isUpdating && !isTransitioning)
        .minDistance(GESTURE_CONFIG.MIN_DISTANCE)
        .activeOffsetX(GESTURE_CONFIG.ACTIVE_OFFSET_X)
        .onUpdate(event => {
          'worklet';
          if (!isAnimatingRef.value && event.translationX !== undefined) {
            // Clamp translation to prevent extreme values that could cause crashes
            const maxTranslation = screenWidth * 0.8; // Max 80% of screen width
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
            const threshold = swipeThreshold;
            const translationX = event.translationX;

            // Check if swipe threshold is met (inline to avoid function call in worklet)
            if (Math.abs(translationX) > threshold) {
              const isRight = translationX > 0;
              runOnJS(handleSwipeComplete)(isRight);
            } else {
              // Simple reset on UI thread
              isAnimatingRef.value = true;
              translateX.value = withTiming(0, ANIMATION_CONFIG.TIMING, () => {
                isAnimatingRef.value = false;
              });
            }
          }
        }),
    [
      isUpdating,
      isTransitioning,
      isAnimatingRef,
      translateX,
      handleSwipeComplete,
      swipeThreshold,
      screenWidth,
    ]
  );

  // ===== MEMOIZED CHILD PROPS (PREVENT CHILD RE-RENDERS) =====
  const wordDisplayProps = useMemo(
    () => ({
      fontSize,
      word,
    }),
    [fontSize, word]
  );

  // ===== CLEANUP EFFECT =====
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
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[STATIC_STYLES.swipeContainer, swipeContainerStyle]} testID={testID}>
        <Animated.View style={wordContainerStyle}>
          <WordDisplay {...wordDisplayProps} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

// ===== CUSTOM MEMO COMPARISON FUNCTION (PREVENTS UNNECESSARY RE-RENDERS) =====
const ReviewCardComparison = (prevProps: ReviewCardProps, nextProps: ReviewCardProps): boolean => {
  // Compare primitive values first (fastest)
  if (prevProps.word !== nextProps.word) return false;
  if (prevProps.fontSize !== nextProps.fontSize) return false;
  if (prevProps.isUpdating !== nextProps.isUpdating) return false;
  if (prevProps.isTransitioning !== nextProps.isTransitioning) return false;
  if (prevProps.testID !== nextProps.testID) return false;

  // Function reference comparisons (check if callbacks changed)
  if (prevProps.onSwipeLeft !== nextProps.onSwipeLeft) return false;
  if (prevProps.onSwipeRight !== nextProps.onSwipeRight) return false;

  // Style object comparison (most expensive) - check reference first
  if (prevProps.opacityStyle === nextProps.opacityStyle) return true;
  if (prevProps.opacityStyle === null && nextProps.opacityStyle === null) return true;
  if (prevProps.opacityStyle === null || nextProps.opacityStyle === null) return false;

  // Deep comparison only if references differ
  return JSON.stringify(prevProps.opacityStyle) === JSON.stringify(nextProps.opacityStyle);
};

export const ReviewCard = memo(ReviewCardInternal, ReviewCardComparison);

ReviewCard.displayName = 'ReviewCard';

export default ReviewCard;
