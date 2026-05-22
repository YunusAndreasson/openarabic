import type { Ref } from 'react';

import { ChartBottomSheet } from './ChartBottomSheet';
import { RetrievabilityChart } from './charts';
import { STRINGS } from '@/constants/strings';
import type { GenericBottomSheetHandle } from '@/components/common';

export function MemoryRetentionBottomSheet({ ref }: { ref?: Ref<GenericBottomSheetHandle> }) {
  return (
    <ChartBottomSheet
      ref={ref}
      title={STRINGS.MEMORY_STRENGTH}
      subtitle={STRINGS.MEMORY_STRENGTH_SUBTITLE}
      ChartComponent={RetrievabilityChart}
    />
  );
}
