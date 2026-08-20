import type { JSX } from 'react';

import { ChartSheetScreen } from '@/components/practice/ChartSheetContent';
import { PracticeDepthBreakdown } from '@/components/practice/PracticeDepthBreakdown';
import { STRINGS } from '@/constants/strings';

/**
 * The detail view under the practice screen's "Reviews done" tile.
 *
 * It exists first of all because the tile did not have one. Streak and Revisit
 * beside it both open a sheet, and all three are the same `BaseCard` in the same
 * row — so the one that swallowed a tap read as broken rather than as inert.
 *
 * What it shows is a snapshot, and it has to be: `Σ fsrs_reps` has no history
 * behind it. `PracticeDepthBreakdown` carries that reasoning in full.
 */
export default function ReviewDepthScreen(): JSX.Element {
  return (
    <ChartSheetScreen
      title={STRINGS.REVIEW_DEPTH_TITLE}
      subtitle={STRINGS.REVIEW_DEPTH_SUBTITLE}
      ChartComponent={PracticeDepthBreakdown}
    />
  );
}
