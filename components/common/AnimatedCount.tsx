import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import {
  cancelAnimation,
  useAnimatedReaction,
  useSharedValue,
  withSpring,
  type WithSpringConfig,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Direct path, not the barrel: a file inside components/common importing from
// '@/components/common' closes a cycle that resolves to `undefined` at runtime
// and fails as a blank component rather than a build error.
import { ThemedText } from '@/components/ThemedText';
import { SPRING_CONFIG } from '@/constants/animation';
import type { SolidColorName } from '@/constants/colors';
import type { TextTypeName } from '@/types/ui/text.types';

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
  /** The target. Counts up from the previous value on every change. */
  value: number;
  /**
   * Rendered instead of the number when there is nothing to count — pass
   * `STRINGS.EMPTY_METRIC`. Never render an unmeasured metric as `0`: it claims
   * a measurement of zero where none was taken. Skips the animation entirely.
   */
  placeholder?: string;
  /** Appended verbatim and never animated ("%", "+"). */
  suffix?: string;
  type?: TextTypeName;
  style?: StyleProp<TextStyle>;
  colorName?: SolidColorName;
  /**
   * Colour derived from the value currently on screen, not the target — so a
   * threshold crossing is painted on the frame it visually happens.
   */
  resolveColor?: (displayValue: number) => string;
  spring?: WithSpringConfig;
  /**
   * `0` disables the count-up. Required inside recycled FlashList rows, where a
   * reused row would otherwise animate from the previous item's value; also the
   * seam for reduced motion when that lands app-wide.
   */
  animationDuration?: 0;
  testID?: string;
};

const DEFAULT_SPRING: WithSpringConfig = {
  ...SPRING_CONFIG.CARD,
  overshootClamping: true,
};

/**
 * A number that counts up to its value.
 *
 * The spring runs on the UI thread and only the ROUNDED INTEGER is pushed back
 * to JS — a handful of re-renders across the animation instead of one per frame.
 * That property is the whole reason this is a shared primitive rather than an
 * idiom copied per call site; the version this was lifted from
 * (`MemoryRetentionGauge`) is now a caller.
 */
export function AnimatedCount({
  value,
  placeholder,
  suffix,
  type = 'heading1',
  style,
  colorName,
  resolveColor,
  spring,
  animationDuration,
  testID,
  accessibilityLabel,
  silent,
}: AnimatedCountProps): JSX.Element {
  const isStatic = animationDuration === 0 || placeholder !== undefined;

  const progress = useSharedValue(value);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (isStatic) return;
    progress.set(withSpring(value, spring ?? DEFAULT_SPRING));
  }, [value, isStatic, progress, spring]);

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
      return Math.round(progress.value);
    },
    (rounded, previous) => {
      if (rounded !== previous) {
        scheduleOnRN(setDisplayValue, rounded);
      }
    },
  );

  const shown = isStatic ? value : displayValue;
  const text = placeholder ?? `${shown}${suffix ?? ''}`;
  const resolvedColor = resolveColor?.(shown);

  return (
    <ThemedText
      type={type}
      colorName={colorName}
      style={[style, resolvedColor ? { color: resolvedColor } : null]}
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
