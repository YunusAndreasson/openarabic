import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { TIMING_CONSTANTS } from '@/constants/animation';
import { getElevation } from '@/constants/elevation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { ReanimatedCSSAnimationStyle } from '@/types/ui/base.types';

interface PulsatingLoaderProps {
  /**
   * Size of the loader circle
   */
  size?: number;
  /**
   * What the wait is for, announced by the screen reader. Defaults to the
   * generic loading string; pass something specific where the surrounding text
   * does not already say it.
   *
   * Pass `null` where it DOES — an inline spinner beside a live status label
   * would otherwise make the row announce "Loading…" and then the status, and
   * a second focus stop that says less than the text next to it is noise, not
   * accessibility. `null` leaves the circle purely decorative.
   */
  accessibilityLabel?: string | null;
}

// Default loader size aligned with touch target system
const DEFAULT_LOADER_SIZE = MIN_TOUCH_TARGET.LARGE; // 48px

// Loader border width calculation constants
const MIN_BORDER_WIDTH = 3; // Minimum border width in pixels
const BORDER_WIDTH_SCALE = 0.06; // Border width as percentage of loader size

/**
 * The largest the circle ever gets — must match the keyframe below.
 *
 * The container reserves it, rather than being sized to `size` exactly. The
 * circle scales past its box on every pulse otherwise, which is invisible for a
 * loader centred in empty space and very visible for a small one sitting inline
 * next to text: at the 20pt used by the Advanced screen's status row, a 24pt
 * ring was breathing into the label beside it.
 */
export const MAX_PULSE_SCALE = 1.2;

/** Hoisted so the prop keeps a stable identity across renders. */
const ACCESSIBILITY_BUSY = { busy: true } as const;

// Reanimated v4 CSS keyframe animation — replaces useEffect + withRepeat + withTiming
const pulsateStyle = {
  animationName: {
    '0%': { transform: [{ scale: 0.8 }] },
    '100%': { transform: [{ scale: 1.2 }] },
  },
  animationDuration: `${TIMING_CONSTANTS.PULSATE_DURATION / 2}ms`,
  animationIterationCount: 'infinite' as const,
  animationDirection: 'alternate' as const,
  animationTimingFunction: 'ease-in-out',
} as ReanimatedCSSAnimationStyle;

/**
 * The same wait, breathed rather than zoomed, for a learner who has asked for
 * less motion.
 *
 * Not simply the animation removed: this circle IS the signal that the app is
 * working, and a ring frozen at 0.8 scale reads as a component that failed to
 * start rather than as a wait. Reduce Motion asks for less *movement*, and iOS
 * makes the intended substitution explicit — its companion setting is "Prefer
 * Cross-Fade Transitions". So the pulse keeps its rhythm and its meaning on the
 * one channel the setting is not about.
 *
 * Reanimated will not do this for us. `withTiming` and the layout builders both
 * default to `ReduceMotion.System`, but the CSS API has no reduced-motion
 * handling at all in 4.5 — see the note on ReviewFlipCard's CARD_ENTRANCE.
 *
 * Held at MAX_PULSE_SCALE so the ring is the size the container already
 * reserves, rather than jumping a size smaller than the layout expects.
 */
const pulsateReducedStyle = {
  animationName: {
    '0%': { opacity: LAYOUT.OPACITY.SUBTLE },
    '100%': { opacity: LAYOUT.OPACITY.FULL },
  },
  animationDuration: `${TIMING_CONSTANTS.PULSATE_DURATION / 2}ms`,
  animationIterationCount: 'infinite' as const,
  animationDirection: 'alternate' as const,
  animationTimingFunction: 'ease-in-out',
  transform: [{ scale: MAX_PULSE_SCALE }],
} as ReanimatedCSSAnimationStyle;

/**
 * A pulsating circle loader component for smooth loading states
 * Uses the brand tint (sage) color and follows Material Design principles
 */
export function PulsatingLoader({
  size = DEFAULT_LOADER_SIZE,
  accessibilityLabel = STRINGS.LOADING_GENERIC,
}: PulsatingLoaderProps) {
  const colors = useColors();
  const box = size * MAX_PULSE_SCALE;
  const announced = accessibilityLabel !== null;
  const reduceMotion = useReducedMotion();

  return (
    <View
      // This replaced `ActivityIndicator` in several places, which carries busy
      // semantics natively. A bare View announces nothing, so a screen-reader
      // user gets silence where the screen is visibly waiting.
      //
      // `accessible` is what makes the three props below take effect at all: a
      // View is NOT an accessibility element unless it is set (iOS reads it as
      // `isAccessibilityElement`, Android as focusability), so role/state/label
      // on their own left the loader exactly as silent as the bare View was.
      accessible={announced}
      accessibilityRole={announced ? 'progressbar' : undefined}
      accessibilityState={announced ? ACCESSIBILITY_BUSY : undefined}
      accessibilityLabel={announced ? accessibilityLabel : undefined}
      importantForAccessibility={announced ? 'yes' : 'no-hide-descendants'}
      style={[styles.container, { width: box, height: box }]}
    >
      <Animated.View
        style={[
          getElevation(colors, 'HAIRLINE'),
          reduceMotion ? pulsateReducedStyle : pulsateStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: Math.max(MIN_BORDER_WIDTH, size * BORDER_WIDTH_SCALE), // Scales with size, 3px minimum
            borderColor: colors.tint,
          },
        ]}
      />
    </View>
  );
}

PulsatingLoader.displayName = 'PulsatingLoader';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
