// Shared components for vocabulary charts

// Note: DataPointOverlay is internal to ChartCanvas; not exported to avoid misuse

// New shared chart components for DRY refactoring

// Unified chart component (eliminates all duplication)
export { VocabularyChart } from './VocabularyChart';

// Types
export type { DataPoint } from './ChartCanvas';

// Constants and utilities - re-exported from canonical locations for backward compatibility

// Other shared components (keep existing exports)
