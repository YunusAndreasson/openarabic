import { useCallback, useEffect, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { AnimatedStyle as ReanimatedAnimatedStyle } from 'react-native-reanimated';
import Animated, {
  cancelAnimation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { SPRING_CONFIG, TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, SCREEN_WIDTH, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useSwipeGesture } from '@/hooks/gestures/useSwipeGesture';
import { useColors } from '@/hooks/theme/useColors';
import type { AnimatedStyleProp as AppAnimatedStyleProp } from '@/types/ui/base.types';
import { withOpacity } from '@/utils/colorUtils';
import { detentFeedback } from '@/utils/haptics';

import { WordDisplay } from './WordDisplay';

const CARD_CONSTANTS = {
  WIDTH: SCREEN_WIDTH - LAYOUT.SPACING.LARGE * 2,
  HEIGHT: WORD_AREA_MIN_HEIGHT, // ~360
  FLASH_OPACITY: 0.35,
  /** Degrees of tilt at the commit threshold — enough to read as a thrown card. */
  MAX_TILT_DEG: 7,
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

  // The detent tick fires while the finger is still down, the frame the drag
  // crosses the line that decides the grade — the same threshold the commit
  // check and the colour flash use. Firing it after release (the old behaviour)
  // meant the haptic confirmed something the user had already committed to,
  // one JS-thread hop late, and felt identical for "Forgot" and "Knew it".
  const handleCommitArmedChange = useCallback(() => {
    detentFeedback();
  }, []);

  const {
    gesture: panGesture,
    translateX,
    isAnimatingRef,
    swipeThreshold,
  } = useSwipeGesture({
    enabled: revealed && !isUpdating, // can't grade what you haven't seen
    onSwipeLeft: onSwipeForgot,
    onSwipeRight: onSwipeKnewIt,
    onCommitArmedChange: handleCommitArmedChange,
    exitOnCommit: true,
    springConfig: SPRING_CONFIG.CARD,
  });

  // The flip is driven purely by React state, which is the case Reanimated 4's
  // docs put squarely in the CSS-transitions column: "Reach for CSS transitions
  // whenever an animation is driven by state ... it's the recommended place to
  // start", reserving the shared-value API for "gesture-driven or scroll-driven
  // interactions". The swipe below is gesture-driven and so stays on
  // useAnimatedStyle — the two halves of this card sit on opposite sides of
  // that line on purpose.
  //
  // Duration collapses to 0 on the way back so a new card snaps to its question
  // face rather than playing the reveal in reverse (revealed only goes false on
  // a card change). Face hiding is left to backfaceVisibility on STATIC_STYLES
  // .face — the primitive built for it — instead of an opacity step at the
  // rotation's midpoint.
  const flipTransition = {
    transitionProperty: 'transform',
    transitionDuration: revealed ? TIMING_CONFIG.FLIP.duration : 0,
    transitionTimingFunction: 'ease-in-out',
  } as const;

  const frontStyle = {
    ...flipTransition,
    transform: [
      { perspective: LAYOUT.PERSPECTIVE.CARD },
      { rotateY: revealed ? '180deg' : '0deg' },
    ],
  };

  const backStyle = {
    ...flipTransition,
    transform: [
      { perspective: LAYOUT.PERSPECTIVE.CARD },
      { rotateY: revealed ? '360deg' : '180deg' },
    ],
  };

  // Recentre for the new card. cancelAnimation first: the committed card is
  // still flying off screen when the next word lands, and a running withTiming
  // would overwrite a bare `set(0)` on its very next frame — leaving the fresh
  // card parked off screen.
  useEffect(() => {
    cancelAnimation(translateX);
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

  // Full tint is reached exactly AT the commit threshold, so the colour is a
  // readable "release now and it counts" signal rather than decoration. It used
  // to be scaled to 0.8 × screen width — a distance the card never travelled —
  // so the flash stayed faint no matter how far you dragged.
  const swipeBackgroundStyle = useAnimatedStyle(() => {
    'worklet';
    const tx = translateX.get();
    const progress = Math.min(Math.abs(tx) / swipeThreshold, 1);
    const t = 1 - Math.pow(1 - progress, 2); // quadratic ease-out
    if (tx < 0) {
      return { backgroundColor: interpolateColor(t, [0, 1], flashColors.error) };
    }
    if (tx > 0) {
      return { backgroundColor: interpolateColor(t, [0, 1], flashColors.success) };
    }
    return { backgroundColor: colors.transparent };
  });

  // Drag response: the card follows the finger and tilts into the throw, so the
  // gesture reads as physically moving a card rather than sliding a panel.
  // Needs useAnimatedStyle (not an inline shared value) because the tilt is
  // derived from translateX rather than being it.
  const cardSlideStyle = useAnimatedStyle(() => {
    'worklet';
    const tx = translateX.get();
    const tilt = interpolate(
      tx,
      [-swipeThreshold, 0, swipeThreshold],
      [-CARD_CONSTANTS.MAX_TILT_DEG, 0, CARD_CONSTANTS.MAX_TILT_DEG],
      'clamp',
    );
    return { transform: [{ translateX: tx }, { rotateZ: `${tilt}deg` }] };
  });

  return (
    <>
      {/* Swipe-direction flash, behind the word. Shares the card's fade so the
          tint leaves with the card it belongs to instead of snapping off when
          the swipe offset resets for the next word. */}
      <Animated.View
        style={[STATIC_STYLES.flashFill, swipeBackgroundStyle, opacityStyle]}
        pointerEvents="none"
      />

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
