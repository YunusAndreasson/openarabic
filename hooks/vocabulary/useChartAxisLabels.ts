import { useMemo } from 'react';

import { calculateDataPointPositions } from '@/constants/chartConstants';
import { formatWeekdayUTC } from '@/utils/chartDataUtils';

/**
 * Derives stable x-axis labels and their pixel positions from a chart data array.
 * Both values are individually memoized to minimize downstream re-renders.
 */
export function useChartAxisLabels(data: readonly { date: Date }[]) {
  const xLabels = useMemo(() => data.map(d => formatWeekdayUTC(d.date)), [data]);

  const xLabelPositions = useMemo(() => {
    const allDayPositions = calculateDataPointPositions(data.length);
    return data.map((_, index) => allDayPositions[index] || 0);
  }, [data]);

  return { xLabels, xLabelPositions };
}
