import { forwardRef } from 'react';

import { ChartBottomSheet } from './ChartBottomSheet';
import { MasteryChart } from './charts';
import { STRINGS } from '@/constants/strings';
import type { GenericBottomSheetHandle } from '@/components/common';

export const WordsMasteredBottomSheet = forwardRef<GenericBottomSheetHandle>(
  function WordsMasteredBottomSheet(_props, ref) {
    return (
      <ChartBottomSheet
        ref={ref}
        title={STRINGS.WORD_MASTERY}
        subtitle={STRINGS.WORD_MASTERY_SUBTITLE}
        ChartComponent={MasteryChart}
      />
    );
  },
);

WordsMasteredBottomSheet.displayName = 'WordsMasteredBottomSheet';
