import { memo } from 'react';

import { LearnedChart } from '@/components/study/charts/LearnedChart';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

import { GenericChartBottomSheet } from './GenericChartBottomSheet';

interface LearnedBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const LearnedBottomSheet = memo<LearnedBottomSheetProps>(({ isVisible, onClose }) => {
  const { user } = useAuth();

  const { allWords: studyWords } = useFSRSQueries({
    userId: user?.id,
  });

  return (
    <GenericChartBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title={STRINGS.LEARNED_WORDS}
      subtitle={STRINGS.LEARNED_WORDS_SUBTITLE}
      chartComponent={<LearnedChart studyWords={studyWords ?? []} hideTitle={true} />}
    />
  );
});

LearnedBottomSheet.displayName = 'LearnedBottomSheet';
