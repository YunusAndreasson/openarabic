import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { ReviewActionButton } from '@/components/review/ReviewActionButton';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { WORD_CONFIDENCES } from '@/types/review.types';
import type { IntervalLabels, WordConfidence } from '@/types/review.types';

const GRADE_META: Record<
  WordConfidence,
  { label: string; colorKey: 'error' | 'warning' | 'success' }
> = {
  unknown: { label: STRINGS.GRADE_FORGOT, colorKey: 'error' },
  vague: { label: STRINGS.GRADE_GUESSED, colorKey: 'warning' },
  known: { label: STRINGS.GRADE_KNEW_IT, colorKey: 'success' },
};

const STATIC_STYLES = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    gap: LAYOUT.SPACING.MEDIUM,
  },
});

interface ReviewGradeBarProps {
  /** Interval hint per grade ("10m"/"4d"), from useReview.intervalLabels.
   *  `null` while no card is current — every grade has a label or none do. */
  intervals?: IntervalLabels | null;
  onGrade: (confidence: WordConfidence) => void;
  disabled?: boolean;
}

/**
 * Ternary self-grade row, shown only AFTER the card's answer is revealed:
 * Forgot / Guessed / Knew it, each with the interval it buys. Reads as one
 * family with the card (faint tinted surface, rating-colour label), and shares
 * its button with the voice-miss row so the two states of the bottom band are
 * the same shape.
 */
export const ReviewGradeBar: FC<ReviewGradeBarProps> = ({
  intervals,
  onGrade,
  disabled = false,
}) => {
  const colors = useColors();

  return (
    <View style={STATIC_STYLES.container}>
      {/* WORD_CONFIDENCES is declared worst→best, which IS this row's paint
          order: left→right, red→amber→green, hardest to easiest
          (left = Forgot, right = Knew it; Guessed is the centre tap). Mapping
          it directly means a grade cannot exist in the union and be missing
          from the row that renders it. */}
      {WORD_CONFIDENCES.map(confidence => {
        const meta = GRADE_META[confidence];

        const handlePress = () => {
          if (disabled) return;
          // No haptic here. The card's verdict fires one, weighted by the
          // outcome, on the frame its colour lands — so a tick on press would
          // be the same decision buzzed twice within about 50ms, and the
          // earlier of the two would be the one that says less (a press is not
          // yet a grade; several guards can still refuse it).
          onGrade(confidence);
        };

        return (
          <ReviewActionButton
            key={confidence}
            label={meta.label}
            color={colors[meta.colorKey]}
            sublabel={intervals?.[confidence]}
            disabled={disabled}
            onPress={handlePress}
          />
        );
      })}
    </View>
  );
};

ReviewGradeBar.displayName = 'ReviewGradeBar';
