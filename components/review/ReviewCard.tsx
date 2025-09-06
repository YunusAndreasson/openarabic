import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { AnimatedStyleProp as ReanimatedAnimatedStyleProp } from 'react-native-reanimated';
import Animated, {
  cancelAnimation,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import WordDisplayComponent from '@/components/review/WordDisplay';
import { SPRING_CONFIG, TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, SCREEN_WIDTH, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { AnimatedStyleProp as AppAnimatedStyleProp } from '@/types/ui/base.types';
import { withOpacity } from '@/utils/colorUtils';

// ===== STATIC ANIMATION CONFIGURATION =====
const ANIMATION_CONFIG = {
  TIMING: TIMING_CONFIG.FAST,
  RESET_DELAY: 50,
} as const;

// ===== GESTURE CONSTANTS =====
const GESTURE_CONSTANTS = {
  SWIPE_THRESHOLD_RATIO: 0.04,
  MIN_DISTANCE: 0.1,
  MAX_TRANSLATION_RATIO: LAYOUT.OPACITY.HOVER,
} as const;

const GESTURE_CONFIG = {
  MIN_DISTANCE: GESTURE_CONSTANTS.MIN_DISTANCE,
  ACTIVE_OFFSET_X: [-1, 1] as [number, number],
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
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isUpdating: boolean;
  isTransitioning: boolean;
  opacityStyle: ReanimatedAnimatedStyleProp<ViewStyle> | AppAnimatedStyleProp<ViewStyle>;
  testID?: string;
  // Translation props
  translation?: string;
  showTranslation?: boolean;
}

const ReviewCardInternal = ({
  word,
  onSwipeLeft,
  onSwipeRight,
  isUpdating,
  isTransitioning,
  opacityStyle,
  testID,
  translation,
  showTranslation = false,
}: ReviewCardProps) => {
  const colors = useColors();
  const translateX = useSharedValue(0);
  const isAnimatingRef = useSharedValue(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== SWIPE BACKGROUND COLOR ANIMATION =====
  const errorStart = useMemo(() => withOpacity(colors.error, 0), [colors.error]);
  const errorEnd = useMemo(() => withOpacity(colors.error, 0.18), [colors.error]);
  const successStart = useMemo(() => withOpacity(colors.success, 0), [colors.success]);
  const successEnd = useMemo(() => withOpacity(colors.success, 0.18), [colors.success]);

  const swipeBackgroundStyle = useAnimatedStyle(() => {
    'worklet';
    const maxTranslation = SCREEN_WIDTH * GESTURE_CONSTANTS.MAX_TRANSLATION_RATIO;
    const t = Math.min(Math.abs(translateX.value) / maxTranslation, 1);

    if (translateX.value < 0) {
      return {
        backgroundColor: interpolateColor(t, [0, 1], [errorStart, errorEnd]),
      };
    }
    if (translateX.value > 0) {
      return {
        backgroundColor: interpolateColor(t, [0, 1], [successStart, successEnd]),
      };
    }
    return { backgroundColor: colors.transparent };
  }, [errorStart, errorEnd, successStart, successEnd]);

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
    translateX.value = withSpring(0, SPRING_CONFIG.CARD, () => {
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

  // ===== OPTIMIZED GESTURE HANDLER (INLINE LOGIC) =====
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isUpdating && !isTransitioning)
        .minDistance(GESTURE_CONFIG.MIN_DISTANCE)
        .activeOffsetX(GESTURE_CONFIG.ACTIVE_OFFSET_X)
        .onUpdate(event => {
          'worklet';
          if (!isAnimatingRef.value && event.translationX !== undefined) {
            // Inline clamping logic
            const maxTranslation = SCREEN_WIDTH * GESTURE_CONSTANTS.MAX_TRANSLATION_RATIO;
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

            // Inline swipe action logic
            const swipeThreshold = SCREEN_WIDTH * GESTURE_CONSTANTS.SWIPE_THRESHOLD_RATIO;
            if (Math.abs(translationX) > swipeThreshold) {
              const isRight = translationX > 0;
              runOnJS(handleSwipeComplete)(isRight);
            } else {
              // Simple reset on UI thread with spring animation
              isAnimatingRef.value = true;
              translateX.value = withSpring(0, SPRING_CONFIG.CARD, () => {
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
      word,
      translation: showTranslation ? translation : undefined,
    }),
    [word, showTranslation, translation]
  );

  // ===== CLEANUP (PREVENT MEMORY LEAKS) =====
  useEffect(() => {
    return () => {
      // Clear any pending reset timer
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      // Cancel any ongoing animations to prevent memory leaks
      try {
        cancelAnimation(translateX);
        // Reset shared values to prevent stale references
        translateX.value = 0;
        isAnimatingRef.value = false;
      } catch {
        // Animation cleanup failed - continue
      }
    };
  }, [translateX, isAnimatingRef]);

  return (
    <View style={STATIC_STYLES.swipeContainer}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[STATIC_STYLES.swipeContainer, swipeBackgroundStyle]}>
          <Animated.View
            style={[STATIC_STYLES.wordContainer, combinedAnimatedStyle, opacityStyle]}
            testID={testID}
          >
            <WordDisplayComponent {...wordDisplayProps} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

// ===== OPTIMIZED COMPARISON FUNCTION (PREVENT UNNECESSARY RE-RENDERS) =====
const ReviewCardComparison = (prevProps: ReviewCardProps, nextProps: ReviewCardProps): boolean => {
  return (
    prevProps.word === nextProps.word &&
    prevProps.onSwipeLeft === nextProps.onSwipeLeft &&
    prevProps.onSwipeRight === nextProps.onSwipeRight &&
    prevProps.isUpdating === nextProps.isUpdating &&
    prevProps.isTransitioning === nextProps.isTransitioning &&
    prevProps.opacityStyle === nextProps.opacityStyle &&
    prevProps.testID === nextProps.testID &&
    prevProps.translation === nextProps.translation &&
    prevProps.showTranslation === nextProps.showTranslation
  );
};

export const ReviewCard = memo(ReviewCardInternal, ReviewCardComparison);

export default ReviewCard;
