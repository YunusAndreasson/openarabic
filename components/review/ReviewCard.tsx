import { memo, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { AnimatedStyle as ReanimatedAnimatedStyle } from 'react-native-reanimated';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';

import WordDisplayComponent from '@/components/review/WordDisplay';
import { SPRING_CONFIG } from '@/constants/animation';
import { LAYOUT, SCREEN_WIDTH, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { useSwipeGesture } from '@/hooks/gestures/useSwipeGesture';
import { useColors } from '@/hooks/theme/useColors';
import type { AnimatedStyleProp as AppAnimatedStyleProp } from '@/types/ui/base.types';
import { withOpacity } from '@/utils/colorUtils';

// ===== GESTURE CONSTANTS =====
const GESTURE_CONSTANTS = {
  MAX_TRANSLATION_RATIO: LAYOUT.OPACITY.HOVER,
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
  opacityStyle: ReanimatedAnimatedStyle<ViewStyle> | AppAnimatedStyleProp<ViewStyle>;
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

  // ===== SWIPE GESTURE HOOK (v2 OPTIMIZED) =====
  const { gesture: panGesture, translateX } = useSwipeGesture({
    enabled: !isUpdating && !isTransitioning,
    onSwipeLeft,
    onSwipeRight,
    springConfig: SPRING_CONFIG.CARD,
  });

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

  // ===== MEMOIZED PROPS (PREVENT CHILD RE-RENDERS) =====
  const wordDisplayProps = useMemo(
    () => ({
      word,
      translation: showTranslation ? translation : undefined,
    }),
    [word, showTranslation, translation]
  );

  // ===== CLEANUP (HANDLED BY HOOK) =====
  // Cleanup is now handled by the useSwipeGesture hook

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
