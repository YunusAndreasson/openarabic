import type { JSX } from 'react';

import { SheetScreen } from '@/components/common';
import { ChartSheetContent } from '@/components/practice/ChartSheetContent';
import { DueWordsPrognosisChart } from '@/components/practice/charts/DueWordsPrognosisChart';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';

const filterWordsWithRoot = (words: StudyWord[]) => words.filter(word => word?.root_id != null);

export default function DueWordsScreen(): JSX.Element {
  return (
    <SheetScreen>
      <ChartSheetContent
        title={STRINGS.DUE_WORDS_FORECAST}
        subtitle={STRINGS.DUE_WORDS_FORECAST_SUBTITLE}
        ChartComponent={DueWordsPrognosisChart}
        filterWords={filterWordsWithRoot}
      />
    </SheetScreen>
  );
}

export const options = {
  headerShown: false,
} as const;
