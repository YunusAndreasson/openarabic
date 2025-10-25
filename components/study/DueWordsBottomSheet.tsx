import { memo, useMemo } from 'react';

import { DueWordsPrognosisChart } from '@/components/study/charts/DueWordsPrognosisChart';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

import { GenericChartBottomSheet } from './GenericChartBottomSheet';

interface DueWordsBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const DueWordsBottomSheet = memo<DueWordsBottomSheetProps>(({ isVisible, onClose }) => {
  const { user } = useAuth();

  // Use FSRS queries to get study words data
  const { allWords } = useFSRSQueries({
    userId: user?.id,
    limit: 1000, // Get more words for better forecast accuracy
  });

  // Filter study words for chart (needs all words for forecast calculation)
  const filteredStudyWords = useMemo(() => {
    return allWords?.filter(word => word?.root_id != null) ?? [];
  }, [allWords]);

  return (
    <GenericChartBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title={STRINGS.DUE_WORDS_FORECAST}
      subtitle={STRINGS.DUE_WORDS_FORECAST_SUBTITLE}
      chartComponent={<DueWordsPrognosisChart studyWords={filteredStudyWords} hideTitle={true} />}
    />
  );
});

DueWordsBottomSheet.displayName = 'DueWordsBottomSheet';
