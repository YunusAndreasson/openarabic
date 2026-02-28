import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { AnimatedStyle as ReanimatedAnimatedStyle } from 'react-native-reanimated';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';

import { useMemo } from 'react';

import { SPRING_CONFIG } from '@/constants/animation';

import { WordDisplay as WordDisplayComponent } from './WordDisplay';
import { LAYOUT, SCREEN_WIDTH, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { useSwipeGesture } from '@/hooks/gestures/useSwipeGesture';
import { useColors } from '@/hooks/theme/useColors';
import type { AnimatedStyleProp as AppAnimatedStyleProp } from '@/types/ui/base.types';
import { withOpacity } from '@/utils/colorUtils';

// ===== GESTURE CONSTANTS =====
const GESTURE_CONSTANTS = {
  MAX_TRANSLATION_RATIO: LAYOUT.OPACITY.HOVER,
  FLASH_OPACITY: 0.35,
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
  opacityStyle: ReanimatedAnimatedStyle<ViewStyle> | AppAnimatedStyleProp<ViewStyle>;
  testID?: string;
  // Translation props
  translation?: string;
  showTranslation?: boolean;
  onReplayAudio?: () => void; // Handler for tapping word to replay audio
  // Background props
  fullScreenBackground?: boolean; // When true, renders background layer only for full-screen flash
}

export function ReviewCard({
  word,
  onSwipeLeft,
  onSwipeRight,
  isUpdating,
  opacityStyle,
  testID,
  translation,
  showTranslation = false,
  onReplayAudio,
  fullScreenBackground = false,
}: ReviewCardProps) {
  const colors = useColors();

  // ===== SWIPE GESTURE HOOK (v2 OPTIMIZED) =====
  const { gesture: panGesture, translateX } = useSwipeGesture({
    enabled: !isUpdating,
    onSwipeLeft,
    onSwipeRight,
    springConfig: SPRING_CONFIG.CARD,
  });

  // ===== BACKGROUND FLASH COLORS (memoized to avoid worklet re-serialization) =====
  const flashColors = useMemo(
    () => ({
      error: [
        withOpacity(colors.error, 0),
        withOpacity(colors.error, GESTURE_CONSTANTS.FLASH_OPACITY),
      ] as [string, string],
      success: [
        withOpacity(colors.success, 0),
        withOpacity(colors.success, GESTURE_CONSTANTS.FLASH_OPACITY),
      ] as [string, string],
    }),
    [colors.error, colors.success],
  );

  const swipeBackgroundStyle = useAnimatedStyle(() => {
    'worklet';
    const maxTranslation = SCREEN_WIDTH * GESTURE_CONSTANTS.MAX_TRANSLATION_RATIO;
    const progress = Math.min(Math.abs(translateX.value) / maxTranslation, 1);
    const t = 1 - Math.pow(1 - progress, 2); // Quadratic ease-out

    // Left swipe (red)
    if (translateX.value < 0) {
      return { backgroundColor: interpolateColor(t, [0, 1], flashColors.error) };
    }
    // Right swipe (green)
    if (translateX.value > 0) {
      return { backgroundColor: interpolateColor(t, [0, 1], flashColors.success) };
    }
    return { backgroundColor: colors.transparent };
  }, [flashColors.error, flashColors.success]);

  // ===== COMBINED ANIMATED STYLE (SINGLE ANIMATED VIEW) =====
  const combinedAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: translateX.value }],
    };
  }, []);

  // Word display props
  const wordDisplayProps = {
    word,
    translation: showTranslation ? translation : undefined,
    onWordPress: onReplayAudio, // Tapping word replays audio
  };

  // When fullScreenBackground is true, render background and content as separate layers
  if (fullScreenBackground) {
    return (
      <>
        {/* Background layer - absolutely positioned full screen, no pointer events */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
            },
            swipeBackgroundStyle,
          ]}
        />

        {/* Gesture detector - full screen swipeable area */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            {/* Word content - centered in screen */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Animated.View
                style={[STATIC_STYLES.wordContainer, combinedAnimatedStyle, opacityStyle]}
                testID={testID}
              >
                <WordDisplayComponent {...wordDisplayProps} />
              </Animated.View>
            </View>
          </Animated.View>
        </GestureDetector>
      </>
    );
  }

  // Default rendering - background contained within word area
  return (
    <View style={STATIC_STYLES.swipeContainer}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[STATIC_STYLES.swipeContainer, swipeBackgroundStyle]}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View
              style={[STATIC_STYLES.wordContainer, combinedAnimatedStyle, opacityStyle]}
              testID={testID}
            >
              <WordDisplayComponent {...wordDisplayProps} />
            </Animated.View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

ReviewCard.displayName = 'ReviewCard';
