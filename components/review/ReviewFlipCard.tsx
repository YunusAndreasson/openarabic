import { Ionicons } from '@/components/ui';
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
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { SPRING_CONFIG, TIMING_CONFIG, VERDICT } from '@/constants/animation';
import { getThemeAwareElevation, LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useSwipeGesture } from '@/hooks/gestures/useSwipeGesture';
import { useCardVerdict, VERDICT_TONE } from '@/hooks/review/useCardVerdict';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { WordConfidence } from '@/types/review.types';
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
  /**
   * Verdict ring thickness. The card has no resting border to recolour, so the
   * ring has to read as its own edge-lighting-up event on a plain face —
   * BORDER.WIDTH.FOCUSED (2), the app's standard emphasis width, rather than
   * NORMAL (1), which read as too faint an edge to register as a flash.
   */
  VERDICT_RING_WIDTH: 2,
  /**
   * The flip's seam — the band of the turn either side of 90° where the card is
   * edge-on and paints as a bright vertical line down its own centre.
   *
   * At 90° the projected width of a rotateY'd view is zero, but a view is still
   * rasterized at a minimum of about a pixel, so the card's opaque fill
   * collapses into one hairline at full brightness against the page. That
   * line is the artifact; there is no element drawing it, and
   * `backfaceVisibility` cannot help because the near face is legitimately
   * still the near face right up to 90°.
   *
   * The mask is on |progress − 0.5| rather than on time because progress is
   * what determines the geometry. FLIP eases in-out, so the card is moving at
   * roughly 3× its average rate through here — the whole masked band is about
   * 20ms of the 320ms turn, one to two frames, and it is the one to two frames
   * in which there is nothing to see anyway.
   */
  /** Beyond this, the card is wide enough to read as a card. Full opacity. */
  SEAM_HALF_WIDTH: 0.1,
  /** Within this, the card is a line. Not painted at all. */
  SEAM_FULL_HIDE: 0.055,
} as const;

/**
 * How much of the card to paint at this point in the turn: 1 everywhere except
 * across the seam, 0 at the degenerate middle. Module scope so both faces and
 * the overlays share one definition, and so the worklets capture a stable one.
 */
const seamMask = (progress: number): number => {
  'worklet';
  return interpolate(
    Math.abs(progress - 0.5),
    [CARD_CONSTANTS.SEAM_FULL_HIDE, CARD_CONSTANTS.SEAM_HALF_WIDTH],
    [0, 1],
    'clamp',
  );
};

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
  // The verdict's own transform layer, between the drag (cardBox) and the
  // entrance (entranceLayer). Three separate nodes because three separate
  // things animate the card's transform and none of them may share a value:
  // the drag owns translateX + tilt, the entrance owns CSS keyframes, and the
  // verdict owns the pop and the shake. Putting the shake on the drag's
  // translateX would have it fight the spring home on a swipe-left.
  verdictLayer: {
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
    // MEDIUM, not LARGE: matches BaseCard (the app's card radius everywhere
    // else) and the action buttons this card sits directly above — LARGE was
    // a one-off that made this the only card/button pair in the app whose
    // corners didn't match.
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    // No resting border. BaseCard, TodayCard, ArticleCard and PlaylistItemCard
    // all separate from the page with a flat elevation step (+4% L) and a
    // shadow, no stroke — see surfaceStyle below. A border was the other half
    // of this card's one-off chrome, alongside the LARGE radius above.
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
    // Kept in lockstep with `face`'s radius — see the comment there.
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  // The verdict ring. An overlay rather than the faces' own borderColor: there
  // are two faces, only one is ever facing the viewer, and recolouring both
  // means the answer to "what did I score" is hidden on the back of the card.
  verdictRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Kept in lockstep with `face`'s radius — see the comment there.
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: CARD_CONSTANTS.VERDICT_RING_WIDTH,
  },
  verdictRow: {
    position: 'absolute',
    top: LAYOUT.SPACING.LARGE,
    left: LAYOUT.SPACING.LARGE,
    right: LAYOUT.SPACING.LARGE,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // No rule between the Arabic and its meaning. A hairline across a card that
  // already has a border is a separator drawn twice, and it split the one thing
  // on this face that should read as a single thought — the word and what it
  // means. The break is spatial now; the type carries the hierarchy.
  answerBody: {
    width: '100%',
    alignItems: 'center',
    paddingTop: LAYOUT.SPACING.XLARGE,
  },
  // Content-sized, like answerBody: WordDisplay's trailer owns the slack below
  // the block now, so neither face's body may grow into it.
  questionBody: {
    width: '100%',
    alignItems: 'center',
    paddingTop: LAYOUT.SPACING.XLARGE,
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

/** Imperative surface for a grade the card did not decide itself. */
export interface ReviewCardHandle {
  /**
   * Play the same commit exit a swipe would. `holdMs` parks the card at the
   * threshold first, for grades that had no gesture to carry the moment.
   */
  commitTo: (direction: 'left' | 'right', holdMs?: number) => void;
  /**
   * Show an outcome — ring, wash, and the haptic that goes with them.
   *
   * Called for a grade that commits, and also for a voice mishear, which is an
   * outcome the learner can still overturn. Showing the same outcome twice is a
   * no-op, so a mishear followed by the grade that agrees with it marks the card
   * once.
   */
  playVerdict: (confidence: WordConfidence) => void;
  /**
   * Take an outcome back off the card without replacing it. For a voice retry:
   * the attempt that produced the mark is being discarded.
   */
  clearVerdict: () => void;
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
  /**
   * Whatever the question face has to say right now, directly under the Arabic:
   * the microphone's state while it is working, or the English answer after a
   * voice miss. Takes the replay control's place while it is present —
   * replaying the Arabic into an open mic is not something to offer — and it is
   * the same slot either way, so the face does not resize as the state changes.
   */
  questionSlot?: ReactNode;
  /**
   * Show the English under the Arabic on the QUESTION face, at the size the
   * answer face gives it. For a voice miss, which discloses the answer without
   * flipping the card — a retry has to stay on the question face, and it is the
   * word the learner just failed to recall, so it belongs next to the Arabic
   * rather than in a caption below the card.
   *
   * Outranks `questionSlot`: when a result is up the microphone is idle and has
   * nothing to say.
   */
  discloseAnswer?: boolean;
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
  questionSlot,
  discloseAnswer = false,
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

  const { verdictTone, verdictLevel, verdictShakePhase, playVerdict, resetVerdict } =
    useCardVerdict();

  // Tapping "Forgot" and swiping left are the same decision, so they now leave
  // the same way. Exposed rather than handled internally because the grade bar
  // lives outside this component, next to the intervals it labels — and the
  // verdict is exposed for the same reason: the screen owns which grades
  // actually commit, and only a committed grade has an outcome to show.
  useImperativeHandle(ref, () => ({ commitTo, playVerdict, clearVerdict: resetVerdict }), [
    commitTo,
    playVerdict,
    resetVerdict,
  ]);

  // The flip: 0 = question face, 1 = answer face.
  //
  // This is state-driven, which is the case Reanimated 4's docs put in the
  // CSS-transitions column, and it WAS a CSS transition per face. It moved to a
  // shared value for one reason: masking the seam (see CARD_CONSTANTS) needs the
  // rotation's value mid-flight, and a CSS transition deliberately exposes no
  // progress to read. The card's *entrance* is still state-driven with nothing
  // to read mid-flight, so it stays on the CSS API — the split in this file is
  // now "does anything need to sample the animation", not "what starts it".
  const flipProgress = useSharedValue(revealed ? 1 : 0);

  // Forward is the reveal. Backward snaps, because `revealed` only goes false on
  // a card change and a new card must arrive on its question face rather than
  // play the reveal in reverse — the same instant return the old
  // `transitionDuration: 0` gave.
  useEffect(() => {
    if (revealed) {
      flipProgress.set(withTiming(1, TIMING_CONFIG.FLIP));
      return;
    }
    cancelAnimation(flipProgress);
    flipProgress.set(0);
  }, [revealed, flipProgress]);

  // Both faces turn together, half a turn apart, and both drop out across the
  // seam. backfaceVisibility still does the actual face hiding either side of
  // it — the mask only covers the band where neither face has a front OR a back
  // facing the viewer, just an edge.
  // The shadow is the other half of the artifact. An edge-on view still casts
  // its full 6pt blur, so in light and sepia the collapsed card wears a soft
  // vertical smear even once the fill itself is masked. Zero in dark mode by
  // design, which is why the line reads as a clean hairline there and as a
  // bruise in light. Fades on the same mask.
  const restShadowOpacity = useMemo(
    () => getThemeAwareElevation('CARD', isDarkMode).shadowOpacity,
    [isDarkMode],
  );

  const frontStyle = useAnimatedStyle(() => {
    'worklet';
    const progress = flipProgress.get();
    const mask = seamMask(progress);
    return {
      opacity: mask,
      shadowOpacity: restShadowOpacity * mask,
      transform: [{ perspective: LAYOUT.PERSPECTIVE.CARD }, { rotateY: `${progress * 180}deg` }],
    };
  });

  const backStyle = useAnimatedStyle(() => {
    'worklet';
    const progress = flipProgress.get();
    const mask = seamMask(progress);
    return {
      opacity: mask,
      shadowOpacity: restShadowOpacity * mask,
      transform: [
        { perspective: LAYOUT.PERSPECTIVE.CARD },
        { rotateY: `${180 + progress * 180}deg` },
      ],
    };
  });

  // The overlays are siblings of the faces, not children, so they do not rotate:
  // without this they stay full-size rounded rectangles around a card that has
  // folded to nothing. A swipe can begin while the flip is still running (the
  // gesture arms the moment `revealed` flips, not when the turn ends), so the
  // wash and the grade labels really can be lit mid-fold.
  const seamStyle = useAnimatedStyle(() => {
    'worklet';
    return { opacity: seamMask(flipProgress.get()) };
  });

  // In dark mode getThemeAwareElevation zeroes shadowOpacity by design, same
  // as it does for BaseCard. BaseCard doesn't compensate with a border or a
  // step up to elevation2 either — `colors.card` is already +4% L above the
  // page background (sage.dark vs. sage.darkest), which is the app's actual
  // separation mechanism everywhere else (BaseCard, ArticleCard,
  // PlaylistItemCard). Stepping up to elevation2 and adding a border on top
  // was doing that job twice, and made this the only card in the app with
  // either a stroke or a background a full level lighter than plain `card`.
  const surfaceStyle = useMemo(
    () => [
      {
        backgroundColor: colors.card,
        shadowColor: colors.shadow,
      },
      getThemeAwareElevation('CARD', isDarkMode),
    ],
    [colors.card, colors.shadow, isDarkMode],
  );

  // Recentre for the new card. cancelAnimation first: the committed card is
  // still flying off screen when the next word lands, and a running withTiming
  // would overwrite a bare `set(0)` on its very next frame — leaving the fresh
  // card parked off screen.
  useEffect(() => {
    cancelAnimation(translateX);
    translateX.set(0);
    isAnimatingRef.set(false);
    // Belt and braces with the `revealed` effect above: a new card must never
    // arrive mid-turn or already turned. Both paths snap to 0 and the card is
    // riding the advance fade at opacity 0 while this runs, so a redundant set
    // costs nothing and a missed one would show the answer face for a frame.
    cancelAnimation(flipProgress);
    flipProgress.set(0);
    // A miss holds its ring for the restudy hold, so unlike the drag offset the
    // verdict has no self-clearing animation — the new card has to clear it, or
    // the word after a forgotten one arrives already marked red.
    resetVerdict();
  }, [wordKey, translateX, isAnimatingRef, resetVerdict, flipProgress]);

  const flashColors = useMemo(
    () => ({
      error: [
        withOpacity(colors.error, 0),
        withOpacity(colors.error, CARD_CONSTANTS.FLASH_OPACITY),
      ] as [string, string],
      warning: [
        withOpacity(colors.warning, 0),
        withOpacity(colors.warning, CARD_CONSTANTS.FLASH_OPACITY),
      ] as [string, string],
      success: [
        withOpacity(colors.success, 0),
        withOpacity(colors.success, CARD_CONSTANTS.FLASH_OPACITY),
      ] as [string, string],
    }),
    [colors.error, colors.warning, colors.success],
  );

  // The ring's three hues, resolved in JS and picked per-frame on the UI thread
  // (the chart components do the same). Opacity carries the animation, so these
  // are the solid colours.
  const ringColors = useMemo(
    () => ({
      correct: colors.success,
      almost: colors.warning,
      wrong: colors.error,
    }),
    [colors.error, colors.warning, colors.success],
  );

  // The wash, now serving two masters.
  //
  // While a finger is down it is PREDICTIVE: full tint is reached exactly AT
  // the commit threshold, so the colour says "release now and it counts". (It
  // used to be scaled to 0.8 × screen width — a distance the card never
  // travelled — so it stayed faint no matter how far you dragged.)
  //
  // After a grade commits it is CONFIRMATORY, driven by the verdict instead.
  // The drag still wins while it is the stronger of the two, so a swipe hands
  // over to its own verdict without the colour dipping between them.
  const washStyle = useAnimatedStyle(() => {
    'worklet';
    const tx = translateX.get();
    const dragProgress = Math.min(Math.abs(tx) / swipeThreshold, 1);
    const drag = 1 - Math.pow(1 - dragProgress, 2); // quadratic ease-out
    const verdict = verdictLevel.get();
    const tone = verdictTone.get();

    // A drag is only allowed to name the colour while it is actually leading;
    // otherwise the verdict does, so a card thrown right that graded "Guessed"
    // (voice near-match) washes amber rather than green.
    const useDrag = drag >= verdict && tx !== 0;
    const t = Math.max(drag, verdict);
    if (t === 0) {
      return { backgroundColor: colors.transparent };
    }

    if (useDrag) {
      return {
        backgroundColor: interpolateColor(
          t,
          [0, 1],
          tx < 0 ? flashColors.error : flashColors.success,
        ),
      };
    }

    if (tone === VERDICT_TONE.CORRECT) {
      return { backgroundColor: interpolateColor(t, [0, 1], flashColors.success) };
    }
    if (tone === VERDICT_TONE.ALMOST) {
      return { backgroundColor: interpolateColor(t, [0, 1], flashColors.warning) };
    }
    if (tone === VERDICT_TONE.WRONG) {
      return { backgroundColor: interpolateColor(t, [0, 1], flashColors.error) };
    }
    return { backgroundColor: colors.transparent };
  });

  // The ring is the verdict alone — it never responds to a drag, because a drag
  // is a question and this is the answer.
  const verdictRingStyle = useAnimatedStyle(() => {
    'worklet';
    const tone = verdictTone.get();
    if (tone === VERDICT_TONE.NONE) {
      return { opacity: 0, borderColor: colors.transparent };
    }
    return {
      opacity: verdictLevel.get(),
      borderColor:
        tone === VERDICT_TONE.CORRECT
          ? ringColors.correct
          : tone === VERDICT_TONE.ALMOST
            ? ringColors.almost
            : ringColors.wrong,
    };
  });

  // The verdict's own transform: a small lift on a pass, a decaying wince on a
  // miss. Separate from cardSlideStyle so it composes with the drag and with
  // the spring home rather than overwriting either.
  //
  // The wince is a damped sine sampled from one linear phase, not a sequence of
  // fixed offsets — see VERDICT.SHAKE. Translation and tilt share the phase AND
  // the envelope, so the card pivots as it swings instead of sliding flat, and
  // both die together. At rest (phase 0) sin(0) is 0, so nothing has to be
  // special-cased when the verdict is cleared.
  const verdictTransformStyle = useAnimatedStyle(() => {
    'worklet';
    const tone = verdictTone.get();
    const level = verdictLevel.get();
    const phase = verdictShakePhase.get();
    const envelope = Math.exp(-VERDICT.SHAKE.DAMPING * phase);
    const swing = envelope * Math.sin(phase * VERDICT.SHAKE.CYCLES * 2 * Math.PI);

    // Both outcomes now move: a pass swells, a miss draws in. Only one of the
    // two can be showing, and NONE leaves the card at rest.
    const scale =
      tone === VERDICT_TONE.CORRECT
        ? 1 + (VERDICT.POP_SCALE - 1) * level
        : tone === VERDICT_TONE.WRONG
          ? 1 + (VERDICT.WINCE_SCALE - 1) * level
          : 1;

    return {
      transform: [
        { translateX: VERDICT.SHAKE.AMPLITUDE * swing },
        { rotateZ: `${VERDICT.SHAKE.TILT_DEG * swing}deg` },
        { scale },
      ],
    };
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
          {/* Verdict motion. Its own node so the pop and the shake compose with
              the drag above and the entrance below instead of overwriting
              either — three animations, three transforms, one card. */}
          <Animated.View style={[STATIC_STYLES.verdictLayer, verdictTransformStyle]}>
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
                        {/* One slot, three occupants. While the mic is working
                          it shows what it is doing; after a voice miss it shows
                          the English. Both belong here rather than under the
                          card, next to the word they are about — the answer in
                          particular was a caption in the action band, set at
                          the smallest type in the app, which is a strange place
                          to put the one thing the learner failed to recall.
                          Falls back to the replay control. */}
                        {discloseAnswer && answer ? (
                          <ThemedText
                            type="heading2"
                            colorName="englishText"
                            style={STATIC_STYLES.meaning}
                          >
                            {capitalizeFirstLetter(answer)}
                          </ThemedText>
                        ) : (
                          (questionSlot ??
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
                              {/* `icon`, not `secondaryText`: replay is a
                                  secondary control on a face whose whole job is
                                  to show one word, and a near-white glyph gave
                                  it the weight of a second subject. */}
                              <Ionicons
                                name="volume-medium-outline"
                                size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                                color={colors.icon}
                              />
                            </Pressable>
                          ) : null))
                        )}
                      </View>
                    </WordDisplay>
                  </Pressable>
                </Animated.View>

                {/* Swipe and verdict feedback, above both faces so it marks
                  whichever is up. These do not rotate with the faces, so each
                  rides the seam mask as well — otherwise a wash or a ring lit
                  by a swipe that began mid-flip keeps its full rectangle while
                  the card it belongs to has folded away. Nested opacities
                  multiply, which is exactly the wanted behaviour. */}
                <Animated.View
                  style={[STATIC_STYLES.flashOverlay, washStyle, seamStyle]}
                  pointerEvents="none"
                />
                <Animated.View
                  style={[STATIC_STYLES.verdictRing, verdictRingStyle, seamStyle]}
                  pointerEvents="none"
                />
                <Animated.View style={[STATIC_STYLES.verdictRow, seamStyle]} pointerEvents="none">
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
                </Animated.View>
              </View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

ReviewFlipCard.displayName = 'ReviewFlipCard';
