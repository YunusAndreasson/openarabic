import { MetricCardGrid } from '@/components/common/MetricCardGrid';
import { memo, useMemo } from 'react';

import { STRINGS } from '@/constants/strings';
import type { StreakHistoryData } from '@/services/studyStreak';

interface StreakMetricsProps {
  metrics: StreakHistoryData['metrics'];
}

export const StreakMetrics = memo<StreakMetricsProps>(({ metrics }) => {
  // Current / Longest / Total are three readings of the same quantity, so they
  // stay in one ink — colouring them apart implied a distinction that isn't
  // there. (Colour on a MetricCard is now reserved for values that mean
  // good/bad, e.g. memory health on the practice screen.)
  //
  // Numbers, not strings: MetricCard formats a number (1,000), and a value
  // handed over as `.toString()` skipped that and read "1000".
  const metricData = useMemo(
    () => [
      {
        id: 'current',
        value: metrics.currentStreak,
        label: STRINGS.STUDY_STREAK_CURRENT,
      },
      {
        id: 'longest',
        value: metrics.longestStreak,
        label: STRINGS.STUDY_STREAK_LONGEST,
      },
      {
        id: 'total',
        value: metrics.totalReadingDays,
        label: STRINGS.STUDY_STREAK_TOTAL,
      },
    ],
    [metrics.currentStreak, metrics.longestStreak, metrics.totalReadingDays],
  );

  return <MetricCardGrid metrics={metricData} />;
});

StreakMetrics.displayName = 'StreakMetrics';
