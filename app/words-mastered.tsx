import type { JSX } from 'react';

import { SheetScreen } from '@/components/common';
import { ChartSheetContent } from '@/components/practice/ChartSheetContent';
import { MasteryChart } from '@/components/practice/charts';
import { STRINGS } from '@/constants/strings';

export default function WordsMasteredScreen(): JSX.Element {
  return (
    <SheetScreen>
      <ChartSheetContent
        title={STRINGS.WORD_MASTERY}
        subtitle={STRINGS.WORD_MASTERY_SUBTITLE}
        ChartComponent={MasteryChart}
      />
    </SheetScreen>
  );
}
