import { useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { AnimatedStyle as ReanimatedAnimatedStyle } from 'react-native-reanimated';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';

import { SPRING_CONFIG } from '@/constants/animation';

import { WordDisplay as WordDisplayComponent } from './WordDisplay';
import { LAYOUT, SCREEN_WIDTH, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { useSwipeGesture } from '@/hooks/gestures/useSwipeGesture';
import { useColors } from '@/hooks/theme/useColors';
import type { AnimatedStyleProp as AppAnimatedStyleProp } from '@/types/ui/base.types';
import type { StudyWord } from '@/types/vocabulary.types';
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
  currentWord?: StudyWord | null; // Current word object for accessing English translation
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isUpdating: boolean;
  opacityStyle: ReanimatedAnimatedStyle<ViewStyle> | AppAnimatedStyleProp<ViewStyle>;
  testID?: string;
  // Translation props
  translation?: string;
  showTranslation?: boolean;
  // Hint props (tap-to-reveal)
  showHint?: boolean; // Controlled from parent instead of timer
  onToggleHint?: () => void; // Handler for tapping screen to reveal hint
  onReplayAudio?: () => void; // Handler for tapping word to replay audio
  // Background props
  fullScreenBackground?: boolean; // When true, renders background layer only for full-screen flash
}

export function ReviewCard({
  word,
  currentWord,
  onSwipeLeft,
  onSwipeRight,
  isUpdating,
  opacityStyle,
  testID,
  translation,
  showTranslation = false,
  showHint = false,
  onToggleHint, // Handler for tapping screen (anywhere)
  onReplayAudio, // Handler for tapping word specifically
  fullScreenBackground = false,
}: ReviewCardProps) {
  const colors = useColors();

  // Prevent tap from firing during swipe gestures
  const didMoveRef = useRef(false);

  // ===== SWIPE GESTURE HOOK (v2 OPTIMIZED) =====
  const { gesture: panGesture, translateX } = useSwipeGesture({
    enabled: !isUpdating,
    onSwipeLeft,
    onSwipeRight,
    springConfig: SPRING_CONFIG.CARD,
    onGestureBegin: () => {
      // Track that gesture started (any movement)
      didMoveRef.current = true;
    },
    onSwipeComplete: () => {
      // Reset after animation completes
      setTimeout(() => {
        didMoveRef.current = false;
      }, 100);
    },
  });

  // ===== SWIPE BACKGROUND COLOR ANIMATION =====
  const errorStart = withOpacity(colors.error, 0);
  const errorEnd = withOpacity(colors.error, 0.35); // Increased from 0.18 for more prominence
  const successStart = withOpacity(colors.success, 0);
  const successEnd = withOpacity(colors.success, 0.35); // Increased from 0.18 for more prominence

  const swipeBackgroundStyle = useAnimatedStyle(() => {
    'worklet';
    const maxTranslation = SCREEN_WIDTH * GESTURE_CONSTANTS.MAX_TRANSLATION_RATIO;
    const progress = Math.min(Math.abs(translateX.value) / maxTranslation, 1);

    // Apply easing curve for more prominent color at beginning of swipe
    // Using quadratic ease-out: starts strong, ends gentle
    const t = 1 - Math.pow(1 - progress, 2);

    if (translateX.value < 0) {
      // Left swipe = Unknown (red)
      return {
        backgroundColor: interpolateColor(t, [0, 1], [errorStart, errorEnd]),
      };
    }
    if (translateX.value > 0) {
      // Right swipe = Known (green)
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

  // Get English translation for hint from root
  const englishTranslation = currentWord?.root?.meaning || '';

  // Handle tap on screen (but not during swipes)
  const handleScreenTap = () => {
    // If finger moved (swipe gesture), ignore the tap
    if (didMoveRef.current) {
      return;
    }
    onToggleHint?.();
  };

  // Word display props
  const wordDisplayProps = {
    word,
    translation: showTranslation ? translation : undefined,
    showFirstLetterOnly: showHint, // Controlled from parent (tap-to-reveal)
    englishTranslation: englishTranslation || undefined, // Always pass English translation when available
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
            {/* Full-screen tap handler for hint toggle */}
            <Pressable
              style={{ flex: 1 }}
              onPress={handleScreenTap}
              onPressIn={() => {
                // Reset movement flag when press starts
                didMoveRef.current = false;
              }}
              disabled={!onToggleHint}
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
            </Pressable>
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
          <Pressable
            style={{ flex: 1 }}
            onPress={handleScreenTap}
            onPressIn={() => {
              // Reset movement flag when press starts
              didMoveRef.current = false;
            }}
            disabled={!onToggleHint}
          >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Animated.View
                style={[STATIC_STYLES.wordContainer, combinedAnimatedStyle, opacityStyle]}
                testID={testID}
              >
                <WordDisplayComponent {...wordDisplayProps} />
              </Animated.View>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

ReviewCard.displayName = 'ReviewCard';
