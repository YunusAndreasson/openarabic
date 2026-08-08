import { useCallback, useMemo } from 'react';
import type { PanGesture } from 'react-native-gesture-handler';
import { Gesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { cancelAnimation, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { SPRING_CONFIG, TIMING_CONFIG } from '@/constants/animation';
import { SCREEN_WIDTH } from '@/constants/layout';
import type { SwipeExitPolicy } from '@/utils/gestureUtils';
import {
  GESTURE_CONFIG,
  GESTURE_CONSTANTS,
  resolveCommitExit,
  resolveSwipeCommit,
} from '@/utils/gestureUtils';

export interface SwipeGestureOptions {
  enabled?: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeComplete?: (isRight: boolean) => void;
  onGestureBegin?: () => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
  /**
   * Fired the frame the drag crosses the commit threshold (`armed: true`) and
   * again if it falls back below it (`armed: false`). This is the hook for
   * threshold haptics: the feedback then lands while the finger is still down,
   * at the exact moment the outcome is decided, instead of after release.
   */
  onCommitArmedChange?: (armed: boolean, isRight: boolean) => void;
  /**
   * Fly the card off screen in the swipe direction on commit instead of
   * springing it back to centre. A card that returns home contradicts the
   * gesture the user just made.
   *
   * Per-direction because a commit does not always mean the card leaves: the
   * review card's left swipe ("Forgot") opens a restudy hold, so the card has
   * to stay on screen and its exit is deferred to the tap that ends the hold.
   * With a single boolean that card flew off at full opacity and then snapped
   * back to centre, because nothing else was moving it.
   *
   * Pass a plain object (hoisted to module scope, not an inline literal): it is
   * captured by the gesture worklet and it is a dependency of the memo that
   * builds the Gesture.
   */
  exitOnCommit?: SwipeExitPolicy;
  minDistance?: number;
  activeOffsetX?: [number, number];
  failOffsetY?: [number, number];
  swipeThresholdRatio?: number;
  maxTranslationRatio?: number;
  springConfig?: typeof SPRING_CONFIG.CARD;
}

export interface SwipeGestureResult {
  gesture: PanGesture;
  translateX: SharedValue<number>;
  isAnimatingRef: SharedValue<boolean>;
  /**
   * The commit distance in points. Exposed so the visual response (colour
   * flash, tilt, scale) can be driven by the SAME number that decides the
   * grade — previously the flash was scaled to a max-drag constant the card
   * never reached, so it stayed faint and told the user nothing about whether
   * releasing would commit.
   */
  swipeThreshold: number;
  resetPosition: () => void;
  /**
   * Play the commit exit for a grade that came from a tap rather than a drag,
   * so both input paths produce the same motion. Ignored while a committed card
   * is already flying off.
   */
  commitTo: (direction: 'left' | 'right') => void;
}

/**
 * Pan-to-commit swipe, driven entirely on the UI thread.
 *
 * Design notes (validated against the Gesture Handler / Reanimated docs):
 * - Reset lives in `onFinalize`, not only `onEnd`. Per the Gesture Handler
 *   docs `onEnd` "will be called only if the handler was previously in the
 *   active state", while `onFinalize` runs "when the handler finalizes
 *   handling the gesture — the gesture was recognized and has finished or it
 *   failed to recognize". A pan that activated and was then cancelled (system
 *   back-gesture, another handler winning, app backgrounding) used to strand
 *   the card off-centre with its colour flash stuck on.
 * - A commit needs distance AND direction agreement. Velocity alone used to be
 *   enough, and the direction was read off `translationX`, so a fast jab that
 *   ended near the origin silently graded — always "Forgot" when it landed on
 *   exactly 0.
 */
export const useSwipeGesture = (options: SwipeGestureOptions): SwipeGestureResult => {
  const {
    enabled = true,
    onSwipeLeft,
    onSwipeRight,
    onSwipeComplete,
    onGestureBegin,
    onGestureStart,
    onGestureEnd,
    onCommitArmedChange,
    exitOnCommit = false,
    minDistance = GESTURE_CONFIG.MIN_DISTANCE,
    activeOffsetX = GESTURE_CONFIG.ACTIVE_OFFSET_X,
    failOffsetY = GESTURE_CONFIG.FAIL_OFFSET_Y,
    swipeThresholdRatio = GESTURE_CONSTANTS.SWIPE_THRESHOLD_RATIO,
    maxTranslationRatio = GESTURE_CONSTANTS.MAX_TRANSLATION_RATIO,
    springConfig = SPRING_CONFIG.CARD,
  } = options;

  const translateX = useSharedValue(0);
  /**
   * True only while a COMMITTED card is flying off screen. That exit is the one
   * animation the user must not be able to grab back; the return-home spring is
   * deliberately interruptible (see onStart).
   */
  const isAnimatingRef = useSharedValue(false);
  /** Card position when the current drag picked it up (the pan's origin). */
  const startX = useSharedValue(0);
  /** -1 / 0 / 1 — which side (if any) the drag is currently armed to commit. */
  const armedSide = useSharedValue(0);
  /** True once onEnd has decided this gesture, so onFinalize doesn't re-reset. */
  const settledRef = useSharedValue(false);
  /**
   * This gesture began while a committed card was still flying off, so it is
   * latched off for its whole lifetime. Checking `isAnimatingRef` per-frame is
   * not enough: the exit clears that flag mid-drag, at which point the gesture
   * would spring to life and yank the INCOMING card to an offset captured off
   * the departing one.
   */
  const ignoreGestureRef = useSharedValue(false);

  const swipeThreshold = SCREEN_WIDTH * swipeThresholdRatio;

  // Interruptible return-home, same as a below-threshold release.
  const resetPosition = useCallback(() => {
    'worklet';
    translateX.set(withSpring(0, springConfig));
  }, [translateX, springConfig]);

  // JS-only callback for swipe actions (reset stays on UI thread)
  const handleSwipeAction = useCallback(
    (isRight: boolean) => {
      if (isRight) {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }

      if (onSwipeComplete) {
        onSwipeComplete(isRight);
      }
    },
    [onSwipeLeft, onSwipeRight, onSwipeComplete],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .minDistance(minDistance)
        .activeOffsetX(activeOffsetX)
        .failOffsetY(failOffsetY)
        .onBegin(() => {
          'worklet';
          settledRef.set(false);
          armedSide.set(0);
          // A touch that lands mid-exit belongs to no card — the outgoing one
          // is gone and the incoming one has not arrived yet.
          ignoreGestureRef.set(isAnimatingRef.get());
          if (onGestureBegin) {
            scheduleOnRN(onGestureBegin);
          }
        })
        .onStart(event => {
          'worklet';
          // Pick the card up exactly where it currently sits, so a drag started
          // while the return-home spring is still running takes over seamlessly
          // instead of being ignored (the card used to go dead for the ~200ms
          // the spring took to settle) or snapping to the finger's zero-delta
          // origin. Subtracting the activation travel makes the hand-off exact:
          // on this frame startX + translationX === the card's present offset.
          // This is the `offset` pattern from Reanimated's gesture docs.
          if (!ignoreGestureRef.get()) {
            startX.set(translateX.get() - (event.translationX ?? 0));
          }
          if (onGestureStart) {
            scheduleOnRN(onGestureStart);
          }
        })
        .onUpdate(event => {
          'worklet';
          if (ignoreGestureRef.get() || isAnimatingRef.get() || event.translationX === undefined) {
            return;
          }

          const maxTranslation = SCREEN_WIDTH * maxTranslationRatio;
          const offset = startX.get() + event.translationX;
          const clampedTranslation = Math.max(-maxTranslation, Math.min(maxTranslation, offset));
          translateX.set(clampedTranslation);

          // Threshold latch: only notify on a transition, so the haptic fires
          // once per crossing rather than every frame past the line.
          const nextArmed =
            Math.abs(clampedTranslation) >= swipeThreshold ? Math.sign(clampedTranslation) : 0;
          if (nextArmed !== armedSide.get()) {
            armedSide.set(nextArmed);
            if (onCommitArmedChange) {
              scheduleOnRN(onCommitArmedChange, nextArmed !== 0, nextArmed > 0);
            }
          }
        })
        .onEnd((event, success) => {
          'worklet';
          settledRef.set(true);
          armedSide.set(0);

          if (
            ignoreGestureRef.get() ||
            isAnimatingRef.get() ||
            event.translationX === undefined ||
            event.velocityX === undefined
          ) {
            return;
          }

          // Judge the card's ACTUAL offset from centre, not this pan's delta.
          // They differ whenever the drag picked the card up mid-spring, and
          // the offset is what the user sees — it is what drives the colour
          // flash, the tilt, and the armed latch, so the commit has to agree
          // with it or the visuals promise one outcome and the release gives
          // another.
          const translationX = translateX.get();
          const velocityX = event.velocityX;

          if (onGestureEnd) {
            scheduleOnRN(onGestureEnd);
          }

          // `success` is false when the gesture was CANCELLED or FAILED after
          // activating (a system edge-swipe taking over, another handler
          // winning, the app backgrounding). Gesture Handler still routes those
          // through onEnd, so without this check an interrupted drag that
          // happened to be past the threshold committed a permanent grade the
          // user never released on.
          const { commit, isRight } = success
            ? resolveSwipeCommit({
                translationX,
                velocityX,
                swipeThreshold,
                screenWidth: SCREEN_WIDTH,
              })
            : { commit: false, isRight: false };

          if (!commit) {
            // Below threshold — spring straight home. No delay, and no
            // "animating" flag: this spring is meant to be interruptible, so a
            // user who immediately re-drags catches the card in flight (onStart
            // captures its live position and the assignment below cancels the
            // spring on its own).
            translateX.set(withSpring(0, springConfig));
            return;
          }

          // Fire the JS work first so grading starts on this frame, in parallel
          // with the exit animation rather than after it.
          scheduleOnRN(handleSwipeAction, isRight);

          isAnimatingRef.set(true);
          if (resolveCommitExit(exitOnCommit, isRight)) {
            // Carry the card off screen in the direction it was thrown, then
            // recentre the moment it lands. The consumer's dissolve runs on the
            // same CARD_EXIT duration, so the snap happens under an opacity of
            // ~0 and is never seen — whereas leaving it parked off screen until
            // the next word's effect fires exposes a frame of the outgoing
            // position (and its full-strength colour flash) as the new card
            // starts fading in.
            //
            // The `finished` guard is load-bearing, not defensive: assigning to
            // a shared value that still holds a RUNNING animation cancels it,
            // which invokes this very callback again — so an unguarded
            // `translateX.set(0)` here recurses until the stack blows the
            // moment anything cancels the exit (the next card's recentre does,
            // every time). On a genuine finish there is no animation left to
            // cancel, so the assignment is inert.
            const exitTarget = isRight ? SCREEN_WIDTH : -SCREEN_WIDTH;
            translateX.set(
              withTiming(exitTarget, TIMING_CONFIG.CARD_EXIT, finished => {
                if (finished) {
                  translateX.set(0);
                }
                isAnimatingRef.set(false);
              }),
            );
          } else {
            translateX.set(
              withSpring(0, springConfig, () => {
                isAnimatingRef.set(false);
              }),
            );
          }
        })
        .onFinalize(() => {
          'worklet';
          // Cancelled or failed after activating: onEnd never ran, so nothing
          // has brought the card home. Do it here.
          if (settledRef.get()) {
            return;
          }
          settledRef.set(true);
          if (armedSide.get() !== 0) {
            armedSide.set(0);
            if (onCommitArmedChange) {
              scheduleOnRN(onCommitArmedChange, false, false);
            }
          }
          if (!isAnimatingRef.get() && translateX.get() !== 0) {
            translateX.set(withSpring(0, springConfig));
          }
        }),
    [
      enabled,
      minDistance,
      activeOffsetX,
      failOffsetY,
      isAnimatingRef,
      translateX,
      startX,
      armedSide,
      settledRef,
      ignoreGestureRef,
      handleSwipeAction,
      maxTranslationRatio,
      swipeThreshold,
      springConfig,
      exitOnCommit,
      onCommitArmedChange,
      onGestureBegin,
      onGestureStart,
      onGestureEnd,
    ],
  );

  /**
   * Play the commit exit for a grade that did NOT come from a drag.
   *
   * Tapping "Forgot" and swiping left are the same decision, but they used to
   * look nothing alike: the swipe threw the card off screen with a tilt and a
   * colour wash while the tap just dissolved it. This drives the exact same
   * animation from the same shared value, so the two paths are one motion.
   *
   * The card is placed AT the commit threshold first so the consumer's
   * threshold-derived styles (tint, verdict label, tilt) are at full strength
   * for the frame the exit starts from — otherwise a tapped card would fly off
   * untinted. No haptic here: the caller owns that, exactly as the drag path
   * leaves the detent tick to the threshold crossing.
   */
  const commitTo = useCallback(
    (direction: 'left' | 'right') => {
      if (isAnimatingRef.get()) return;
      isAnimatingRef.set(true);
      const sign = direction === 'right' ? 1 : -1;
      cancelAnimation(translateX);
      translateX.set(sign * swipeThreshold);
      translateX.set(
        withTiming(sign * SCREEN_WIDTH, TIMING_CONFIG.CARD_EXIT, finished => {
          'worklet';
          // Same recursion guard as the drag path: assigning over a running
          // animation cancels it, which re-enters this callback.
          if (finished) {
            translateX.set(0);
          }
          isAnimatingRef.set(false);
        }),
      );
    },
    [isAnimatingRef, translateX, swipeThreshold],
  );

  return {
    gesture,
    translateX,
    isAnimatingRef,
    swipeThreshold,
    resetPosition,
    commitTo,
  };
};
