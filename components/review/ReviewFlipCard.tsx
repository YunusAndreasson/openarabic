import type { ReactNode, Ref } from 'react';
import { useEffect, useImperativeHandle, useMemo } from 'react';
import type { TransformsStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AnimatedStyle as ReanimatedAnimatedStyle } from 'react-native-reanimated';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/primitives/ThemedText';
import { CSS_EASING, TIMING_CONFIG, VERDICT } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useSwipeGesture } from '@/hooks/gestures/useSwipeGesture';
import { useCardVerdict, VERDICT_TONE, type VerdictJudge } from '@/hooks/review/useCardVerdict';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { WordConfidence } from '@/types/review.types';
import type {
  AnimatedStyleProp as AppAnimatedStyleProp,
  ReanimatedCSSAnimationStyle,
} from '@/types/ui/base.types';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

import { WordDisplay } from './WordDisplay';

const CARD_CONSTANTS = {
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
 * What the face facing the viewer wears once the turn is over: nothing.
 *
 * The obvious way to write the two worklets below is to leave the perspective
 * in place for the whole range and let the angle land on 0° or 360°, which is
 * geometrically identical — points at z = 0 are unaffected by a rotation about
 * Y of a whole turn, and a perspective divide does nothing to a plane at z = 0
 * either. It is not identical to the compositor. On iOS, RN sets
 *
 *   layer.allowsEdgeAntialiasing = m12 != 0 || m21 != 0 || m34 != 0
 *
 * (RCTViewComponentView.mm), and `perspective` IS m34. So a face that keeps its
 * perspective at rest keeps a non-identity `layer.transform` and edge
 * antialiasing forever, and Core Animation has to resample it through a
 * projective map instead of blitting it 1:1. Any half-point offset anywhere in
 * the ancestor chain — and there is one, the card is `flex: 1` inside a column
 * with a percentage lead — then smears the whole face by half a pixel.
 *
 * On a 64px hero that is invisible. On the example sentence's ~24px vocalized
 * Arabic it is not: the hairline marks are one to two pixels tall, so half a
 * pixel of bilinear filtering is the difference between a kasra and a grey
 * smudge. It reads as the flip never quite having finished, which is precisely
 * what it is — the compositor is still treating a resting card as a surface in
 * mid-turn.
 *
 * Android does not have the bug and cannot be used to check it: RN there
 * decomposes the matrix into View properties, and HWUI takes the plain 2D path
 * whenever rotationX/rotationY are zero. Both faces screenshot pixel-identical.
 * facebook/react-native#32886 is the same symptom ("distorted and pixelated",
 * iOS only, does not reproduce on Android) reported against perspective.
 *
 * An empty array really is identity, not a zero matrix: `parseProcessedTransform`
 * loops over zero operations and returns `Transform{}`, whose default member is
 * `{1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1}` (graphics/Transform.h).
 *
 * Only the face square to the viewer drops its transform. The other one is
 * holding a half turn to stay hidden behind `backfaceVisibility`, and it isn't
 * drawn, so its filtering costs nothing. Every other layer in the chain
 * (cardBox, verdictLayer, entranceLayer) already rests at identity — this face
 * was the only one that did not.
 */
const RESTING_TRANSFORM: TransformsStyle['transform'] = [];

/**
 * One face of the card at this point in the turn. The faces turn together,
 * half a turn apart: the front rests at progress 0, the back at progress 1.
 *
 * Identity at rest, not `rotateY: 0deg` under a perspective — see
 * RESTING_TRANSFORM. Exact equality, not a threshold: an overshooting curve
 * (a spring, if FLIP is ever retuned) passes through the endpoint while still
 * moving, and a threshold would snap the transform to identity in the middle of
 * that. `withTiming` and the snap back both land on the endpoint exactly, so
 * only a genuinely resting card matches.
 */
export const faceStyle = (progress: number, restsAt: 0 | 1, restShadowOpacity: number) => {
  'worklet';
  const mask = seamMask(progress);
  return {
    opacity: mask,
    shadowOpacity: restShadowOpacity * mask,
    transform:
      progress === restsAt
        ? RESTING_TRANSFORM
        : [
            { perspective: LAYOUT.PERSPECTIVE.CARD },
            { rotateY: `${restsAt * 180 + progress * 180}deg` },
          ],
  };
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
 *
 * Applied conditionally on `useReducedMotion` — see `entranceStyle` below.
 */
const CARD_ENTRANCE: ReanimatedCSSAnimationStyle = {
  animationName: {
    from: { transform: [{ translateY: 18 }, { scale: 0.97 }] },
    to: { transform: [{ translateY: 0 }, { scale: 1 }] },
  },
  animationDuration: TIMING_CONFIG.CARD_EXIT.duration,
  // CARD_EXIT's own curve. CSS 'ease-out' is not Easing.out(Easing.cubic) —
  // see CSS_EASING — so the rise used to run a different curve from the fade
  // it is timed to land with.
  animationTimingFunction: CSS_EASING.OUT_CUBIC,
  animationFillMode: 'both',
};

/**
 * This card's shadow, and the app's one remaining set of legacy shadow props.
 *
 * Everything else goes through `getElevation`, which emits a CSS `boxShadow` —
 * one shadow that draws on both platforms and is not clipped by the card's own
 * `overflow: 'hidden'`. This card cannot: the two faces fade their shadow out
 * across the flip seam from a worklet (`frontStyle`/`backStyle` below), and
 * `boxShadow` has no scalar opacity channel to animate. Moving the shadow to a
 * non-rotating backing layer instead would need that layer to track the fold's
 * own `scaleX`, or it peeks out past a face turned edge-on.
 *
 * Matched to the CARD role's pre-migration values so the resting card still
 * reads the same as every BaseCard around it. If those are retuned, retune
 * these — there is no shared token to keep them honest any more.
 */
const FLIP_SHADOW = {
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.16,
  shadowRadius: 6,
} as const;

const STATIC_STYLES = StyleSheet.create({
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
  // The verdict's own transform layer, between the throw (cardBox) and the
  // entrance (entranceLayer). Three separate nodes because three separate
  // things animate the card's transform and none of them may share a value:
  // the throw owns translateX, the entrance owns CSS keyframes, and the verdict
  // owns the shake. Putting the shake on translateX would have the wince fight
  // the left exit a restudy continue starts on the same tap.
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
  // Each face owns a verdict ring so feedback follows its rotation. Keeping
  // it separate from the surface lets verdict and face opacity multiply.
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
  // The gap spaces the one pair the slot can hold: the disclosed answer and the
  // "you said" line under it. Every other occupant is a single node.
  questionBody: {
    width: '100%',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    paddingTop: LAYOUT.SPACING.XLARGE,
  },
  meaning: {
    textAlign: 'center',
  },
});

/** Imperative surface for a grade the card did not decide itself. */
export interface ReviewCardHandle {
  /**
   * Throw the card off screen in the direction of the grade. `holdMs` draws it
   * out to the throw's starting point first, so the outcome has a beat to be
   * read in before the card leaves.
   */
  commitTo: (direction: 'left' | 'right', holdMs?: number) => void;
  /**
   * Show an outcome — the ring and the haptic that goes with it.
   *
   * Called for a grade that commits, and also for a voice mishear, which is an
   * outcome the learner can still overturn and the one call that passes
   * `'recognizer'` (see `VerdictJudge`). Showing the same outcome twice is a
   * no-op, so a mishear followed by the grade that agrees with it marks the card
   * once.
   */
  playVerdict: (confidence: WordConfidence, judge?: VerdictJudge) => void;
  /**
   * Take an outcome back off the card without replacing it. For a voice retry:
   * the attempt that produced the mark is being discarded.
   */
  clearVerdict: () => void;
  /**
   * Undo the throw and verdict for a grade that the scheduler rejected while
   * preserving the card's revealed face so the learner can retry.
   */
  resetGradePresentation: () => void;
}

interface ReviewFlipCardProps {
  /** Lets the grade bar and the voice path drive the card's exit, so every
   *  committed grade leaves the same way. */
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
  /**
   * Replay the Arabic prompt audio. Wired to the word itself on both faces —
   * tapping the thing you want to hear again is the whole affordance, and it is
   * the one the card used to hide behind a speaker button that was on screen
   * for less than a second.
   *
   * Omitted, not disabled, when a replay would be wrong — the screen leaves it
   * out while the microphone is capturing, because the audio session refuses to
   * leave a live window, so the word would play on the quiet record-capable
   * route and straight into the recording. See `replayHeld` for that window.
   */
  onReplayAudio?: () => void;
  /**
   * The microphone holds the audio session, so the word must not replay — and
   * must not let the tap fall through to the face either, because on the
   * question face that tap reveals the answer. Hands-free opens the mic right
   * after every prompt, which is exactly when a learner reaches for the word to
   * hear it again; a fall-through there ended the recall test they were in the
   * middle of. While this is up the word takes the press and does nothing, with
   * no replay hint and no pressed state.
   */
  replayHeld?: boolean;
  /** Fade style applied during a grade advance (useReview.transparentStyle). */
  opacityStyle: ReanimatedAnimatedStyle<ViewStyle> | AppAnimatedStyleProp<ViewStyle>;
  /** Recentres the card and clears its verdict on a new word, without
   *  remounting the surfaces below the entrance layer. */
  wordKey?: string;
  /** Holding a forgotten card for a restudy beat: the whole answer face becomes
   *  "tap to continue". */
  restudying?: boolean;
  /** Leave the restudy hold (tap anywhere on the card). */
  onRestudyContinue?: () => void;
  /** Example sentence / context, below the meaning on the answer face. */
  answerSlot?: ReactNode;
  /**
   * Whatever the question face has to say right now, directly under the Arabic:
   * the microphone's state while it is working. Shares its slot with the
   * disclosed answer below, so the face does not resize as the state changes,
   * and collapses to nothing when neither has anything to show.
   */
  questionSlot?: ReactNode;
  /**
   * A voice result is up: show it on the QUESTION face, under the Arabic.
   *
   * The English appears there only once it has been disclosed — `answer` is
   * empty until then — at the size the answer face gives it. A voice miss
   * discloses without flipping the card: a retry has to stay on the question
   * face, and it is the word the learner just failed to recall, so it belongs
   * next to the Arabic rather than in a caption below the card. A hearing
   * failure ("Didn't catch that") discloses nothing, so its retry is a real
   * one; the caption then stands alone.
   *
   * Outranks `questionSlot`: when a result is up the microphone is idle and has
   * nothing to say.
   */
  discloseAnswer?: boolean;
  /**
   * One quiet line for the voice result: what the recognizer heard, or that it
   * heard nothing usable. Only shown with `discloseAnswer`.
   */
  discloseCaption?: string;
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
 * Tap the front to flip to the answer face; the grade bar below owns the three
 * grades. The card's own job on a grade is to confirm it with the verdict ring,
 * then leave.
 */
export function ReviewFlipCard({
  ref,
  word,
  answer,
  wordType,
  revealed,
  onReveal,
  onReplayAudio,
  replayHeld = false,
  opacityStyle,
  wordKey,
  restudying = false,
  onRestudyContinue,
  answerSlot,
  questionSlot,
  discloseAnswer = false,
  discloseCaption,
  testID,
}: ReviewFlipCardProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  const { translateX, isAnimatingRef, commitTo } = useSwipeGesture();

  const { verdictTone, verdictLevel, verdictShakePhase, playVerdict, resetVerdict } =
    useCardVerdict();

  // Tapping "Forgot" and swiping left are the same decision, so they now leave
  // the same way. Exposed rather than handled internally because the grade bar
  // lives outside this component, next to the intervals it labels — and the
  // verdict is exposed for the same reason: the screen owns which grades
  // actually commit, and only a committed grade has an outcome to show.
  //
  // playVerdict/resetVerdict are wrapped with the CURRENT `wordKey` here,
  // rather than exposing useCardVerdict's raw functions, so the imperative
  // caller (app/review.tsx) never has to know a card identity exists — see
  // activeKey in useCardVerdict for why the animation needs it.
  useImperativeHandle(
    ref,
    () => ({
      commitTo,
      playVerdict: (confidence: WordConfidence, judge?: VerdictJudge) =>
        playVerdict(confidence, wordKey ?? '', judge),
      clearVerdict: () => resetVerdict(wordKey ?? ''),
      resetGradePresentation: () => {
        cancelAnimation(translateX);
        translateX.set(0);
        isAnimatingRef.set(false);
        resetVerdict(wordKey ?? '');
      },
    }),
    [commitTo, playVerdict, resetVerdict, wordKey, translateX, isAnimatingRef],
  );

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

  /**
   * The entrance, minus the motion when the learner has asked for less of it.
   *
   * Every OTHER animation on this card already handles this for free and
   * silently: `withTiming` and the layout builders both default to
   * `ReduceMotion.System`, and Reanimated's response is to assign `toValue` on
   * the first frame and mark the animation finished (animation/util.js) — so
   * with the setting on, the flip is instant and the example sentence's FadeIn
   * is instant. The verdict is the deliberate exception: its ring is an opacity
   * change, so useCardVerdict runs it on `ReduceMotion.Never` — instant, its
   * level never crossed the threshold its haptic hangs off.
   *
   * The CSS API is the exception. Reanimated (still in 4.7) has no reduced-motion
   * handling in it at all — not in `lib/module/css`, not in `Common/cpp/reanimated/CSS`,
   * and `ReducedMotionConfig` only feeds the shared-value path. So the one thing
   * left moving on a reduce-motion device was this: a card that slides 18px and
   * scales while everything around it snaps. That is exactly backwards — a
   * translate-and-scale is the motion a vestibular-sensitive learner turned the
   * setting on for, and the cross-fade is the one they can tolerate.
   *
   * `animationFillMode: 'both'` is what makes dropping the style safe: the layer
   * simply renders at its natural, untransformed position, which is the `to`
   * keyframe.
   */
  const reduceMotion = useReducedMotion();
  const entranceStyle = reduceMotion ? null : CARD_ENTRANCE;

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
  }, [revealed, wordKey, flipProgress]);

  // Both faces turn together, half a turn apart, and both drop out across the
  // seam. backfaceVisibility still does the actual face hiding either side of
  // it — the mask only covers the band where neither face has a front OR a back
  // facing the viewer, just an edge.
  // The shadow is the other half of the artifact. An edge-on view still casts
  // its full blur, so in light and sepia the collapsed card wears a soft
  // vertical smear even once the fill itself is masked. Zero in dark mode by
  // design, which is why the line reads as a clean hairline there and as a
  // bruise in light. Fades on the same mask.
  const restShadowOpacity = isDarkMode ? 0 : FLIP_SHADOW.shadowOpacity;

  const frontStyle = useAnimatedStyle(() => {
    'worklet';
    return faceStyle(flipProgress.get(), 0, restShadowOpacity);
  });

  const backStyle = useAnimatedStyle(() => {
    'worklet';
    return faceStyle(flipProgress.get(), 1, restShadowOpacity);
  });

  // Dark mode carries no shadow, same as BaseCard. This card doesn't compensate
  // with a border or a step up to elevation2 either — `colors.card` is already
  // +4% L above the page background (sage.dark vs. sage.darkest), which is the
  // app's actual separation mechanism everywhere else (BaseCard, ArticleCard,
  // PlaylistItemCard). Stepping up to elevation2 and adding a border on top was
  // doing that job twice, and made this the only card in the app with either a
  // stroke or a background a full level lighter than plain `card`.
  const surfaceStyle = useMemo(
    () => [
      {
        backgroundColor: colors.card,
        shadowColor: colors.shadow,
        ...FLIP_SHADOW,
        shadowOpacity: restShadowOpacity,
      },
    ],
    [colors.card, colors.shadow, restShadowOpacity],
  );

  // Recentre for the new card. cancelAnimation first: the committed card is
  // still flying off screen when the next word lands, and a running withTiming
  // would overwrite a bare `set(0)` on its very next frame — leaving the fresh
  // card parked off screen.
  useEffect(() => {
    cancelAnimation(translateX);
    translateX.set(0);
    isAnimatingRef.set(false);
    // A miss holds its ring for the restudy hold, so unlike the throw offset the
    // verdict has no self-clearing animation — the new card has to clear it, or
    // the word after a forgotten one arrives already marked red. Passing
    // `wordKey` also claims this card as the active one, so a `playVerdict`
    // call for the card just left is recognised as stale and dropped instead
    // of painting over this card (see activeKey in useCardVerdict). Note this
    // is NOT what protects against the app being backgrounded mid-verdict —
    // see the remount in app/review.tsx's `remountEpoch` for that; a
    // shared-value reset here can be correct and still not repaint after a
    // background/foreground gap, which is a Reanimated-level gap this effect
    // cannot close by itself.
    resetVerdict(wordKey ?? '');
  }, [wordKey, translateX, isAnimatingRef, resetVerdict]);

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

  // The ring is the verdict alone — it never responds to the card's
  // displacement, so it decays with the outcome rather than with the throw.
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

  // The verdict's own transform: a decaying wince on a miss the recognizer
  // judged, and nothing for any other outcome — the ring already says which
  // grade it was, and a scale pop or draw-in said it a second time. Separate
  // from cardSlideStyle so it composes with the throw rather than overwriting it.
  //
  // The wince is a damped sine sampled from one linear phase, not a sequence of
  // fixed offsets — see VERDICT.SHAKE. Translation and tilt share the phase AND
  // the envelope, so the card pivots as it swings instead of sliding flat, and
  // both die together. At rest (phase 0) sin(0) is 0, so nothing has to be
  // special-cased when the verdict is cleared.
  const verdictTransformStyle = useAnimatedStyle(() => {
    'worklet';
    const phase = verdictShakePhase.get();
    const envelope = Math.exp(-VERDICT.SHAKE.DAMPING * phase);
    const swing = envelope * Math.sin(phase * VERDICT.SHAKE.CYCLES * 2 * Math.PI);

    return {
      transform: [
        { translateX: VERDICT.SHAKE.AMPLITUDE * swing },
        { rotateZ: `${VERDICT.SHAKE.TILT_DEG * swing}deg` },
      ],
    };
  });

  // The committed card's flight. A plain translation: it used to tilt into the
  // throw, which read as a hand flinging a card, but there is no hand any more —
  // the grade was decided on a button, and a card that pivots on its way out is
  // answering a question nobody asked.
  const cardSlideStyle = useAnimatedStyle(() => {
    'worklet';
    return { transform: [{ translateX: translateX.get() }] };
  });

  // The question face's one slot, resolved once: a voice result outranks the
  // microphone (a result is up only when the mic is idle), and most cards have
  // neither, which is the case the face has to collapse for. Within a result
  // the English shows only once disclosed — a hearing failure leaves `answer`
  // empty and shows its caption alone.
  const questionBody =
    discloseAnswer && (answer || discloseCaption) ? (
      <>
        {answer ? (
          <ThemedText type="heading2" colorName="englishText" style={STATIC_STYLES.meaning}>
            {capitalizeFirstLetter(answer)}
          </ThemedText>
        ) : null}
        {/* The transcript, next to the answer it is compared against. It used
            to sit in the action band, on a line the band reserved in every
            state for the one state that used it. */}
        {discloseCaption ? (
          <ThemedText
            type="caption"
            colorName="secondaryText"
            numberOfLines={2}
            style={STATIC_STYLES.meaning}
          >
            {discloseCaption}
          </ThemedText>
        ) : null}
      </>
    ) : (
      questionSlot
    );

  // Feedback belongs to the face so its geometry and seam opacity follow the
  // turn; ring opacity remains independent. Both faces draw the same ring.
  const faceFeedback = (
    <Animated.View style={[STATIC_STYLES.verdictRing, verdictRingStyle]} pointerEvents="none" />
  );

  return (
    <Animated.View style={STATIC_STYLES.centered}>
      <Animated.View style={[STATIC_STYLES.cardBox, cardSlideStyle, opacityStyle]}>
        {/* Verdict motion. Its own node so the mishear's shake composes with
              the throw above and the entrance below instead of overwriting
              either — three animations, three transforms, one card. */}
        <Animated.View style={[STATIC_STYLES.verdictLayer, verdictTransformStyle]}>
          {/* Keyed so a new word replays the entrance. Only this wrapper
              remounts — the exit's shared values and the surfaces below are
              outside it and keep their identity across cards. */}
          <Animated.View
            key={wordKey}
            style={[STATIC_STYLES.entranceLayer, entranceStyle]}
            testID={testID}
          >
            <View style={STATIC_STYLES.faceStack}>
              {/* Answer face: the same Arabic, its meaning, and the evidence. */}
              <Animated.View
                pointerEvents={revealed ? 'auto' : 'none'}
                accessibilityElementsHidden={!revealed}
                importantForAccessibility={revealed ? 'auto' : 'no-hide-descendants'}
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
                  <WordDisplay
                    word={word}
                    wordType={wordType}
                    onWordPress={onReplayAudio}
                    holdWordPress={replayHeld}
                  >
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
                {faceFeedback}
              </Animated.View>

              {/* Question face: the Arabic alone, with the voice channel below
                  it. Tap anywhere that isn't an interactive child to reveal. */}
              <Animated.View
                pointerEvents={revealed ? 'none' : 'auto'}
                accessibilityElementsHidden={revealed}
                importantForAccessibility={revealed ? 'no-hide-descendants' : 'auto'}
                style={[STATIC_STYLES.face, surfaceStyle, frontStyle]}
              >
                <Pressable
                  style={STATIC_STYLES.facePressable}
                  onPress={onReveal}
                  accessibilityRole="button"
                  accessibilityLabel={STRINGS.SHOW_ANSWER}
                >
                  {/* The word is the replay control on this face too, exactly
                      as it is on the answer face. While the microphone holds
                      the audio session it takes the press and does nothing
                      (`replayHeld`): falling through to this face would reveal
                      the answer in the middle of the recall it is testing.

                      It used to have its own speaker button below the Arabic,
                      which was worse than having nothing: the button's slot is
                      shared with the voice channel, so on a voice card it
                      appeared for the length of the prompt and was replaced by
                      the listening meter the moment the mic armed. A control
                      that is on screen for under a second is not a control.

                      The tap this takes off the face is the reveal, and that is
                      the intended trade rather than a cost: everything else on
                      the card still reveals, and "Show answer" is in the band
                      below. What the hero gains is the only gesture anyone
                      guesses for "say that again".

                      No wordType either: "Verb" narrows the guess, and this is
                      the face the recall is tested on. WordDisplay reserves the
                      band regardless of content, which is what holds the Arabic
                      at an identical y through the flip. */}
                  <WordDisplay word={word} onWordPress={onReplayAudio} holdWordPress={replayHeld}>
                    {/* One slot, two occupants. While the mic is working it
                        shows what it is doing; after a voice miss it shows the
                        English. Both belong here rather than under the card,
                        next to the word they are about — the answer in
                        particular was a caption in the action band, set at the
                        smallest type in the app, which is a strange place to
                        put the one thing the learner failed to recall.

                        Rendered only when occupied. The slot used to have a
                        third occupant to fall back on, so it was effectively
                        always full; with that gone the common case is an empty
                        wrapper, and the wrapper carries its own top padding. */}
                    {questionBody ? (
                      <View style={STATIC_STYLES.questionBody}>{questionBody}</View>
                    ) : null}
                  </WordDisplay>
                </Pressable>
                {faceFeedback}
              </Animated.View>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

ReviewFlipCard.displayName = 'ReviewFlipCard';
