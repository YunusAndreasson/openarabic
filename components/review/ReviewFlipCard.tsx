import { useEffect, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { AnimatedStyle as ReanimatedAnimatedStyle } from 'react-native-reanimated';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { SPRING_CONFIG, TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, SCREEN_WIDTH, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useSwipeGesture } from '@/hooks/gestures/useSwipeGesture';
import { useColors } from '@/hooks/theme/useColors';
import type { AnimatedStyleProp as AppAnimatedStyleProp } from '@/types/ui/base.types';
import { withOpacity } from '@/utils/colorUtils';

import { WordDisplay } from './WordDisplay';

const CARD_CONSTANTS = {
  WIDTH: SCREEN_WIDTH - LAYOUT.SPACING.LARGE * 2,
  HEIGHT: WORD_AREA_MIN_HEIGHT, // ~360
  FLASH_OPACITY: 0.35,
  MAX_TRANSLATION_RATIO: LAYOUT.OPACITY.HOVER, // 0.8 — matches the old swipe card
} as const;

const STATIC_STYLES = StyleSheet.create({
  flashFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  // Sizing container for the two overlaid faces — intentionally chrome-less so the
  // word floats on the screen background (OpenArabic's look), not inside a card box.
  contentBox: {
    width: CARD_CONSTANTS.WIDTH,
    height: CARD_CONSTANTS.HEIGHT,
  } as ViewStyle,
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  } as ViewStyle,
  faceFill: {
    alignSelf: 'stretch',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
});

interface ReviewFlipCardProps {
  /** Arabic prompt (shown on both faces via WordDisplay). */
  word: string;
  /** English meaning, revealed below the Arabic on the answer face. */
  answer: string;
  /** Whether the card is flipped to its answer face. */
  revealed: boolean;
  /** Flip to the answer (tap the front face). */
  onReveal: () => void;
  /** Replay the Arabic prompt audio (tap the word on the answer face). */
  onReplayAudio?: () => void;
  /** Fade style applied during a grade advance (useReview.transparentStyle). */
  opacityStyle: ReanimatedAnimatedStyle<ViewStyle> | AppAnimatedStyleProp<ViewStyle>;
  /** Resets the swipe offset on a new card without remounting. */
  wordKey?: string;
  /** Disables grading interactions while a card advance is in flight. */
  isUpdating: boolean;
  /** Swipe left → Forgot. Only active once revealed. */
  onSwipeForgot: () => void;
  /** Swipe right → Knew it. Only active once revealed. */
  onSwipeKnewIt: () => void;
  testID?: string;
}

/**
 * The review card: the Arabic prompt floats on the screen (OpenArabic's clean,
 * surface-less word display). Tap the front to flip — a light 3D turn — to the
 * answer face, where the English meaning is revealed below the same Arabic
 * (reusing WordDisplay, so it reads exactly like the rest of the app). Once
 * revealed, swipe left = Forgot / right = Knew it (the centre "Guessed" lives on
 * the grade bar). The flip is the borrowed interaction; the look stays OpenArabic.
 */
export function ReviewFlipCard({
  word,
  answer,
  revealed,
  onReveal,
  onReplayAudio,
  opacityStyle,
  wordKey,
  isUpdating,
  onSwipeForgot,
  onSwipeKnewIt,
  testID,
}: ReviewFlipCardProps) {
  const colors = useColors();
  const flip = useSharedValue(0);

  const {
    gesture: panGesture,
    translateX,
    isAnimatingRef,
  } = useSwipeGesture({
    enabled: revealed && !isUpdating, // can't grade what you haven't seen
    onSwipeLeft: onSwipeForgot,
    onSwipeRight: onSwipeKnewIt,
    springConfig: SPRING_CONFIG.CARD,
  });

  // Drive the flip from `revealed`: animate the front→back turn on reveal, but
  // snap straight back to the question face when advancing (revealed only goes
  // false on a card change), so the next card never shows a flip-back animation.
  useEffect(() => {
    flip.value = revealed ? withTiming(1, { duration: TIMING_CONFIG.FLIP.duration }) : 0;
  }, [revealed, flip]);

  // Reset the swipe offset on a new card (the gesture's translateX persists across
  // cards otherwise).
  useEffect(() => {
    translateX.set(0);
    isAnimatingRef.set(false);
  }, [wordKey, translateX, isAnimatingRef]);

  const flashColors = useMemo(
    () => ({
      error: [
        withOpacity(colors.error, 0),
        withOpacity(colors.error, CARD_CONSTANTS.FLASH_OPACITY),
      ] as [string, string],
      success: [
        withOpacity(colors.success, 0),
        withOpacity(colors.success, CARD_CONSTANTS.FLASH_OPACITY),
      ] as [string, string],
    }),
    [colors.error, colors.success],
  );

  const swipeBackgroundStyle = useAnimatedStyle(() => {
    'worklet';
    const tx = translateX.get();
    const maxTranslation = SCREEN_WIDTH * CARD_CONSTANTS.MAX_TRANSLATION_RATIO;
    const progress = Math.min(Math.abs(tx) / maxTranslation, 1);
    const t = 1 - Math.pow(1 - progress, 2); // quadratic ease-out
    if (tx < 0) {
      return { backgroundColor: interpolateColor(t, [0, 1], flashColors.error) };
    }
    if (tx > 0) {
      return { backgroundColor: interpolateColor(t, [0, 1], flashColors.success) };
    }
    return { backgroundColor: colors.transparent };
  }, [flashColors.error, flashColors.success]);

  const frontStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    transform: [
      { perspective: LAYOUT.PERSPECTIVE.CARD },
      { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 0 : 1,
    transform: [
      { perspective: LAYOUT.PERSPECTIVE.CARD },
      { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` },
    ],
  }));

  // Reanimated 4: inline shared value in transform (no useAnimatedStyle wrapper).
  const cardSlideStyle = { transform: [{ translateX }] };

  return (
    <>
      {/* Swipe-direction flash, behind the word. */}
      <Animated.View style={[STATIC_STYLES.flashFill, swipeBackgroundStyle]} pointerEvents="none" />

      <GestureDetector gesture={panGesture}>
        <Animated.View style={STATIC_STYLES.fill}>
          <View style={STATIC_STYLES.centered}>
            <Animated.View
              style={[STATIC_STYLES.contentBox, cardSlideStyle, opacityStyle]}
              testID={testID}
            >
              {/* Answer face: the same Arabic with its English meaning revealed below. */}
              <Animated.View
                pointerEvents={revealed ? 'auto' : 'none'}
                style={[STATIC_STYLES.face, backStyle]}
              >
                <WordDisplay word={word} translation={answer} onWordPress={onReplayAudio} />
              </Animated.View>

              {/* Question face: the Arabic prompt alone. Tap anywhere to reveal. */}
              <Animated.View
                pointerEvents={revealed ? 'none' : 'auto'}
                style={[STATIC_STYLES.face, frontStyle]}
              >
                <Pressable
                  style={STATIC_STYLES.faceFill}
                  onPress={onReveal}
                  accessibilityRole="button"
                  accessibilityLabel={STRINGS.SHOW_ANSWER}
                >
                  <WordDisplay word={word} />
                </Pressable>
              </Animated.View>
            </Animated.View>
          </View>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

ReviewFlipCard.displayName = 'ReviewFlipCard';
