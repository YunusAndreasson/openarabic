import type { JSX } from 'react';

import { ChartSheetScreen } from '@/components/practice/ChartSheetContent';
import { MemoryHorizonBreakdown } from '@/components/practice/MemoryHorizonBreakdown';
import { STRINGS } from '@/constants/strings';

/**
 * The detail view under the practice hero: the same words the card's
 * constellation plots, listed by the band they fall in, each row opening those
 * words in the dictionary.
 *
 * What used to be here — a retention gauge above a seven-day forecast line —
 * restated the card's own headline as a percentage and then changed the subject
 * from stability to retrievability. `MemoryHorizonBreakdown` carries the reasons
 * in full. The forecast itself was not deleted: the week ahead is the
 * `/due-words` sheet's question, and the slipping counts moved there with it.
 *
 * The route keeps its `memory-retention` name so existing links and the
 * `ROUTE_PATHS` entry stay valid; the screen's title is what a learner reads.
 */
export default function MemoryRetentionScreen(): JSX.Element {
  return (
    <ChartSheetScreen
      title={STRINGS.MEMORY_HORIZON_TITLE}
      subtitle={STRINGS.MEMORY_HORIZON_SUBTITLE}
      ChartComponent={MemoryHorizonBreakdown}
    />
  );
}
