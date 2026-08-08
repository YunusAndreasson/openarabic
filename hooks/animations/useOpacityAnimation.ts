import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ViewStyle } from 'react-native';
import type { WithTimingConfig } from 'react-native-reanimated';
import { cancelAnimation, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { MIN_OPACITY_DURATION, TIMING_CONFIG } from '@/constants/animation';
import type { AnimatedStyleProp } from '@/types/ui/base.types';

export interface FadeAnimationOptions {
  /**
   * Initial opacity value, clamped to 0–1.
   * @default 1
   */
  initialOpacity?: number;

  /**
   * Duration of the fade in ms, floored at MIN_OPACITY_DURATION.
   * @default TIMING_CONFIG.MEDIUM.duration
   */
  duration?: number;
}

export interface FadeAnimationResult {
  /** Animated style to spread onto the target view. */
  animatedStyle: AnimatedStyleProp<ViewStyle>;

  /** Fade to fully opaque. `onComplete` only fires if the fade finished and the hook is still mounted. */
  fadeIn: (onComplete?: () => void) => void;

  /**
   * Fade to fully transparent. Same completion guarantees as `fadeIn`.
   *
   * `delayMs` holds the view at its current opacity before the fade starts —
   * used by the review card's verdict beat, which needs the confirmation
   * legible at full strength before the dissolve begins. The delay is part of
   * the animation rather than a timer in front of this call on purpose: two
   * independent clocks (a UI-thread animation and a JS-thread timeout) drift
   * apart under load, which is the exact bug the review advance was rewritten
   * to remove.
   */
  fadeOut: (onComplete?: () => void, delayMs?: number) => void;
}

/**
 * Imperative opacity fade driven from event callbacks.
 *
 * This is deliberately NOT a Reanimated CSS `animationName` keyframe: those are
 * declarative and fire on mount, whereas the review flow has to start a fade at
 * an arbitrary moment (card graded, prompt finished) and run work when it lands.
 */
export const useOpacityAnimation = (options: FadeAnimationOptions = {}): FadeAnimationResult => {
  const { initialOpacity = 1, duration: rawDuration = TIMING_CONFIG.MEDIUM.duration } = options;

  // Locked in on first render so a re-render can't retime an in-flight fade.
  const [duration] = useState(() => Math.max(MIN_OPACITY_DURATION, rawDuration));
  const [validInitialOpacity] = useState(() => Math.max(0, Math.min(1, initialOpacity)));
  const [timingConfig] = useState<WithTimingConfig>(() => ({
    duration,
    easing: TIMING_CONFIG.MEDIUM.easing,
  }));

  // Guards against a completion callback firing into an unmounted tree.
  const isMounted = useSharedValue(true);
  const opacity = useSharedValue(validInitialOpacity);

  useEffect(() => {
    return () => {
      isMounted.set(false);
      cancelAnimation(opacity);
    };
  }, [opacity, isMounted]);

  const animateOpacityTo = useCallback(
    (targetValue: number, onComplete?: () => void, delayMs = 0) => {
      'worklet';
      const fade = withTiming(targetValue, timingConfig, finished => {
        if (finished && onComplete && isMounted.get()) {
          scheduleOnRN(onComplete);
        }
      });
      // withDelay wraps the timing rather than preceding it, so the completion
      // callback still belongs to the same animation and still fires at
      // delay + duration on the one clock.
      opacity.set(delayMs > 0 ? withDelay(delayMs, fade) : fade);
    },
    [opacity, timingConfig, isMounted],
  );

  const fadeIn = useCallback(
    (onComplete?: () => void) => animateOpacityTo(1, onComplete),
    [animateOpacityTo],
  );

  const fadeOut = useCallback(
    (onComplete?: () => void, delayMs?: number) => animateOpacityTo(0, onComplete, delayMs),
    [animateOpacityTo],
  );

  // Reanimated 4: pass the shared value straight to `style` (no useAnimatedStyle
  // wrapper needed). Memoized on the shared value, whose identity never changes,
  // so the object is stable for the hook's lifetime: a fresh object every render
  // would be a new `style` prop for every consumer, and the review screen shares
  // this one style across three views (card, swipe flash, bottom controls).
  const animatedStyle = useMemo(() => ({ opacity }) as AnimatedStyleProp<ViewStyle>, [opacity]);

  return { animatedStyle, fadeIn, fadeOut };
};
