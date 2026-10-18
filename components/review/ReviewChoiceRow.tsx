import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { ReviewActionButton } from '@/components/review/ReviewActionButton';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

/**
 * `neutral` is for a choice that is not an outcome at all ("Try again" grades
 * nothing), so it must not borrow a grade's hue: amber means "Barely" in the
 * grade bar that occupies this same band.
 */
type ReviewChoiceTone = 'negative' | 'intermediate' | 'positive' | 'neutral';

type ReviewChoice = Omit<
  ComponentProps<typeof ReviewActionButton>,
  'color' | 'variant' | 'standalone'
> & {
  /** What the choice means, which picks its colour. The colour follows the
   * meaning and not the slot, so a row is free to order its choices. */
  tone: ReviewChoiceTone;
};

interface ReviewChoiceRowProps {
  /** Left to right, in the order they are painted. Actions retain their own
   * meaning: retry does not submit a self-grade. */
  choices: readonly [ReviewChoice, ReviewChoice, ReviewChoice];
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    gap: LAYOUT.SPACING.MEDIUM,
  },
});

/**
 * Shared quiet choices for manual and voice review: red, amber and green for
 * outcomes, secondary ink for a choice that grades nothing. Both rows keep fail
 * on the left and pass on the right, so a thumb that learned one band is not
 * sent to the opposite outcome by the other.
 */
export const ReviewChoiceRow = ({ choices }: ReviewChoiceRowProps) => {
  const colors = useColors();
  const toneColors: Record<ReviewChoiceTone, string> = {
    negative: colors.error,
    intermediate: colors.warning,
    positive: colors.success,
    neutral: colors.secondaryText,
  };

  return (
    <View style={styles.row}>
      {choices.map(({ tone, ...choice }) => (
        <ReviewActionButton key={tone} {...choice} color={toneColors[tone]} />
      ))}
    </View>
  );
};
