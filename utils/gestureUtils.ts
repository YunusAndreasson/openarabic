import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import type { DetentTone } from '@/utils/haptics';

// ===== GESTURE CONSTANTS =====
export const GESTURE_CONSTANTS = {
  /**
   * Fraction of the screen width the card must travel before a release commits
   * the swipe. Was 0.04 (~16pt on a 390pt screen) — small enough that an
   * imprecise tap or a scroll-adjacent nudge permanently graded a card. A
   * deliberate throw is ~a quarter of the screen, which is also where the
   * directional colour flash now reaches full strength.
   */
  SWIPE_THRESHOLD_RATIO: 0.22,
  /**
   * Distance the finger must travel before the pan ACTIVATES. Together with
   * ACTIVE_OFFSET_X this keeps the pan from stealing touches from the card's
   * own Pressable (tap to reveal / tap the word to replay audio) — at the old
   * 0.1pt any tap with a hair of drift became a pan.
   */
  MIN_DISTANCE: 10,
  MAX_TRANSLATION_RATIO: LAYOUT.OPACITY.HOVER,
  /** Flick speed (pt/s) that commits a swipe short of the distance threshold. */
  VELOCITY_THRESHOLD: 600,
  /**
   * Even a fast flick has to actually move the card this far (fraction of
   * screen width) before it counts. Velocity alone used to be sufficient, so a
   * quick jab that ended near the origin committed a grade — and because the
   * direction was read off `translationX` rather than the velocity, a jab
   * landing at exactly 0 always graded "Forgot".
   */
  FLICK_MIN_DISTANCE_RATIO: 0.06,
  /** How long the committed card takes to fly off screen. */
  EXIT_DURATION: TIMING_CONFIG.CARD_EXIT.duration,
} as const;

export interface SwipeCommitInput {
  /** Horizontal distance travelled since the gesture started, in points. */
  translationX: number;
  /** Horizontal velocity at release, in points/second. */
  velocityX: number;
  /** Distance that commits on its own, in points. */
  swipeThreshold: number;
  /** Screen width, for the flick distance floor. */
  screenWidth: number;
}

/**
 * Decide whether a released pan commits, and in which direction.
 *
 * A worklet so the gesture can call it on the UI thread, and a pure function so
 * the rules are testable without a gesture harness — the three conditions below
 * each fix a way the old inline check mis-graded a card:
 *
 * 1. A deliberate throw past the threshold commits. (Unchanged, but the
 *    threshold itself went from ~16pt to ~a quarter of the screen.)
 * 2. A flick commits only if it is fast, travelled a real distance, AND is
 *    still moving the way it travelled. Velocity used to be sufficient on its
 *    own, so a quick stationary jab graded the card.
 * 3. Direction comes from the travel, which is now guaranteed non-zero when we
 *    commit. Previously a release at exactly translationX === 0 fell through to
 *    `translationX > 0` — false — and silently graded "Forgot".
 */
export function resolveSwipeCommit({
  translationX,
  velocityX,
  swipeThreshold,
  screenWidth,
}: SwipeCommitInput): { commit: boolean; isRight: boolean } {
  'worklet';
  const flickFloor = screenWidth * GESTURE_CONSTANTS.FLICK_MIN_DISTANCE_RATIO;
  const isThrow = Math.abs(translationX) > swipeThreshold;
  const isFlick =
    Math.abs(velocityX) > GESTURE_CONSTANTS.VELOCITY_THRESHOLD &&
    Math.abs(translationX) > flickFloor &&
    Math.sign(velocityX) === Math.sign(translationX);

  return { commit: isThrow || isFlick, isRight: translationX > 0 };
}

/**
 * Which detent texture a swipe-to-grade threshold event should fire.
 *
 * Lives here with `resolveSwipeCommit` and `resolveCommitExit` for the same
 * reason they do: it is one of the gesture's decisions, and keeping it a pure
 * function means the rule can be exercised without a gesture harness.
 *
 * The tick is the swipe's ONLY haptic — release deliberately fires nothing,
 * because a second buzz for one decision is worse than an ambiguous first one.
 * So the tone has to carry the outcome as well as the crossing: crisp toward
 * the lighter grade, heavy toward the miss (matching how the grade bar already
 * weights its taps), soft on the way back out, because a detent that only
 * clicks going in is half a detent.
 */
export function resolveDetentTone(armed: boolean, isRight: boolean): DetentTone {
  if (!armed) return 'soft';
  return isRight ? 'crisp' : 'heavy';
}

/** Whether a committed card flies off screen, per direction. See
 *  `SwipeGestureOptions.exitOnCommit`. */
export type SwipeExitPolicy = boolean | { left: boolean; right: boolean };

/**
 * Whether the card leaves the screen for a commit in this direction.
 *
 * A commit is not always an exit: the review card's left swipe ("Forgot")
 * opens a restudy hold, so the card has to stay put and its exit is deferred to
 * the tap that ends the hold. With a single boolean the card flew off at full
 * opacity and then teleported back to centre, because nothing else was moving
 * it and the exit recentres on completion.
 *
 * A worklet (the gesture calls it on the UI thread) and pure, so the policy is
 * testable without a gesture harness — same reason `resolveSwipeCommit` above
 * lives here.
 */
export function resolveCommitExit(policy: SwipeExitPolicy, isRight: boolean): boolean {
  'worklet';
  if (typeof policy === 'boolean') return policy;
  return isRight ? policy.right : policy.left;
}

// ===== GESTURE CONFIGURATION =====
export const GESTURE_CONFIG = {
  MIN_DISTANCE: GESTURE_CONSTANTS.MIN_DISTANCE,
  ACTIVE_OFFSET_X: [-10, 10] as [number, number],
  /**
   * A drag this far off the horizontal fails the pan outright, so a vertical
   * flick can never be mistaken for a grade.
   */
  FAIL_OFFSET_Y: [-24, 24] as [number, number],
  // v2 Performance optimizations
  SIMULTANEOUS_GESTURES: true,
  SHOULD_CANCEL_WHEN_OUTSIDE: true,
} as const;
