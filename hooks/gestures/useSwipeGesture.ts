import { useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { cancelAnimation, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { TIMING_CONFIG } from '@/constants/animation';

export interface SwipeGestureResult {
  translateX: SharedValue<number>;
  /**
   * True only while a committed card is flying off screen. The one animation
   * the user must not be able to interrupt, and the re-entrancy lock for
   * `commitTo`.
   */
  isAnimatingRef: SharedValue<boolean>;
  /**
   * Play a graded card's exit.
   *
   * `holdMs` keeps the card exactly where it is for that long before the throw
   * starts — the verdict beat, so a grade is read on a card that is standing
   * still rather than one already sliding away. The delay lives inside the
   * animation (`withDelay`), not in a timer, so the throw and the advance fade
   * (which waits out the same beat) share one clock.
   *
   * Both exits throw from wherever the card is resting. They used to start from
   * a draw-back point a fifth of the screen out — reached by a glide during the
   * beat, or placed there instantly without one — because a colour wash was
   * scaled to that distance. The wash is gone, and with it the reason for
   * either.
   *
   * Ignored while a committed card is already flying off.
   *
   * No haptic here: the caller owns that. `useCardVerdict` fires the outcome
   * tier off the verdict's own rising edge, so the buzz and the colour are one
   * event rather than two clocks.
   */
  commitTo: (direction: 'left' | 'right', holdMs?: number) => void;
}

/**
 * The review card's exit motion.
 *
 * Both grade paths land here: a tapped "Knew it" throws right, and the tap that
 * ends a restudy hold throws left. Driving both from one shared value is what
 * keeps them a single motion — the card's dissolve runs on the same `CARD_EXIT`
 * duration, so the flight and the fade land together instead of on two clocks
 * that drift apart under load.
 *
 * NAME: this hook used to own a pan-to-commit swipe as well, which is where the
 * file got its name. The gesture is gone — only the exit it shared with the tap
 * path remains. A rename to `useCardExit` is a mechanical follow-up whenever it
 * is wanted.
 */
export const useSwipeGesture = (): SwipeGestureResult => {
  const translateX = useSharedValue(0);
  const isAnimatingRef = useSharedValue(false);

  // The live window, not the launch width: on an Android 16 tablet or unfolded
  // foldable a launch-time width would stop the throw short of the edge.
  const { width: windowWidth } = useWindowDimensions();

  const commitTo = useCallback(
    (direction: 'left' | 'right', holdMs = 0) => {
      if (isAnimatingRef.get()) return;
      const sign = direction === 'right' ? 1 : -1;

      // Cancel BEFORE taking the lock, not after. Cancelling a running
      // `withTiming` invokes its completion callback with `finished: false`, and
      // that callback ends by clearing `isAnimatingRef` — so cancelling second
      // hands the just-taken lock straight back, and the exit runs unguarded.
      // Both statements queue onto the UI thread in order, so cancelling first
      // means the stale callback's `set(false)` lands before this `set(true)`.
      //
      // Reachable because the card's recentre effect clears the flag on the JS
      // thread while a cancellation is still in flight on the UI thread; a grade
      // landing in that window (a voice auto-accept needs no reveal tap) would
      // otherwise leave a second `commitTo` free to restart a throw mid-flight.
      cancelAnimation(translateX);
      isAnimatingRef.set(true);

      const throwOut = withTiming(sign * windowWidth, TIMING_CONFIG.CARD_EXIT, finished => {
        'worklet';
        // The `finished` guard is load-bearing, not defensive: assigning to a
        // shared value that still holds a RUNNING animation cancels it, which
        // invokes this very callback again — so an unguarded `translateX.set(0)`
        // here recurses until the stack blows the moment anything cancels the
        // exit (the next card's recentre does, every time). On a genuine finish
        // there is no animation left to cancel, so the assignment is inert.
        //
        // Recentring here rather than leaving the card parked off screen is what
        // stops a frame of the outgoing position showing as the next card fades
        // in. It lands under an opacity of ~0, so it is never seen.
        if (finished) {
          translateX.set(0);
        }
        isAnimatingRef.set(false);
      });

      translateX.set(holdMs > 0 ? withDelay(holdMs, throwOut) : throwOut);
    },
    [isAnimatingRef, translateX, windowWidth],
  );

  return {
    translateX,
    isAnimatingRef,
    commitTo,
  };
};
