import { ChartBottomSheet } from './ChartBottomSheet';
import { RetrievabilityChart } from './charts';
import { STRINGS } from '@/constants/strings';

interface Props {
  isVisible: boolean;
  onClose: () => void;
}

export function MemoryRetentionBottomSheet({ isVisible, onClose }: Props) {
  return (
    <ChartBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title={STRINGS.MEMORY_STRENGTH}
      subtitle={STRINGS.MEMORY_STRENGTH_SUBTITLE}
      ChartComponent={RetrievabilityChart}
    />
  );
}
