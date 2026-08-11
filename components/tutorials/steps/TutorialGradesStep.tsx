/**
 * Tutorial: the three grades.
 *
 * Replaces the old separate swipe-left / swipe-right steps, which taught a
 * binary model for a ternary grade bar and never mentioned "Guessed". Labels
 * and colours come from the same source ReviewGradeBar uses, so this cannot
 * drift from the screen it explains.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

// Same three colour keys ReviewGradeBar uses for the same three grades.
type GradeToneName = 'error' | 'warning' | 'success';

const GRADES: { label: string; hint: string; colorName: GradeToneName }[] = [
  {
    label: STRINGS.GRADE_FORGOT,
    hint: STRINGS.TUTORIAL_GRADE_FORGOT_HINT,
    colorName: 'error',
  },
  {
    label: STRINGS.GRADE_GUESSED,
    hint: STRINGS.TUTORIAL_GRADE_GUESSED_HINT,
    colorName: 'warning',
  },
  {
    label: STRINGS.GRADE_KNEW_IT,
    hint: STRINGS.TUTORIAL_GRADE_KNEW_HINT,
    colorName: 'success',
  },
];

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
