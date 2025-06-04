// Enhanced chart components with standardized patterns
export { BaseChart } from './BaseChart';
export { ChartCanvas } from './ChartCanvas';
export type { DataPoint } from './ChartCanvas';

// Chart building blocks
export { CardHeader } from './CardHeader';
export { StatsRow } from './StatsRow';
export { ChartFooter } from './ChartFooter';
export { ChartTooltip, DataPointOverlay, useChartTooltip } from './ChartInteractivity';

// Animation utilities
export * from './chartAnimations';

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
export { CHART_LEGENDS, type TimeRange, type MemoryLevel, type ProgressType } from './chartLegends';
