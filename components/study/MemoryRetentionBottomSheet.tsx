import { memo } from 'react';

import { ChartBottomSheet } from './ChartBottomSheet';
import { RetrievabilityChart } from './charts';
import { STRINGS } from '@/constants/strings';

interface MemoryRetentionBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const MemoryRetentionBottomSheet = memo<MemoryRetentionBottomSheetProps>(
  ({ isVisible, onClose }) => (
    <ChartBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title={STRINGS.MEMORY_STRENGTH}
      subtitle={STRINGS.MEMORY_STRENGTH_SUBTITLE}
      ChartComponent={RetrievabilityChart}
    />
  ),
);

MemoryRetentionBottomSheet.displayName = 'MemoryRetentionBottomSheet';
