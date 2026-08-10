import type { JSX } from 'react';
import { StyleSheet } from 'react-native';

import { SheetScreen } from '@/components/common';
import { ThemedText } from '@/components/ThemedText';
import { ChartSheetContent } from '@/components/practice/ChartSheetContent';
import { MemoryRetentionGauge, RetrievabilityChart } from '@/components/practice/charts';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';

/**
 * "Now" reading (gauge) above the "week ahead" forecast line.
 * Module-level so ChartSheetContent gets a stable component reference.
 */
function MemoryStrengthContent({ studyWords }: { studyWords: StudyWord[] }): JSX.Element {
  return (
    <>
      <MemoryRetentionGauge studyWords={studyWords} embedded />
      <ThemedText type="caption" colorName="subtleLabelText" style={styles.forecastHint}>
        {STRINGS.MEMORY_FORECAST_HINT}
      </ThemedText>
      <RetrievabilityChart studyWords={studyWords} />
    </>
  );
}

export default function MemoryRetentionScreen(): JSX.Element {
  return (
    <SheetScreen>
      <ChartSheetContent
        title={STRINGS.MEMORY_STRENGTH}
        subtitle={STRINGS.MEMORY_STRENGTH_SUBTITLE}
        ChartComponent={MemoryStrengthContent}
      />
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  forecastHint: {
    marginBottom: LAYOUT.SPACING.SMALL,
    textAlign: 'center',
  },
});
