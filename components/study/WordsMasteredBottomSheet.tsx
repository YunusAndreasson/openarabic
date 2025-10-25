import { memo } from 'react';

import { MasteryChart } from '@/components/study/charts/MasteryChart';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

import { GenericChartBottomSheet } from './GenericChartBottomSheet';

interface WordsMasteredBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const WordsMasteredBottomSheet = memo<WordsMasteredBottomSheetProps>(
  ({ isVisible, onClose }) => {
    const { user } = useAuth();

    const { allWords: studyWords } = useFSRSQueries({
      userId: user?.id,
    });

    return (
      <GenericChartBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        title={STRINGS.WORD_MASTERY}
        subtitle={STRINGS.WORD_MASTERY_SUBTITLE}
        chartComponent={<MasteryChart studyWords={studyWords ?? []} hideTitle={true} />}
      />
    );
  },
);

WordsMasteredBottomSheet.displayName = 'WordsMasteredBottomSheet';
