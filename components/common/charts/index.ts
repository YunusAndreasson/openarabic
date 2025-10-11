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

// Other shared components (keep existing exports)
