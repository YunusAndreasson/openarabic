import { ChartBottomSheet } from './ChartBottomSheet';
import { DueWordsPrognosisChart } from './charts/DueWordsPrognosisChart';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';

const filterWordsWithRoot = (words: StudyWord[]) =>
  words.filter((word: StudyWord) => word?.root_id != null);

interface Props {
  isVisible: boolean;
  onClose: () => void;
}

export function DueWordsBottomSheet({ isVisible, onClose }: Props) {
  return (
    <ChartBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title={STRINGS.DUE_WORDS_FORECAST}
      subtitle={STRINGS.DUE_WORDS_FORECAST_SUBTITLE}
      ChartComponent={DueWordsPrognosisChart}
      filterWords={filterWordsWithRoot}
      queryLimit={1000}
    />
  );
}
