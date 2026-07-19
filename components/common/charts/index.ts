// Shared components for vocabulary charts
export { BaseChart } from './BaseChart';
export { ChartAxes, Y_AXIS_WIDTH } from './ChartAxes';
export { ChartCanvas } from './ChartCanvas';
export { ChartGrid } from './ChartGrid';
// Note: DataPointOverlay is internal to ChartCanvas; not exported to avoid misuse

// New shared chart components for DRY refactoring
export { ChartAreaFill } from './ChartAreaFill';
export { ChartDataPoint } from './ChartDataPoint';
export { ChartMainLine } from './ChartMainLine';
export { ChartPerformanceZones } from './ChartPerformanceZones';
export { ChartReferenceLine } from './ChartReferenceLine';

// Unified chart component (eliminates all duplication)
export { VocabularyChart } from './VocabularyChart';

// Types
export type { DataPoint } from './ChartCanvas';

// Constants and utilities - re-exported from canonical locations for backward compatibility
export {
  GRAPH_WIDTH,
  GRAPH_HEIGHT_LARGE,
  CHART_VISUAL,
  PERFORMANCE_THRESHOLDS,
  DAYS_7,
  calculateDataPointPositions,
  getEffectiveChartHeight,
  useGraphWidth,
} from '@/constants/chartConstants';

export {
  generateDateRange,
  calculateEfficiencyScore,
  createStandardizedPerformanceZones,
  createAreaFillPath,
  formatWeekday,
  formatMonthDay,
} from '@/utils/chartDataUtils';

export { buildSmoothChartPath } from '@/utils/chartPathBuilder';
export type { BuildPathOptions, BuildPathResult } from '@/utils/chartPathBuilder';

export { CHART_OPACITY, getChartColors, useChartColors } from '@/constants/chartColors';

export {
  CHART_LABELS,
  EMPTY_STATE_MESSAGES,
  generateChartSubtitle,
} from '@/constants/chartMessages';

// Other shared components (keep existing exports)
