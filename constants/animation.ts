import { Easing } from 'react-native-reanimated';

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
    energyThreshold: 0.01,
  },
  CARD: {
    damping: 20, // High damping - no bounce
    stiffness: 400, // Very high stiffness - instant response
    mass: 0.4, // Light mass - snappy
    overshootClamping: true, // No overshoot
    energyThreshold: 0.01,
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

  /** Pulsating animation duration */
  PULSATE_DURATION: 1500,

  /** Stagger animation delays for sequential reveals */
  STAGGER: {
    BASE: 50,
    FAST: 100,
  },
} as const;

/**
 * The mount fade-in every list row and screen body uses.
 *
 * Five call sites declared this same `from/to opacity` keyframe object inline,
 * differing only in the duration token and the fill mode. Keyframe blocks that
 * animate something else (a pulse, a scale, the card entrance) are genuinely
 * different animations and stay where they are.
 *
 * `backwards` holds the FROM frame during any delay before the animation runs —
 * what a staggered list row needs so it does not flash at full opacity first.
 * `forwards` holds the TO frame after it ends, which is what a screen body that
 * fades in once needs.
 */
export const fadeInStyle = (
  duration: number,
  animationFillMode: 'forwards' | 'backwards' = 'forwards',
): ReanimatedCSSAnimationStyle => ({
  animationName: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  animationDuration: `${duration}ms`,
  animationFillMode,
});
