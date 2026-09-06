import type { ComponentProps, FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { ReviewActionButton } from '@/components/review/ReviewActionButton';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

type ReviewChoice = Omit<
  ComponentProps<typeof ReviewActionButton>,
  'color' | 'variant' | 'standalone'
>;

interface ReviewChoiceRowProps {
  /** Left to right: negative, intermediate/retry, positive. Actions retain
   * their own meaning: retry does not submit a self-grade. */
  choices: readonly [ReviewChoice, ReviewChoice, ReviewChoice];
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    gap: LAYOUT.SPACING.MEDIUM,
  },
});

/** Shared quiet red–amber–green choices for manual and voice review. */
export const ReviewChoiceRow: FC<ReviewChoiceRowProps> = ({ choices }) => {
  const colors = useColors();
  const slots = [
    { color: colors.error, choice: choices[0], key: 'negative' },
    { color: colors.warning, choice: choices[1], key: 'intermediate' },
    { color: colors.success, choice: choices[2], key: 'positive' },
  ];

  return (
    <View style={styles.row}>
      {slots.map(({ key, choice, color }) => (
        <ReviewActionButton key={key} {...choice} color={color} />
      ))}
    </View>
  );
};
