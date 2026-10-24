import type { ViewStyle } from 'react-native';
import { cubicBezier, Easing, ZoomIn } from 'react-native-reanimated';
import type { CSSAnimationTimingFunction } from 'react-native-reanimated';

import type { ReanimatedCSSAnimationStyle } from '@/types/ui/base.types';

/**
 * Timing configuration presets for animations
 */
export const TIMING_CONFIG = {
  FAST: {
    duration: 120, // Faster for more responsive feel
    easing: Easing.out(Easing.cubic), // More natural easing
  },
  MEDIUM: {
    duration: 200, // Faster than before for snappier feel
    easing: Easing.out(Easing.cubic), // More natural easing
  },
  SLOW: {
    duration: 300, // Slightly faster for better responsiveness
    easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Material Design easing
  },
  GENTLE: {
    duration: 250, // Faster for more responsive gentle animations
    easing: Easing.bezier(0.4, 0.0, 0.2, 1), // Natural gentle easing
  },
  ENTRANCE: {
    duration: 250, // Component entrance animations
    easing: Easing.out(Easing.cubic), // Natural entrance easing
  },
  PROGRESS: {
    duration: 400, // Progress bar animations
    easing: Easing.out(Easing.cubic), // Smooth progress easing
  },
  /**
   * A numeral counting to a new value. Long enough to be read as counting: the
   * snappy card spring this replaced settled in about 150ms, which is a swap,
   * not a count, and a learner back from a session saw the new number without
   * ever seeing it change.
   */
  COUNT: {
    duration: 700,
    easing: Easing.out(Easing.cubic),
  },
  FLIP: {
    duration: 320, // 3D card flip (reveal) — a touch slower than SLOW so the rotation reads
    easing: Easing.inOut(Easing.cubic), // Symmetric ease for a physical front→back turn
  },
  /**
   * A graded review card leaving the screen. Shared by the card's throw and the
   * review advance's dissolve so the flight and the fade are ONE motion —
   * previously the card sprang back to centre on a spring clock while a
   * separate setTimeout chain faded it out ~120ms later, two uncoordinated
   * timelines that visibly drifted apart whenever the JS thread was busy.
   */
  CARD_EXIT: {
    duration: 180,
    easing: Easing.out(Easing.cubic), // Decelerating throw — fast off the mark
  },
} as const;

/**
 * The curves above, for Reanimated's CSS API.
 *
 * The CSS API cannot take an `Easing` worklet, and it is not lenient about
 * strings either: a `'cubic-bezier(…)'` string throws everywhere but the
 * `transition` shorthand, so a curve has to be a `cubicBezier()` object. Nor is
 * CSS's `ease-out` the tokens' `Easing.out(Easing.cubic)` — it is
 * cubic-bezier(0, 0, 0.58, 1), much slower off the mark — so a CSS animation
 * timed to a token above but eased `'ease-out'` (or left on the `'ease'`
 * default) ran a different curve from the worklet it was meant to match.
 */
export const CSS_EASING = {
  /** `Easing.out(Easing.cubic)`: FAST, MEDIUM, ENTRANCE, PROGRESS, COUNT and CARD_EXIT. */
  OUT_CUBIC: cubicBezier(0.33, 1, 0.68, 1),
} as const;

/**
 * The verdict beat: the moment a graded review card confirms the outcome before
 * it leaves.
 *
 * Grading used to have no confirmation at all — you learned you were right
 * because the next word appeared. The green/red wash that existed was driven
 * entirely by swipe-drag distance, so it only spoke while a finger was down, and
 * it said "release now and it counts", which is a different statement from "that
 * was right". Two of the three grades (a voice-correct answer and "Guessed")
 * had no motion whatsoever: the card did not move, it stopped existing.
 *
 * Painting the confirmation at grade time did not work either. CARD_EXIT fades
 * on `Easing.out(Easing.cubic)`, which is fastest off the mark — the card is at
 * roughly 30% opacity 60ms in, so anything drawn there was gone before it
 * finished drawing. Hence BEAT: the card holds at full verdict strength first,
 * and only then does the existing exit run.
 *
 * The verdict is the ring and its haptic, nothing else. A colour wash over the
 * face and a scale pop / wince used to ride the same level; both repeated what
 * the ring already said, and the wash was a leftover of the removed swipe.
 */
export const VERDICT = {
  /**
   * How long the card holds at full verdict strength before it leaves, so the
   * confirmation is legible on its own rather than under a dissolve.
   *
   * Applied to the tap and voice paths. The restudy continue is exempt: its
   * verdict fired when the miss was graded and its ring has been sitting on the
   * card for the whole hold, which is a far longer moment than the beat could
   * buy — holding again would only desync the fade from the card's left exit,
   * which starts on that same tap.
   */
  BEAT: 140,
  /** Verdict rising to full strength. Fast, so the colour arrives as one event. */
  IGNITE: {
    duration: 90,
    easing: Easing.out(Easing.cubic),
  },
  /** Verdict releasing as the card leaves. Matched to CARD_EXIT so they land together. */
  DECAY: {
    duration: 180,
    easing: Easing.out(Easing.cubic),
  },
  /** Verdict falling back to its held level after a miss. */
  SETTLE: {
    duration: 220,
    easing: Easing.out(Easing.cubic),
  },
  /**
   * What a wrong answer keeps for the whole restudy hold, instead of decaying
   * to nothing. The card stays on screen to be re-studied, and a low steady red
   * is what makes it read as "this is the one you missed" while you study it.
   */
  RESIDUAL: 0.35,
  /**
   * Micro-shake on a miss the APP judged — a voice answer heard as another
   * word. Small and decaying — a wince, not a tantrum. A "Forgot" the learner
   * reported themselves does not shake: that is an honest answer, not an error.
   *
   * A damped sine rather than a sequence of timings between fixed offsets. The
   * four-step version (+5, −4, +2, 0 at 50ms each) put a corner on the velocity
   * curve at every reversal, and a card that changes direction instantly four
   * times reads as a rattle regardless of how small the offsets are. One phase
   * driven 0 → 1 linearly, shaped by `AMPLITUDE · e^(−DAMPING·p) · sin(2π·CYCLES·p)`,
   * spends the same energy with a continuous first derivative — the card
   * flinches and settles.
   *
   * The envelope is what makes DURATION safe to lengthen: by p = 0.5 the swing
   * is already under a fifth of AMPLITUDE, so the tail is motion the eye reads
   * as settling rather than as more shaking.
   */
  SHAKE: {
    /** Peak horizontal offset in points, at the first swing. */
    AMPLITUDE: 4,
    /**
     * The phase sweep itself, 0 → 1. Linear on purpose: the envelope already
     * decelerates the motion, and easing the phase on top of it would stretch
     * the first swing — the one that lands with the haptic — into a slow lean.
     */
    SWEEP: {
      duration: 420,
      easing: Easing.linear,
    },
    /** Full oscillations across the sweep. */
    CYCLES: 2.25,
    /** Exponential decay rate of the envelope over the 0 → 1 phase. */
    DAMPING: 4.2,
    /**
     * Counter-rotation in degrees, on the same phase and the same envelope.
     * A card that only translates slides; one that rotates a little as it goes
     * pivots, which is what makes the wince read as the card reacting rather
     * than the screen jogging.
     */
    TILT_DEG: 0.5,
  },
  /**
   * Rising-edge level at which the outcome haptic fires — about 55ms into the
   * ignite, as the colour reaches most of its strength, so the buzz and the
   * visual are one event.
   *
   * The haptic is fired from a `useAnimatedReaction` watching this crossing,
   * NOT from JS alongside the animation start. Those are two clocks and they
   * drift under load, which is the bug the review session's motion work already
   * removed once.
   */
  HAPTIC_AT: 0.6,
} as const;

/**
 * Coming back to the Practice tab: its figures hold what they showed when the
 * tab was covered, then play their changes in three beats, top to bottom — what
 * is due, what memory did with it, the habit numbers.
 *
 * The tab stays mounted under the review screen and refetches there, so without
 * the hold every number had already changed by the time anyone could see it.
 */
export const PRACTICE_REPLAY = {
  /** Lets the screen that was covering the tab get out of the way first. */
  START_DELAY: 400,
  /**
   * The longest the figures wait on a refetch still in flight, measured from the
   * return. A slow network must never leave stale numbers on screen.
   */
  MAX_WAIT: 1500,
  /** Gap between one beat and the next. */
  BEAT: 400,
} as const;

/**
 * A word's dot travelling along the memory constellation to where it now holds.
 *
 * One linear sweep drives every travelling dot. Each dot eases on its own slice
 * of it, so they leave as a stream rather than as a block.
 */
export const HORIZON_TRAVEL = {
  SWEEP: {
    duration: 1100,
    easing: Easing.linear,
  },
  /** The median rule sliding to where the typical word now sits. */
  MEDIAN: {
    duration: 1100,
    easing: Easing.inOut(Easing.cubic),
  },
  /** Share of the sweep the departures are spread across. */
  STAGGER: 0.4,
  /** How high a dot lifts at the top of its arc, in points. */
  ARC_LIFT: 16,
  /** Share of the sweep the rest of the field takes to dim, and to return. */
  DIM_RAMP: 0.15,
  /**
   * Above this many travelling dots the field regrows instead: a bulk change is
   * not a session, and that many arcs at once is noise rather than a story.
   */
  MAX_MOVERS: 160,
} as const;

/**
 * Spring configuration presets for common animations
 *
 * No `energyThreshold` on these. Reanimated 4 reads it as a fraction of the
 * spring's starting energy (default 6e-9); the 0.01 carried over from
 * Reanimated 3, where it was absolute, stopped them about 10% short of rest.
 */
export const SPRING_CONFIG = {
  /**
   * App-owned sheets. A spring, not a timing curve: gorhom hands a released
   * drag's velocity to the animation, and its `animate` util routes any config
   * holding `duration` or `easing` to `withTiming`, which drops that velocity —
   * a slow release used to lurch away at the curve's ~7x opening speed.
   * Damping ratio ~0.89 with clamping: no bounce, settled in about 200ms.
   * Physics parameters on purpose; a `{ duration, dampingRatio }` spring would
   * match the `duration` check and fall back to timing.
   */
  BOTTOM_SHEET: {
    stiffness: 500,
    damping: 40,
    mass: 1,
    overshootClamping: true,
  },
  BUTTON: {
    damping: 18, // Higher damping for smoother, less bouncy feel
    stiffness: 180, // Higher stiffness for more responsive feel
    mass: 0.9, // Slightly lighter for snappier response
    overshootClamping: false,
  },
  CARD: {
    damping: 20, // High damping - no bounce
    stiffness: 400, // Very high stiffness - instant response
    mass: 0.4, // Light mass - snappy
    overshootClamping: true, // No overshoot
  },
} as const;

/** Minimum duration for opacity animations */
export const MIN_OPACITY_DURATION = 1;

/**
 * Unified press scale constants for all interactive elements.
 * Values closer to 1.0 = subtler feedback, values further from 1.0 = stronger feedback.
 */
export const PRESS_SCALE = {
  /** Default press feedback for buttons (subtle) */
  BUTTON: 0.96,
  /** Moderate press for toggles and interactive words */
  MODERATE: 0.95,
  /** Strong press for icon buttons */
  STRONG: 0.9,
  /**
   * Wide controls — a full-width or capsule CTA, and every card.
   *
   * The invariant these numbers actually encode is constant EDGE TRAVEL, about
   * 2pt, not a constant ratio: STRONG on a 44pt icon button pulls each edge in
   * 2.2pt, BUTTON on a ~100pt hugging button 2.0pt. The same BUTTON value on a
   * 340pt pinned CTA moves each edge 6.8pt, which reads as the whole screen
   * flexing rather than as a button depressing. 0.99 puts a full-width control
   * back at 1.7pt, in line with the rest.
   *
   * Cards belong here for the same reason. A card is full-bleed by
   * construction — 351pt inside the 12pt screen padding on a 375pt screen — so
   * the 0.96 it used to carry moved each edge 7pt. `PRESS_SCALE.CARD` was also
   * byte-identical to DEFAULT and BUTTON, three names for one number, so it is
   * gone rather than retuned.
   */
  WIDE: 0.99,
  /** Scale up for drag feedback */
  DRAG_UP: 1.05,
} as const;

/** Default opacity reduction for card press animations */
export const CARD_PRESS_OPACITY = 0.97;

/**
 * How long a control ignores a repeat press after firing.
 *
 * Covers the gap a `loading` prop structurally cannot: `loading` only becomes
 * true one render after the press, and a determined double-tap lands inside
 * that window. 300ms is comfortably longer than a double-tap and shorter than
 * any deliberate second press.
 */
export const PRESS_LOCK_WINDOW_MS = 300;

/**
 * Multiplier for FlashList draw distance (overscroll rendering).
 * Value of 3 = render items up to 3x viewport height above/below visible area.
 * Higher values = smoother scrolling but more memory usage.
 * 3 is a balanced default for most list sizes.
 */
export const LIST_DRAW_DISTANCE_MULTIPLIER = 3;

/**
 * Scroll event throttle in milliseconds.
 * 8ms = 120fps (matches ProMotion displays on iPhone 13+).
 * Use 16ms (60fps) if performance is a concern on older devices.
 */
export const SCROLL_EVENT_THROTTLE = 8;

/**
 * Default toast notification visibility duration in milliseconds.
 * 4 seconds provides adequate reading time for most messages.
 */
export const DEFAULT_TOAST_DURATION = 4000;

/**
 * Visibility duration for a toast that explains why an action was REFUSED.
 * Longer than the default: a refusal arrives unrequested, carries a reason the
 * user has to read to act on, and is the only correction shown for an action
 * they believe they just completed.
 */
export const REFUSAL_TOAST_DURATION = 6000;

/**
 * General timing constants for delays, timeouts, and intervals
 */
export const TIMING_CONSTANTS = {
  /** Quick delays for UI feedback */
  QUICK_DELAY: 100,

  /** Standard medium delay */
  MEDIUM_DELAY: 300,

  /**
   * How long `dismissSheetThenNavigate` waits before opening the next screen.
   *
   * UIKit refuses to present anything from a controller that is still dismissing
   * one, so a navigation issued while a form sheet closes is dropped — on iOS
   * the memory sheet closed and the dictionary never opened, while Android ran
   * both happily. 300ms and 400ms were both tried and both still failed, so this
   * sits well clear of a sheet's slide-down instead of near it: the cost of
   * waiting too long is a beat of animation under a sheet that is visibly
   * closing, and the cost of waiting too little is a tap that does nothing.
   *
   * A `transitionEnd` listener beats this timer to the punch wherever the
   * platform delivers a closing event for the dismissed screen; Android does
   * not, so there this value is the whole mechanism.
   */
  SHEET_DISMISS_FALLBACK: 1000,

  /**
   * How long the article reader keeps the display on after the learner's last
   * touch (a scroll, a word tap) — 10 minutes. Learners read slowly: parsing a
   * sentence and recalling its words can pass well beyond the OS idle timeout
   * without a touch. Playback of the article holds the display on its own.
   */
  READER_KEEP_AWAKE_WINDOW: 10 * 60 * 1000,

  /** Animation transition delays */
  TRANSITION_DELAY: 150,

  /** Touch interaction delays */
  LONG_PRESS_DELAY: 500,

  /**
   * Long-press on a reader word: instant save to practice. Shorter than
   * LONG_PRESS_DELAY on purpose — long enough not to fire during scroll
   * hesitation, short enough to feel instant (RNGH's default is 500ms).
   */
  WORD_LONG_PRESS_DELAY: 400,

  /** The reader's word tooltip fading in — short enough that the transparency flash is imperceptible. */
  TOOLTIP_FADE_IN: 100,

  /**
   * Smoothing between the recorder's ~10 Hz mic-level buffers. Slightly longer
   * than the buffer interval so each level carries into the next without
   * visible steps; much longer and the meter lags the voice enough to feel
   * disconnected.
   */
  MIC_LEVEL_SMOOTHING: 130,

  /** Stagger animation delays for sequential reveals */
  STAGGER: {
    BASE: 50,
  },
} as const;

/**
 * Half a breath — one leg of a pulse that eases between two levels and back,
 * forever (`breatheStyle`).
 *
 * Three pulses, three tempos, kept as they shipped: nothing says they were
 * meant to match, and retiming a loop is a visible change. Named here so the
 * numbers stop living as literals in three files.
 */
export const BREATHE_HALF_PERIOD = {
  /** PulsatingLoader's ring. */
  LOADER: 750,
  /** The review card's meter while the microphone opens. */
  MIC_OPENING: 700,
  /** The reader tutorial's first-word marker (a Skia shared value, not CSS). */
  TUTORIAL_MARKER: 800,
} as const;

/** CSS `ease-in-out` as a worklet curve, for a breath driven by a shared value. */
export const BREATHE_EASING = Easing.bezier(0.42, 0, 0.58, 1);

/**
 * The mount fade-in every list row and screen body uses.
 *
 * Five call sites declared this same `from/to opacity` keyframe object inline,
 * differing only in the duration token and the fill mode. Keyframe blocks that
 * animate something else (a scale, the card entrance) are genuinely different
 * animations and stay where they are; a pulse is `breatheStyle` below.
 *
 * `backwards` holds the FROM frame during any delay before the animation runs —
 * what a staggered list row needs so it does not flash at full opacity first.
 * `forwards` holds the TO frame after it ends, which is what a screen body that
 * fades in once needs.
 *
 * Eased like the duration tokens it is handed (`CSS_EASING.OUT_CUBIC`); it used
 * to run on CSS's `ease` default. SLOW is the one token whose own curve IS CSS
 * `ease` — `Easing.bezier(0.25, 0.1, 0.25, 1)` — so a caller timing to SLOW
 * that wants its exact curve passes `'ease'`.
 */
export const fadeInStyle = (
  duration: number,
  animationFillMode: 'forwards' | 'backwards' = 'forwards',
  animationTimingFunction: CSSAnimationTimingFunction = CSS_EASING.OUT_CUBIC,
): ReanimatedCSSAnimationStyle => ({
  animationName: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  animationDuration: `${duration}ms`,
  animationFillMode,
  animationTimingFunction,
});

type BreatheFrame = Pick<ViewStyle, 'opacity' | 'transform'>;

/**
 * A pulse on Reanimated's CSS API: `from` to `to` and back, forever, on CSS
 * `ease-in-out`, one leg every `halfPeriodMs` (`BREATHE_HALF_PERIOD`).
 *
 * CSS-API animations ignore Reduce Motion (still true in Reanimated 4.7), so a
 * caller gates a breath that MOVES with `useMotionStyle`; one that only fades
 * plays either way.
 */
export const breatheStyle = (
  // Only what a breath animates. The full ViewStyle would not do: with Expo's
  // react-native-web augmentation loaded (expo-env.d.ts, present in local dev
  // and absent on CI), ViewStyle carries a web `animationTimingFunction` that
  // Reanimated's keyframe type rejects.
  from: BreatheFrame,
  to: BreatheFrame,
  halfPeriodMs: number,
): ReanimatedCSSAnimationStyle => ({
  animationName: { from, to },
  animationDuration: halfPeriodMs,
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationTimingFunction: 'ease-in-out',
});

const CHECK_POP_DAMPING_RATIO = 0.75;

/**
 * The tick that pops in when something is done: the session's checkmark and a
 * get-started row's check.
 *
 * A factory, not a shared builder. Reanimated's builder methods mutate the
 * instance they are called on and return it, so one shared instance would hand
 * CompletionScreen's `.withCallback` (its success haptic) to every other check.
 *
 * The duration goes INTO springify: a bare `.springify()` resets the duration
 * set before it, which ran the default physics spring for ~0.8s and landed the
 * completion haptic half a second after the pop. A perceptual 120ms ends at
 * ~180ms.
 *
 * Damping ratio 0.75: a small pop with one barely visible overshoot. That is
 * the ratio of Reanimated's Wiggly preset; its Gentle preset is 1, critically
 * damped, which these were once mislabelled as.
 */
export const checkPopEntering = () =>
  ZoomIn.springify(TIMING_CONFIG.FAST.duration).dampingRatio(CHECK_POP_DAMPING_RATIO);
