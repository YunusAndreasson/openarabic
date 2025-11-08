import { memo } from 'react';

import { ChartBottomSheet } from './ChartBottomSheet';
import { DueWordsPrognosisChart } from './charts/DueWordsPrognosisChart';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';

interface DueWordsBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const DueWordsBottomSheet = memo<DueWordsBottomSheetProps>(({ isVisible, onClose }) => (
  <ChartBottomSheet
    isVisible={isVisible}
    onClose={onClose}
    title={STRINGS.DUE_WORDS_FORECAST}
    subtitle={STRINGS.DUE_WORDS_FORECAST_SUBTITLE}
    ChartComponent={DueWordsPrognosisChart}
    filterWords={(words: StudyWord[]) => words.filter((word: StudyWord) => word?.root_id != null)}
    queryLimit={1000}
  />
));

DueWordsBottomSheet.displayName = 'DueWordsBottomSheet';
