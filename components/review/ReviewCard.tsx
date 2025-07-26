import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, SCREEN_WIDTH, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import type { AnimatedStyleProp } from '@/types/ui/base.types';

import WordDisplayComponent from './WordDisplay';

// ===== STATIC CONSTANTS (EXTRACTED FOR MAXIMUM PERFORMANCE) =====
const REVIEW_CARD_CONSTANTS = {
  SWIPE_THRESHOLD_RATIO: 0.04,
  RESET_DELAY: 50,
  MIN_DISTANCE: 0.1,
  MAX_TRANSLATION_RATIO: LAYOUT.OPACITY.HOVER,
} as const;

// Pre-calculated values for maximum performance
const STATIC_CALCULATIONS = {
  SWIPE_THRESHOLD: SCREEN_WIDTH * REVIEW_CARD_CONSTANTS.SWIPE_THRESHOLD_RATIO,
  MAX_TRANSLATION: SCREEN_WIDTH * REVIEW_CARD_CONSTANTS.MAX_TRANSLATION_RATIO,
} as const;

// Static gesture detection thresholds
const GESTURE_CONFIG = {
  MIN_DISTANCE: REVIEW_CARD_CONSTANTS.MIN_DISTANCE,
  ACTIVE_OFFSET_X: [-1, 1] as [number, number],
} as const;

// Static animation configuration
const ANIMATION_CONFIG = {
  TIMING: TIMING_CONFIG.FAST,
  RESET_DELAY: REVIEW_CARD_CONSTANTS.RESET_DELAY,
} as const;

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
  // const colors = useColors();
  const translateX = useSharedValue(0);
  const isAnimatingRef = useSharedValue(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== SWIPE BACKGROUND COLOR ANIMATION =====
  const swipeBackgroundStyle = useAnimatedStyle(() => {
    'worklet';
    // Interpolate color: left = error, right = success, center = transparent
    let bgColor = 'transparent';
    if (translateX.value < 0) {
      // Swiping left: interpolate from transparent to error
      const t = Math.min(Math.abs(translateX.value) / STATIC_CALCULATIONS.MAX_TRANSLATION, 1);
      bgColor = `rgba(211,47,47,${t * 0.18})`; // #D32F2F, 18% opacity at max
    } else if (translateX.value > 0) {
      // Swiping right: interpolate from transparent to success
      const t = Math.min(translateX.value / STATIC_CALCULATIONS.MAX_TRANSLATION, 1);
      bgColor = `rgba(76,127,90,${t * 0.18})`; // #4C7F5A, 18% opacity at max
    }
    return { backgroundColor: bgColor };
  }, []);

  // ===== COMBINED ANIMATED STYLE (SINGLE ANIMATED VIEW) =====
  const combinedAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: translateX.value }],
    };
  }, []);

  // ===== OPTIMIZED RESET FUNCTION (WORKLET-READY) =====
  const resetPosition = useCallback(() => {
    'worklet';
    isAnimatingRef.value = true;
    translateX.value = withTiming(0, ANIMATION_CONFIG.TIMING, () => {
      isAnimatingRef.value = false;
    });
  }, [translateX, isAnimatingRef]);

  // ===== OPTIMIZED SWIPE HANDLER (MINIMAL JS THREAD WORK) =====
  const handleSwipeComplete = useCallback(
    (isRight: boolean) => {
      // Trigger the swipe action immediately
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

  // ===== OPTIMIZED GESTURE HANDLER (STATIC CALCULATIONS) =====
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isUpdating && !isTransitioning)
        .minDistance(GESTURE_CONFIG.MIN_DISTANCE)
        .activeOffsetX(GESTURE_CONFIG.ACTIVE_OFFSET_X)
        .onUpdate(event => {
          'worklet';
          if (!isAnimatingRef.value && event.translationX !== undefined) {
            // Use pre-calculated max translation for maximum performance
            const clampedTranslation = Math.max(
              -STATIC_CALCULATIONS.MAX_TRANSLATION,
              Math.min(STATIC_CALCULATIONS.MAX_TRANSLATION, event.translationX)
            );
            translateX.value = clampedTranslation;
          }
        })
        .onEnd(event => {
          'worklet';
          if (!isAnimatingRef.value && event.translationX !== undefined) {
            const translationX = event.translationX;

            // Use pre-calculated threshold for maximum performance
            if (Math.abs(translationX) > STATIC_CALCULATIONS.SWIPE_THRESHOLD) {
              const isRight = translationX > 0;
              runOnJS(handleSwipeComplete)(isRight);
            } else {
              // Simple reset on UI thread with optimized timing
              isAnimatingRef.value = true;
              translateX.value = withTiming(0, ANIMATION_CONFIG.TIMING, () => {
                isAnimatingRef.value = false;
              });
            }
          }
        }),
    [isUpdating, isTransitioning, isAnimatingRef, translateX, handleSwipeComplete]
  );

  // ===== MEMOIZED PROPS (PREVENT CHILD RE-RENDERS) =====
  const wordDisplayProps = useMemo(
    () => ({
      fontSize,
      word,
    }),
    [fontSize, word]
  );

  // ===== CLEANUP (PREVENT MEMORY LEAKS) =====
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
      <View style={STATIC_STYLES.swipeContainer}>
        <Animated.View
          style={[STATIC_STYLES.swipeContainer, swipeBackgroundStyle]}
          pointerEvents="none"
        />
        <Animated.View
          style={[STATIC_STYLES.wordContainer, combinedAnimatedStyle, opacityStyle]}
          testID={testID}
        >
          <WordDisplayComponent {...wordDisplayProps} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
};

// ===== OPTIMIZED COMPARISON FUNCTION (MAXIMUM PERFORMANCE) =====
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

  // Style object comparison - check reference first
  if (prevProps.opacityStyle === nextProps.opacityStyle) return true;
  if (prevProps.opacityStyle === null && nextProps.opacityStyle === null) return true;
  if (prevProps.opacityStyle === null || nextProps.opacityStyle === null) return false;

  return false; // Skip deep comparison for performance
};

export const ReviewCard = memo(ReviewCardInternal, ReviewCardComparison);

ReviewCard.displayName = 'ReviewCard';

export default ReviewCard;
