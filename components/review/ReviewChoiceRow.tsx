import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { ReviewActionButton } from '@/components/review/ReviewActionButton';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

type ReviewChoiceTone = 'negative' | 'intermediate' | 'positive';

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

/** Shared quiet red, amber and green choices for manual and voice review. */
export const ReviewChoiceRow = ({ choices }: ReviewChoiceRowProps) => {
  const colors = useColors();
  const toneColors: Record<ReviewChoiceTone, string> = {
    negative: colors.error,
    intermediate: colors.warning,
    positive: colors.success,
  };

  return (
    <View style={styles.row}>
      {choices.map(({ tone, ...choice }) => (
        <ReviewActionButton key={tone} {...choice} color={toneColors[tone]} />
      ))}
    </View>
  );
};
