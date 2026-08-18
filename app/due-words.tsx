import type { JSX } from 'react';
import { StyleSheet } from 'react-native';

import { SheetScreen } from '@/components/common';
import { ThemedText } from '@/components/ThemedText';
import { ChartSheetContent } from '@/components/practice/ChartSheetContent';
import { DueWordsPrognosisChart } from '@/components/practice/charts/DueWordsPrognosisChart';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useMemoryInsights } from '@/hooks/vocabulary/useMemoryInsights';
import type { StudyWord } from '@/types/vocabulary.types';

/**
 * The week's workload, and how much of it is already slipping.
 *
 * The two slipping counts moved here from the memory sheet. They are urgency —
 * words whose recall has fallen past the critical line, and how many more follow
 * within the window if nothing is reviewed — and urgency is what this screen is
 * for. Beside a forecast of what comes due they read as the same sentence; over
 * a memory breakdown they were a second alarm competing with it.
 *
 * Module-level so `ChartSheetContent` gets a stable component reference.
 */
function DueWordsContent({ studyWords }: { studyWords: StudyWord[] }): JSX.Element {
  const insights = useMemoryInsights(studyWords);

  const slipping = [
    insights.criticalWords > 0
      ? STRINGS.PRACTICE_SLIPPING_NOW.replace('{count}', String(insights.criticalWords))
      : STRINGS.PRACTICE_NOTHING_SLIPPING,
    insights.criticalWordsInWeek > 0
      ? STRINGS.PRACTICE_SLIPPING_WEEK.replace('{count}', String(insights.criticalWordsInWeek))
      : STRINGS.PRACTICE_NOTHING_SLIPPING_WEEK,
  ].join(' · ');

  return (
    <>
      <DueWordsPrognosisChart studyWords={studyWords} />
      <ThemedText type="caption" colorName="captionText" style={styles.slipping}>
        {slipping}
      </ThemedText>
    </>
  );
}

export default function DueWordsScreen(): JSX.Element {
  return (
    <SheetScreen>
      <ChartSheetContent
        title={STRINGS.DUE_WORDS_FORECAST}
        subtitle={STRINGS.DUE_WORDS_FORECAST_SUBTITLE}
        ChartComponent={DueWordsContent}
      />
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  slipping: {
    marginTop: LAYOUT.SPACING.SMALL,
    textAlign: 'center',
  },
});
