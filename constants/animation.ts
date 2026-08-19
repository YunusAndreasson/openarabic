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
 * How far a graded card is drawn out, as a fraction of screen width, before it
 * throws — and the distance the colour wash is scaled to, so the tint reaches
 * full strength exactly where the throw begins.
 *
 * Roughly a quarter of the screen. Small values read as a twitch rather than a
 * decision; the wash was once scaled to 0.8 of screen width, a distance the card
 * never travelled, so it stayed faint and told the user nothing.
 */
export const CARD_EXIT_DRAW_BACK_RATIO = 0.22;

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
   * Micro-shake on a miss. Small and decaying — a wince, not a tantrum.
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
  /** Scale pop on a correct answer. Barely there on purpose. */
  POP_SCALE: 1.025,
  /**
   * The miss's counterpart to POP_SCALE: the card draws in very slightly.
   *
   * A pass had a transform and a miss did not, so the two outcomes were not
   * symmetrical — one lifted, the other only changed colour and rattled. Rides
   * `verdictLevel` exactly as the pop does, so it settles with the ring to the
   * held RESIDUAL level instead of snapping back the moment the shake ends.
   */
  WINCE_SCALE: 0.99,
} as const;

/**
 * Spring configuration presets for common animations
 */
export const SPRING_CONFIG = {
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
  TOGGLE: {
    damping: 18, // Higher damping for smoother feel
    stiffness: 140, // Higher stiffness for more responsive feel
    mass: 0.4, // Lighter mass for snappier toggle feel
    overshootClamping: false,
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
 * General timing constants for delays, timeouts, and intervals
 */
export const TIMING_CONSTANTS = {
  /** Delay before navigation to allow press animation to complete */
  NAVIGATION_DELAY: 60, // TIMING_CONFIG.FAST.duration / 2

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

  /** Animation transition delays */
  TRANSITION_DELAY: 150,

  /** Touch interaction delays */
  LONG_PRESS_DELAY: 500,

  /** Pulsating animation duration */
  PULSATE_DURATION: 1500,

  /** Stagger animation delays for sequential reveals */
  STAGGER: {
    BASE: 50,
    INCREMENT: 40,
    FAST: 100,
    MEDIUM: 120,
    SLOW: 180,
    /** Completion screen button delay with metrics shown */
    BUTTON_WITH_METRICS: 320,
    /** Completion screen button delay without metrics */
    BUTTON_WITHOUT_METRICS: 220,
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
