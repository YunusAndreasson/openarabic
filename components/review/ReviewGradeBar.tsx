import type { FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { WordConfidence } from '@/types/review.types';
import { withAlpha } from '@/utils/colorUtils';
import { lightFeedback, mediumFeedback, selectionFeedback } from '@/utils/haptics';

// Left→right, red→amber→green. Mirrors the swipe outcomes (left = Forgot,
// right = Knew it); Guessed is the deliberate centre tap (no swipe).
const GRADE_ORDER: WordConfidence[] = ['unknown', 'vague', 'known'];

const GRADE_META: Record<
  WordConfidence,
  { label: string; colorKey: 'error' | 'warning' | 'success' }
> = {
  unknown: { label: STRINGS.GRADE_FORGOT, colorKey: 'error' },
  vague: { label: STRINGS.GRADE_GUESSED, colorKey: 'warning' },
  known: { label: STRINGS.GRADE_KNEW_IT, colorKey: 'success' },
};

/**
 * Haptic weight per grade. A miss should feel heavier than a clean recall —
 * the feedback carries the outcome, not just "a button was pressed". Kept
 * inside the existing semantic wrappers (utils/haptics) so the Android/iOS
 * routing and the rejection-swallowing stay in one place.
 */
const GRADE_FEEDBACK: Record<WordConfidence, () => void> = {
  unknown: mediumFeedback,
  vague: selectionFeedback,
  known: lightFeedback,
};

const STATIC_STYLES = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Taller than a single-line button so the label + interval sub-label both fit.
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE + LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
  // The schedule consequence, quietly under the label. Tabular figures keep the
  // centered "10m"/"4d" from jittering between cards.
  interval: {
    marginTop: LAYOUT.SPACING.TINY,
    fontVariant: ['tabular-nums'],
    opacity: LAYOUT.OPACITY.HIGH,
  },
});

interface ReviewGradeBarProps {
  /** Interval hint per grade ("10m"/"4d"), from useReview.intervalLabels. */
  intervals?: Partial<Record<WordConfidence, string>>;
  /** Voice pre-highlight: this button fills solid (tap to confirm). */
  suggested?: WordConfidence | null;
  onGrade: (confidence: WordConfidence) => void;
  disabled?: boolean;
}

/**
 * Ternary self-grade row, shown only AFTER the card's answer is revealed:
 * Forgot / Guessed / Knew it, each with the interval it buys. Reads as one family
 * with the card (faint tinted surface, rating-colour label) — loudness is reserved
 * for the voice-suggested button, which fills solid as a "tap to confirm".
 */
export const ReviewGradeBar: FC<ReviewGradeBarProps> = ({
  intervals,
  suggested = null,
  onGrade,
  disabled = false,
}) => {
  const colors = useColors();

  return (
    <View style={STATIC_STYLES.container}>
      {GRADE_ORDER.map(confidence => {
        const meta = GRADE_META[confidence];
        const color = colors[meta.colorKey];
        const isSuggested = suggested === confidence;
        const restBg = isSuggested ? color : withAlpha(color, LAYOUT.OPACITY.FAINT);
        const pressedBg = isSuggested ? color : withAlpha(color, LAYOUT.OPACITY.SUBTLE);
        const borderColor = withAlpha(
          color,
          isSuggested ? LAYOUT.OPACITY.FULL : LAYOUT.OPACITY.LIGHT,
        );
        // On the solid suggested fill the label auto-contrasts via the background
        // colour (near-white in light mode, near-black in dark).
        const labelColor = isSuggested ? colors.background : color;
        const interval = intervals?.[confidence];

        const handlePress = () => {
          if (disabled) return;
          // One haptic per grade, weighted by the outcome. Every button used to
          // fire the same selection tick, so three different decisions felt
          // identical — and the swipe path already distinguishes itself with a
          // detent at the threshold. Fires on press (there is no threshold
          // moment to hang it on) and, unlike the drag, this IS the commit.
          GRADE_FEEDBACK[confidence]();
          onGrade(confidence);
        };

        return (
          <Pressable
            key={confidence}
            accessibilityRole="button"
            accessibilityLabel={isSuggested ? `${meta.label}, voice suggested` : meta.label}
            accessibilityValue={interval ? { text: interval } : undefined}
            accessibilityState={{ disabled, selected: isSuggested }}
            hitSlop={LAYOUT.HIT_SLOP.SMALL}
            disabled={disabled}
            onPress={handlePress}
            // No disabled dim: `disabled` is only ever true for the ~180ms of a
            // card advance, during which the whole bottom slot is already
            // fading out in step with the card. Dimming on top of that read as
            // an unrelated flicker on every single grade.
            style={({ pressed }) => [
              STATIC_STYLES.button,
              { backgroundColor: pressed ? pressedBg : restBg, borderColor },
            ]}
          >
            <ThemedText
              skipDefaultColor
              weight="semibold"
              numberOfLines={1}
              style={[STATIC_STYLES.label, { color: labelColor }]}
            >
              {meta.label}
            </ThemedText>
            {interval ? (
              <ThemedText
                skipDefaultColor
                type="caption"
                numberOfLines={1}
                style={[STATIC_STYLES.interval, { color: labelColor }]}
              >
                {interval}
              </ThemedText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

ReviewGradeBar.displayName = 'ReviewGradeBar';
