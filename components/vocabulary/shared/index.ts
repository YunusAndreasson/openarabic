// Enhanced chart components with standardized patterns
export { BaseChart } from './BaseChart';
export { ChartCanvas, type DataPoint } from './ChartCanvas';
export { ChartGrid } from './ChartGrid';
export { ChartAxes, Y_AXIS_WIDTH } from './ChartAxes';

// Chart building blocks
export { CardHeader } from './CardHeader';

export { ChartFooter } from './ChartFooter';
export {
  ChartTooltipData as ChartTooltip,
  DataPointOverlay,
  useChartTooltip,
} from './ChartInteractivity';

// Color management
export { useChartColors } from './chartColors';

// Shared utilities
export * from './utils';
export * from './constants';

// Chart utilities and constants
export {
  CHART_OPACITY,
  type PerformanceLevel as ChartColorPerformanceLevel,
  type ActivityLevel,
  type DifficultyLevel as ChartColorDifficultyLevel,
} from './chartColors';

// Standardized chart messaging system
export * from './chartMessages';
