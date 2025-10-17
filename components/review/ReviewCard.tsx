import { useEffect, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { AnimatedStyle as ReanimatedAnimatedStyle, SharedValue } from 'react-native-reanimated';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';

import { WordDisplay as WordDisplayComponent } from '@/components/review/WordDisplay';
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
  currentWord?: any; // Current word object for accessing English translation
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
}: ReviewCardProps) {
  const colors = useColors();

  // ===== SHARED VALUE SYNC FOR UI UPDATES =====
  // Sync SharedValue to local state for React re-renders (needed for WordDisplay hint)
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!isHesitating) return;

    // Poll the SharedValue at 60fps to sync with React state
    const interval = setInterval(() => {
      const currentValue = isHesitating.value;
      setShowHint(prev => {
        if (prev !== currentValue) {
          return currentValue;
        }
        return prev;
      });
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [isHesitating]);

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
    // Clear hesitation timer when user starts interacting (swiping)
    // CRITICAL FIX: Do NOT call onHesitationEnd() here - it must be called AFTER
    // the swipe handler reads isHesitating state. Calling it here causes a race
    // condition where vague words are incorrectly marked as known.
    onGestureStart: () => {
      clearHesitationTimer();
      isGestureActiveRef.current = true;
    },
  });

  // ===== SWIPE BACKGROUND COLOR ANIMATION =====
  const errorStart = withOpacity(colors.error, 0);
  const errorEnd = withOpacity(colors.error, 0.18);
  const successStart = withOpacity(colors.success, 0);
  const successEnd = withOpacity(colors.success, 0.18);

  // Add vague colors (orange/yellow for hesitation)
  const vagueStart = withOpacity(colors.warning || '#FFA500', 0);
  const vagueEnd = withOpacity(colors.warning || '#FFA500', 0.25);

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

  // Get English translation for hint - try multiple sources
  const englishTranslation = currentWord?.root?.meaning || currentWord?.meaning || '';

  // Auto-start hesitation timer when word appears (if not already hesitating)
  useEffect(() => {
    // CRITICAL FIX: Don't start timer if translation is showing (prevents timer restart during feedback)
    // This prevents the bug where onHesitationEnd → isHesitating=false triggers new timer while showing translation
    const isCurrentlyHesitating = isHesitating?.value ?? false;
    if (
      word &&
      englishTranslation &&
      !isCurrentlyHesitating &&
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
  }, [word, englishTranslation, isHesitating, onHesitationStart, showTranslation]);

  // Word display props
  const wordDisplayProps = {
    word,
    translation: showTranslation ? translation : undefined,
    showFirstLetterOnly: showHint, // Use synced state instead of SharedValue
    englishTranslation: englishTranslation || undefined, // Always pass English translation when available
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

