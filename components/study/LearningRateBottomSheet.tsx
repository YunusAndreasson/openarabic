import { memo } from 'react';

import { EfficiencyChart } from '@/components/study/charts/EfficiencyChart';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

import { GenericChartBottomSheet } from './GenericChartBottomSheet';

interface LearningRateBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const LearningRateBottomSheet = memo<LearningRateBottomSheetProps>(
  ({ isVisible, onClose }) => {
    const { user } = useAuth();

    const { allWords: studyWords } = useFSRSQueries({
      userId: user?.id,
    });

    return (
      <GenericChartBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        title={STRINGS.LEARNING_PROGRESS}
        subtitle={STRINGS.LEARNING_RATE_SUBTITLE}
        chartComponent={<EfficiencyChart studyWords={studyWords ?? []} hideTitle={true} />}
      />
    );
  }
);

LearningRateBottomSheet.displayName = 'LearningRateBottomSheet';
