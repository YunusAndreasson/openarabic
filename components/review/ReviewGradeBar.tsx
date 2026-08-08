import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { ReviewActionButton } from '@/components/review/ReviewActionButton';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { WordConfidence } from '@/types/review.types';
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
});

interface ReviewGradeBarProps {
  /** Interval hint per grade ("10m"/"4d"), from useReview.intervalLabels. */
  intervals?: Partial<Record<WordConfidence, string>>;
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
      {GRADE_ORDER.map(confidence => {
        const meta = GRADE_META[confidence];

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
