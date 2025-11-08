import { memo } from 'react';

import { GenericBottomSheet } from '@/components/common';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';

import { RetrievabilityChart } from './charts';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

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
      <GenericBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        title={STRINGS.MEMORY_STRENGTH}
        subtitle={STRINGS.MEMORY_STRENGTH_SUBTITLE}
      >
        <RetrievabilityChart studyWords={studyWords ?? []} />
      </GenericBottomSheet>
    );
  },
);

MemoryRetentionBottomSheet.displayName = 'MemoryRetentionBottomSheet';
