/**
 * Tutorial: the three grades.
 *
 * Replaced the old separate swipe-left / swipe-right steps, which taught a
 * binary model for a ternary grade bar and never mentioned "Guessed". Labels
 * and colours come from ReviewGradeBar's own GRADE_PRESENTATION, so this cannot
 * drift from the screen it explains.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { REVIEW_CHOICE_TONE_COLOR } from '@/components/review/ReviewChoiceRow';
import { GRADE_PRESENTATION } from '@/components/review/ReviewGradeBar';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { WordConfidence } from '@/types/review.types';

/** Fail to pass, the order the grade bar paints them in. */
const GRADE_ORDER = ['unknown', 'vague', 'known'] as const satisfies readonly WordConfidence[];

const GRADE_HINTS: Record<WordConfidence, string> = {
  unknown: STRINGS.TUTORIAL_GRADE_FORGOT_HINT,
  vague: STRINGS.TUTORIAL_GRADE_GUESSED_HINT,
  known: STRINGS.TUTORIAL_GRADE_KNEW_HINT,
};

const GRADES = GRADE_ORDER.map(grade => ({
  label: GRADE_PRESENTATION[grade].label,
  hint: GRADE_HINTS[grade],
  colorName: REVIEW_CHOICE_TONE_COLOR[GRADE_PRESENTATION[grade].tone],
}));

export function TutorialGradesStep() {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {GRADES.map(grade => (
        <View key={grade.label} style={styles.row}>
          <View style={[styles.swatch, { backgroundColor: colors[grade.colorName] }]} />
          <View style={styles.rowText}>
            <ThemedText type="body" weight="semibold" colorName={grade.colorName}>
              {grade.label}
            </ThemedText>
            <ThemedText type="caption" colorName="secondaryText">
              {grade.hint}
            </ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

TutorialGradesStep.displayName = 'TutorialGradesStep';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  // Left→right red→amber→green, mirroring the grade bar's own ordering
  swatch: {
    width: LAYOUT.BORDER.WIDTH.FOCUSED,
    alignSelf: 'stretch',
    borderRadius: LAYOUT.BORDER_RADIUS.MICRO,
  },
  rowText: {
    flex: 1,
    gap: LAYOUT.SPACING.MICRO,
  },
});
