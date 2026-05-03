import { forwardRef } from 'react';

import { ChartBottomSheet } from './ChartBottomSheet';
import { RetrievabilityChart } from './charts';
import { STRINGS } from '@/constants/strings';
import type { GenericBottomSheetHandle } from '@/components/common';

export const MemoryRetentionBottomSheet = forwardRef<GenericBottomSheetHandle>(
  function MemoryRetentionBottomSheet(_props, ref) {
    return (
      <ChartBottomSheet
        ref={ref}
        title={STRINGS.MEMORY_STRENGTH}
        subtitle={STRINGS.MEMORY_STRENGTH_SUBTITLE}
        ChartComponent={RetrievabilityChart}
      />
    );
  },
);

MemoryRetentionBottomSheet.displayName = 'MemoryRetentionBottomSheet';
