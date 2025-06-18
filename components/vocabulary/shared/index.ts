// Shared components for vocabulary charts
export { BaseChart } from './BaseChart';
export { ChartCanvas } from './ChartCanvas';
export { ChartGrid } from './ChartGrid';
export { ChartAxes, Y_AXIS_WIDTH } from './ChartAxes';
export { DataPointOverlay } from './ChartInteractivity';

// New shared chart components for DRY refactoring
export { ChartDataPoint } from './ChartDataPoint';
export { ChartAreaFill } from './ChartAreaFill';
export { ChartMainLine } from './ChartMainLine';
export { ChartPerformanceZones } from './ChartPerformanceZones';

// Unified chart component (eliminates all duplication)
export { VocabularyChart } from './VocabularyChart';

// Types
export type { DataPoint } from './ChartCanvas';

// Other shared components (keep existing exports)
export { CardHeader } from './CardHeader';
