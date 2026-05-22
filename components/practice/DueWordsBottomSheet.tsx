import type { Ref } from 'react';

import { ChartBottomSheet } from './ChartBottomSheet';
import { DueWordsPrognosisChart } from './charts/DueWordsPrognosisChart';
import { STRINGS } from '@/constants/strings';
import type { GenericBottomSheetHandle } from '@/components/common';
import type { StudyWord } from '@/types/vocabulary.types';

const filterWordsWithRoot = (words: StudyWord[]) =>
  words.filter((word: StudyWord) => word?.root_id != null);

export function DueWordsBottomSheet({ ref }: { ref?: Ref<GenericBottomSheetHandle> }) {
  return (
    <ChartBottomSheet
      ref={ref}
      title={STRINGS.DUE_WORDS_FORECAST}
      subtitle={STRINGS.DUE_WORDS_FORECAST_SUBTITLE}
      ChartComponent={DueWordsPrognosisChart}
      filterWords={filterWordsWithRoot}
      queryLimit={1000}
    />
  );
}
