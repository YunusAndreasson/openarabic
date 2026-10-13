import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import {
  cancelAnimation,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Direct path, not the barrel: a file inside components/common importing from
// '@/components/common' closes a cycle that resolves to `undefined` at runtime
// and fails as a blank component rather than a build error.
import { ThemedText } from '@/components/primitives/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import type { SolidColorName } from '@/constants/colors';
import type { TextTypeName } from '@/types/ui/text.types';
import { formatCount } from '@/utils/stringUtils';

/**
 * Accessibility is a required, mutually exclusive choice.
 *
 * A ticking number is the one thing a screen reader must never follow live: it
 * would announce every intermediate value. So a caller either gives this
 * component a label of its own (announced once, at the settled value) or marks
 * it `silent` because an accessible ancestor already describes it. Making the
 * two exclusive in the type means neither "invisible to a reader" nor "spams a
 * reader" is reachable by omission.
 */
type AnimatedCountAccessibility =
  { accessibilityLabel: string; silent?: never } | { silent: true; accessibilityLabel?: never };

export type AnimatedCountProps = AnimatedCountAccessibility & {
  /** The target. Counts from the previous value on every change, up or down. */
  value: number;
  /**
   * Rendered instead of the number when there is nothing to count — pass
   * `STRINGS.EMPTY_METRIC`. Never render an unmeasured metric as `0`: it claims
   * a measurement of zero where none was taken. Skips the animation entirely.
   */
  placeholder?: string;
  type?: TextTypeName;
  style?: StyleProp<TextStyle>;
  colorName?: SolidColorName;
  /**
   * `0` disables the count-up. Required inside recycled FlashList rows, where a
   * reused row would otherwise animate from the previous item's value; also the
   * seam for reduced motion when that lands app-wide.
   */
  animationDuration?: 0;
  /**
   * Text fitting, passed straight through. A count inside a narrow tile needs
   * the same protection a static numeral there has: shrink a little rather than
   * wrap and make the tile taller than its neighbours.
   */
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
  testID?: string;
};

/**
 * A number that counts to its value.
 *
 * The count runs on the UI thread and only the ROUNDED INTEGER is pushed back
 * to JS, so it re-renders once per integer it passes through rather than once
 * per frame. For a small change that is a handful of renders; for a change
 * larger than the frames available it approaches one per frame, of this one
 * text node. Keeping that work in one place is the reason this is a shared
 * primitive rather than an idiom copied per call site.
 *
 * It never animates on mount, only on a change, so a screen that opens does not
 * count up from zero; a number that moves is always a number that changed.
 *
 * It carried a `suffix`, a `resolveColor` and a `spring` override for the
 * retention gauge it was lifted from. That gauge is gone, and no caller ever
 * used any of the three.
 */
export function AnimatedCount({
  value,
  placeholder,
  type = 'heading1',
  style,
  colorName,
  animationDuration,
  numberOfLines,
  adjustsFontSizeToFit,
  minimumFontScale,
  testID,
  accessibilityLabel,
  silent,
}: AnimatedCountProps): JSX.Element {
  const isStatic = animationDuration === 0 || placeholder !== undefined;

  const progress = useSharedValue(value);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (isStatic) return;
    progress.set(withTiming(value, TIMING_CONFIG.COUNT));
  }, [value, isStatic, progress]);

  // A `scheduleOnRN` already in flight would otherwise call setState on an
  // unmounted component.
  useEffect(() => {
    return () => {
      try {
        cancelAnimation(progress);
      } catch {
        // Cleanup is best-effort; nothing downstream depends on it succeeding.
      }
    };
  }, [progress]);

  useAnimatedReaction(
    () => {
      'worklet';
      return Math.round(progress.get());
    },
    (rounded, previous) => {
      if (rounded !== previous) {
        scheduleOnRN(setDisplayValue, rounded);
      }
    },
  );

  const shown = isStatic ? value : displayValue;
  const text = placeholder ?? formatCount(shown);

  return (
    <ThemedText
      type={type}
      colorName={colorName}
      style={style}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      testID={testID}
      // A silent instance defers entirely to the accessible ancestor that
      // describes the whole card; a labelled one announces its settled value.
      accessible={silent ? false : undefined}
      accessibilityElementsHidden={silent}
      importantForAccessibility={silent ? 'no-hide-descendants' : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {text}
    </ThemedText>
  );
}

AnimatedCount.displayName = 'AnimatedCount';
