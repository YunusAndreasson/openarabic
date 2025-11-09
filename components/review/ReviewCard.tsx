import { useEffect, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type {
  AnimatedStyle as ReanimatedAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import Animated, {
  interpolateColor,
  useAnimatedReaction,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

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
  // Hesitation props
  onHesitationStart?: () => void;
  onHesitationEnd?: () => void;
  isHesitating?: SharedValue<boolean>;
  // Audio props
  onWordPress?: () => void;
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
  onHesitationStart,
  onHesitationEnd,
  isHesitating,
  onWordPress,
}: ReviewCardProps) {
  const colors = useColors();

  // ===== SHARED VALUE SYNC FOR UI UPDATES =====
  // Sync SharedValue to local state for React re-renders (needed for WordDisplay hint)
  const [showHint, setShowHint] = useState(false);

  // Use native Reanimated reaction instead of 60fps polling for better performance
  useAnimatedReaction(
    () => (isHesitating ? isHesitating.value : false),
    (currentValue, previousValue) => {
      if (currentValue !== previousValue) {
        scheduleOnRN(setShowHint, currentValue);
      }
    },
    [isHesitating],
  );

  // ===== HESITATION TIMER =====
  const hesitationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGestureActiveRef = useRef(false);

  // Hesitation timer constant (3 seconds)
  const HESITATION_DELAY_MS = 3000;

  // Clean up hesitation timer
  const clearHesitationTimer = () => {
    if (hesitationTimeoutRef.current) {
      clearTimeout(hesitationTimeoutRef.current);
      hesitationTimeoutRef.current = null;
    }
    // Also reset gesture active state
    isGestureActiveRef.current = false;
  };

  // ===== SWIPE GESTURE HOOK (v2 OPTIMIZED) =====
  const { gesture: panGesture, translateX } = useSwipeGesture({
    enabled: !isUpdating,
    onSwipeLeft,
    onSwipeRight,
    springConfig: SPRING_CONFIG.CARD,
    onSwipeComplete: () => {
      clearHesitationTimer();
      if (onHesitationEnd) {
        onHesitationEnd();
      }
    }, // Clear timer when swipe completes
    // Clear hesitation timer when user first touches the card (BEGAN state)
    // This provides immediate feedback as soon as finger touches screen
    onGestureBegin: () => {
      clearHesitationTimer();
      isGestureActiveRef.current = true;
    },
    // onStart is called when gesture is activated (swipe recognized)
    // We use onBegin for earlier detection (on first touch)
    onGestureStart: () => {
      // Gesture is now active (swipe recognized)
      // Timer already cleared in onBegin
    },
  });

  // ===== SWIPE BACKGROUND COLOR ANIMATION =====
  const errorStart = withOpacity(colors.error, 0);
  const errorEnd = withOpacity(colors.error, 0.18);
  const successStart = withOpacity(colors.success, 0);
  const successEnd = withOpacity(colors.success, 0.18);

  // Add vague colors (orange/yellow for hesitation)
  const vagueStart = withOpacity(colors.warning, 0);
  const vagueEnd = withOpacity(colors.warning, 0.25);

  const swipeBackgroundStyle = useAnimatedStyle(() => {
    'worklet';
    const maxTranslation = SCREEN_WIDTH * GESTURE_CONSTANTS.MAX_TRANSLATION_RATIO;
    const t = Math.min(Math.abs(translateX.value) / maxTranslation, 1);

    if (translateX.value < 0) {
      // Left swipe - ALWAYS unknown (red), regardless of hesitation state
      // Hesitation state only affects right swipes (known vs vague)
      return {
        backgroundColor: interpolateColor(t, [0, 1], [errorStart, errorEnd]),
      };
    }
    if (translateX.value > 0) {
      // Right swipe - success (green) or vague (orange) depending on hesitation state
      // Read SharedValue directly on UI thread for better performance
      const isCurrentlyHesitating = isHesitating?.value ?? false;
      const startColor = isCurrentlyHesitating ? vagueStart : successStart;
      const endColor = isCurrentlyHesitating ? vagueEnd : successEnd;
      return {
        backgroundColor: interpolateColor(t, [0, 1], [startColor, endColor]),
      };
    }
    return { backgroundColor: colors.transparent };
  }, [errorStart, errorEnd, successStart, successEnd, vagueStart, vagueEnd, isHesitating]);

  // ===== COMBINED ANIMATED STYLE (SINGLE ANIMATED VIEW) =====
  const combinedAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: translateX.value }],
    };
  }, []);

  // Get English translation for hint from root
  const englishTranslation = currentWord?.root?.meaning || '';

  // Auto-start hesitation timer when word appears (if not already hesitating)
  useEffect(() => {
    // CRITICAL FIX: Don't start timer if translation is showing (prevents timer restart during feedback)
    // This prevents the bug where onHesitationEnd → isHesitating=false triggers new timer while showing translation
    // Use synced JS state (showHint) to avoid blocking SharedValue read
    if (
      word &&
      englishTranslation &&
      !showHint &&
      !hesitationTimeoutRef.current &&
      !showTranslation
    ) {
      hesitationTimeoutRef.current = setTimeout(() => {
        if (!isGestureActiveRef.current) {
          // Only show hint if user hasn't interacted
          onHesitationStart?.();
        }
      }, HESITATION_DELAY_MS);
    }

    // Cleanup on unmount or word change
    return () => {
      if (hesitationTimeoutRef.current) {
        clearTimeout(hesitationTimeoutRef.current);
        hesitationTimeoutRef.current = null;
      }
      // CRITICAL FIX: Reset gesture active flag on word change to prevent stale state
      isGestureActiveRef.current = false;
    };
  }, [word, englishTranslation, showHint, onHesitationStart, showTranslation]);

  // Word display props
  const wordDisplayProps = {
    word,
    translation: showTranslation ? translation : undefined,
    showFirstLetterOnly: showHint, // Use synced state instead of SharedValue
    englishTranslation: englishTranslation || undefined, // Always pass English translation when available
    onWordPress,
  };

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
}

ReviewCard.displayName = 'ReviewCard';
