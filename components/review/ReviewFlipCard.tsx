import type { ReactNode, Ref } from 'react';
import { useCallback, useEffect, useImperativeHandle, useMemo } from 'react';
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

import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@/components/ui/Icon';
import { SPRING_CONFIG, TIMING_CONFIG } from '@/constants/animation';
import { getThemeAwareElevation, LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useSwipeGesture } from '@/hooks/gestures/useSwipeGesture';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type {
  AnimatedStyleProp as AppAnimatedStyleProp,
  ReanimatedCSSAnimationStyle,
} from '@/types/ui/base.types';
import { withOpacity } from '@/utils/colorUtils';
import { resolveDetentTone } from '@/utils/gestureUtils';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import { detentFeedback } from '@/utils/haptics';

import { WordDisplay } from './WordDisplay';

const CARD_CONSTANTS = {
  /** Peak tint of the swipe wash, reached exactly AT the commit threshold. */
  FLASH_OPACITY: 0.22,
  /** Degrees of tilt at the commit threshold — enough to read as a thrown card. */
  MAX_TILT_DEG: 7,
} as const;

/**
 * A new card rises into place rather than materialising. State-driven (it
 * replays whenever the keyed wrapper remounts on a word change), so per the
 * split documented below it belongs on Reanimated's CSS API, and the builder is
 * hoisted to module scope so the React Compiler sees a stable value.
 *
 * Transform only. Opacity belongs to the session's shared fade (useReview's
 * `transparentStyle`, which the whole screen rides), and animating it here too
 * meant a new card's opacity was the PRODUCT of two curves on two clocks — 250ms
 * of keyframes on the inner layer against 180ms of timing on the outer one,
 * started by different events. The card visibly lagged the buttons below it.
 * Duration matches CARD_EXIT so the rise and the fade land on the same frame.
 */
const CARD_ENTRANCE: ReanimatedCSSAnimationStyle = {
  animationName: {
    from: { transform: [{ translateY: 18 }, { scale: 0.97 }] },
    to: { transform: [{ translateY: 0 }, { scale: 1 }] },
  },
  animationDuration: TIMING_CONFIG.CARD_EXIT.duration,
  animationTimingFunction: 'ease-out',
  animationFillMode: 'both',
};

/**
 * Left is "Forgot", which opens a restudy hold — the card stays on screen and
 * its exit is deferred to the tap that ends the hold (see onRestudyContinue in
 * app/review.tsx). Only the right-hand commit throws the card. Module scope
 * because the gesture worklet captures it and it feeds the Gesture memo.
 */
const CARD_EXIT_DIRECTIONS = { left: false, right: true } as const;

const STATIC_STYLES = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // The card box. Sized by its parent (app/review.tsx lays out header / card /
  // actions as a column) rather than the old fixed 360px, so the card grows
  // with the screen instead of floating in it.
  cardBox: {
    flex: 1,
    width: '100%',
  },
  entranceLayer: {
    flex: 1,
    width: '100%',
  },
  faceStack: {
    flex: 1,
    width: '100%',
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  facePressable: {
    flex: 1,
    width: '100%',
  },
  // Swipe wash. Lives INSIDE the card now (matched radius, no clipping needed)
  // instead of washing the whole screen — with a real surface the tint reads as
  // the card being marked, not the app changing colour.
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
  },
  verdictRow: {
    position: 'absolute',
    top: LAYOUT.SPACING.LARGE,
    left: LAYOUT.SPACING.LARGE,
    right: LAYOUT.SPACING.LARGE,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    height: LAYOUT.BORDER.WIDTH.THIN,
    alignSelf: 'stretch',
    marginVertical: LAYOUT.SPACING.LARGE,
  },
  answerBody: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  questionBody: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingTop: LAYOUT.SPACING.LARGE,
    gap: LAYOUT.SPACING.LARGE,
  },
  // Replay is an explicit control now. It used to be "tap the Arabic", which
  // was undiscoverable and only worked on the answer face.
  replayButton: {
    width: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    borderRadius: LAYOUT.BUTTON.HEIGHT.MEDIUM / 2,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meaning: {
    textAlign: 'center',
  },
});

/** Imperative surface for grades that did not come from a drag. */
export interface ReviewCardHandle {
  /** Play the same commit exit a swipe would. */
  commitTo: (direction: 'left' | 'right') => void;
}

interface ReviewFlipCardProps {
  /** Lets the grade bar drive the card's exit, so a tapped grade and a swiped
   *  one are the same motion. */
  ref?: Ref<ReviewCardHandle>;
  /** Arabic prompt (shown on both faces via WordDisplay). */
  word: string;
  /** English meaning, revealed below the Arabic on the answer face. */
  answer: string;
  /** Grammatical class, when known. Renders above the Arabic on both faces. */
  wordType?: string | null;
  /** Whether the card is flipped to its answer face. */
  revealed: boolean;
  /** Flip to the answer (tap the front face). */
  onReveal: () => void;
  /** Replay the Arabic prompt audio (tap the word). */
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
  /** Holding a forgotten card for a restudy beat: swiping is off and the whole
   *  answer face becomes "tap to continue". */
  restudying?: boolean;
  /** Leave the restudy hold (tap anywhere on the card). */
  onRestudyContinue?: () => void;
  /** Example sentence / context, below the meaning on the answer face. */
  answerSlot?: ReactNode;
  /** What the microphone is doing, on the question face. Takes the replay
   *  control's place while it is present — replaying the Arabic into an open
   *  mic is not something to offer, and it is the same slot either way so the
   *  face does not resize when the mic opens. */
  listeningSlot?: ReactNode;
  testID?: string;
}

/**
 * The review card.
 *
 * This used to be deliberately chrome-less — the Arabic floated directly on the
 * screen background, with the two faces sized by a fixed 360px box and their
 * contents placed at hardcoded offsets. That was changed on purpose: with only
 * a word and a gloss to show, the "card" was mostly empty space, and there was
 * nowhere to put the things that actually help recall (an example sentence, the
 * voice channel, a visible replay control). It is now a real surface, and the
 * things it carries are what justify it.
 *
 * Tap the front to flip to the answer face; once revealed, swipe left = Forgot
 * and right = Knew it (the centre "Guessed" lives on the grade bar).
 */
export function ReviewFlipCard({
  ref,
  word,
  answer,
  wordType,
  revealed,
  onReveal,
  onReplayAudio,
  opacityStyle,
  wordKey,
  isUpdating,
  onSwipeForgot,
  onSwipeKnewIt,
  restudying = false,
  onRestudyContinue,
  answerSlot,
  listeningSlot,
  testID,
}: ReviewFlipCardProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // The detent tick fires while the finger is still down, the frame the drag
  // crosses the line that decides the grade — the same threshold the commit
  // check and the colour flash use. Firing it after release (the old behaviour)
  // meant the haptic confirmed something the user had already committed to,
  // one JS-thread hop late.
  //
  // The tone carries the outcome, so the one tick says both "you've crossed"
  // and "into Forgot" / "into Knew it" — they used to feel identical. Weighting
  // the miss heavier matches how the grade bar already weights its taps. A
  // second haptic on release would name the grade too, but that double-buzzes
  // one decision, which is why the release path stays silent.
  const handleCommitArmedChange = useCallback((armed: boolean, isRight: boolean) => {
    detentFeedback(resolveDetentTone(armed, isRight));
  }, []);

  const {
    gesture: panGesture,
    translateX,
    isAnimatingRef,
    swipeThreshold,
    commitTo,
  } = useSwipeGesture({
    // Can't grade what you haven't seen — and during a restudy hold the grade
    // is already decided, so a swipe would fling a card that isn't leaving.
    enabled: revealed && !isUpdating && !restudying,
    onSwipeLeft: onSwipeForgot,
    onSwipeRight: onSwipeKnewIt,
    onCommitArmedChange: handleCommitArmedChange,
    exitOnCommit: CARD_EXIT_DIRECTIONS,
    springConfig: SPRING_CONFIG.CARD,
  });

  // Tapping "Forgot" and swiping left are the same decision, so they now leave
  // the same way. Exposed rather than handled internally because the grade bar
  // lives outside this component, next to the intervals it labels.
  useImperativeHandle(ref, () => ({ commitTo }), [commitTo]);

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

  // In dark mode getThemeAwareElevation zeroes shadowOpacity by design, so the
  // card cannot rely on a shadow to separate from the background there — it
  // steps up to elevation2 instead, which is what the rest of the app does.
  const surfaceStyle = useMemo(
    () => [
      {
        backgroundColor: isDarkMode ? colors.elevation2 : colors.card,
        borderColor: colors.cardBorder,
        shadowColor: colors.shadow,
      },
      getThemeAwareElevation('CARD', isDarkMode),
    ],
    [colors.card, colors.cardBorder, colors.shadow, colors.elevation2, isDarkMode],
  );

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

  // The wash says "something is happening"; these say WHICH grade. On the same
  // ramp as the tint, so the word is fully legible at the moment releasing would
  // commit it — which is the moment the learner can still change their mind.
  const forgotLabelStyle = useAnimatedStyle(() => {
    'worklet';
    const tx = translateX.get();
    return { opacity: tx < 0 ? Math.min(Math.abs(tx) / swipeThreshold, 1) : 0 };
  });

  const knewLabelStyle = useAnimatedStyle(() => {
    'worklet';
    const tx = translateX.get();
    return { opacity: tx > 0 ? Math.min(tx / swipeThreshold, 1) : 0 };
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
    <GestureDetector gesture={panGesture}>
      <Animated.View style={STATIC_STYLES.centered}>
        <Animated.View style={[STATIC_STYLES.cardBox, cardSlideStyle, opacityStyle]}>
          {/* Keyed so a new word replays the entrance. Only this wrapper
              remounts — the gesture, its shared values and the surfaces below
              are outside it and keep their identity across cards. */}
          <Animated.View
            key={wordKey}
            style={[STATIC_STYLES.entranceLayer, CARD_ENTRANCE]}
            testID={testID}
          >
            <View style={STATIC_STYLES.faceStack}>
              {/* Answer face: the same Arabic, its meaning, and the evidence. */}
              <Animated.View
                pointerEvents={revealed ? 'auto' : 'none'}
                style={[STATIC_STYLES.face, surfaceStyle, backStyle]}
              >
                {/* During a restudy hold the whole face is the continue target,
                    so the learner can carry on with one tap anywhere rather than
                    aiming at the button. Outside that hold there is no face-level
                    press — the grade bar owns the decision. */}
                <Pressable
                  style={STATIC_STYLES.facePressable}
                  onPress={restudying ? onRestudyContinue : undefined}
                  disabled={!restudying}
                  accessibilityRole={restudying ? 'button' : undefined}
                  accessibilityLabel={restudying ? STRINGS.RESTUDY_CONTINUE : undefined}
                >
                  <WordDisplay word={word} wordType={wordType} onWordPress={onReplayAudio}>
                    <View
                      style={[STATIC_STYLES.divider, { backgroundColor: colors.border }]}
                      pointerEvents="none"
                    />
                    <View style={STATIC_STYLES.answerBody}>
                      <ThemedText
                        type="heading2"
                        colorName="englishText"
                        style={STATIC_STYLES.meaning}
                      >
                        {answer ? capitalizeFirstLetter(answer) : answer}
                      </ThemedText>
                      {answerSlot}
                    </View>
                  </WordDisplay>
                </Pressable>
              </Animated.View>

              {/* Question face: the Arabic alone, with the voice channel below
                  it. Tap anywhere that isn't an interactive child to reveal. */}
              <Animated.View
                pointerEvents={revealed ? 'none' : 'auto'}
                style={[STATIC_STYLES.face, surfaceStyle, frontStyle]}
              >
                <Pressable
                  style={STATIC_STYLES.facePressable}
                  onPress={onReveal}
                  accessibilityRole="button"
                  accessibilityLabel={STRINGS.SHOW_ANSWER}
                >
                  {/* No onWordPress here on purpose. Tapping the word is the
                      most natural way to ask for the answer, and making the
                      hero a replay button on this face swallowed that tap —
                      the card played the audio again instead of flipping.
                      Replay gets its own control below; the whole question
                      face reveals.

                      No wordType either: "Verb" narrows the guess, and this is
                      the face the recall is tested on. WordDisplay reserves the
                      band regardless of content, which is what holds the Arabic
                      at an identical y through the flip. */}
                  <WordDisplay word={word}>
                    <View style={STATIC_STYLES.questionBody}>
                      {/* One slot, two occupants, the same height either way.
                          While the mic is working it shows what it is doing —
                          on the card, next to the word being answered, rather
                          than in the button the learner has to aim at. */}
                      {listeningSlot ??
                        (onReplayAudio ? (
                          <Pressable
                            onPress={onReplayAudio}
                            accessibilityRole="button"
                            accessibilityLabel={STRINGS.REPLAY_WORD_AUDIO}
                            hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
                            style={({ pressed }) => [
                              STATIC_STYLES.replayButton,
                              {
                                borderColor: colors.border,
                                opacity: pressed ? LAYOUT.OPACITY.PRESSED : LAYOUT.OPACITY.FULL,
                              },
                            ]}
                          >
                            <Ionicons
                              name="volume-medium-outline"
                              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                              color={colors.secondaryText}
                            />
                          </Pressable>
                        ) : null)}
                    </View>
                  </WordDisplay>
                </Pressable>
              </Animated.View>

              {/* Swipe feedback, above both faces so it tints whichever is up. */}
              <Animated.View
                style={[STATIC_STYLES.flashOverlay, swipeBackgroundStyle]}
                pointerEvents="none"
              />
              <View style={STATIC_STYLES.verdictRow} pointerEvents="none">
                <Animated.View style={forgotLabelStyle}>
                  <ThemedText skipDefaultColor type="label" style={{ color: colors.error }}>
                    {STRINGS.GRADE_FORGOT}
                  </ThemedText>
                </Animated.View>
                <Animated.View style={knewLabelStyle}>
                  <ThemedText skipDefaultColor type="label" style={{ color: colors.success }}>
                    {STRINGS.GRADE_KNEW_IT}
                  </ThemedText>
                </Animated.View>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

ReviewFlipCard.displayName = 'ReviewFlipCard';
