import { memo } from 'react';

import { RetrievabilityChart } from '@/components/study/charts/RetrievabilityChart';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

import { GenericChartBottomSheet } from './GenericChartBottomSheet';

interface MemoryRetentionBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const MemoryRetentionBottomSheet = memo<MemoryRetentionBottomSheetProps>(
  ({ isVisible, onClose }) => {
    const { user } = useAuth();

    const { allWords: studyWords } = useFSRSQueries({
      userId: user?.id,
    });

    return (
      <GenericChartBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        title={STRINGS.MEMORY_STRENGTH}
        subtitle={STRINGS.MEMORY_STRENGTH_SUBTITLE}
        chartComponent={
          <RetrievabilityChart
            studyWords={studyWords ?? []}
            hideTitle={true}
            showWarningLine={true}
          />
        }
      />
    );
  }
);

MemoryRetentionBottomSheet.displayName = 'MemoryRetentionBottomSheet';
