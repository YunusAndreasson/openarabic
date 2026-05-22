import type { Ref } from 'react';

import { ChartBottomSheet } from './ChartBottomSheet';
import { MasteryChart } from './charts';
import { STRINGS } from '@/constants/strings';
import type { GenericBottomSheetHandle } from '@/components/common';

export function WordsMasteredBottomSheet({ ref }: { ref?: Ref<GenericBottomSheetHandle> }) {
  return (
    <ChartBottomSheet
      ref={ref}
      title={STRINGS.WORD_MASTERY}
      subtitle={STRINGS.WORD_MASTERY_SUBTITLE}
      ChartComponent={MasteryChart}
    />
  );
}
