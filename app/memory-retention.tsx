import type { JSX } from 'react';

import { SheetScreen } from '@/components/common';
import { ChartSheetContent } from '@/components/practice/ChartSheetContent';
import { RetrievabilityChart } from '@/components/practice/charts';
import { STRINGS } from '@/constants/strings';

export default function MemoryRetentionScreen(): JSX.Element {
  return (
    <SheetScreen>
      <ChartSheetContent
        title={STRINGS.MEMORY_STRENGTH}
        subtitle={STRINGS.MEMORY_STRENGTH_SUBTITLE}
        ChartComponent={RetrievabilityChart}
      />
    </SheetScreen>
  );
}

export const options = {
  headerShown: false,
} as const;
