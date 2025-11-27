/**
 * Chart Hook Mock Values
 *
 * Provides reusable mock values for chart-related hooks and utilities.
 * These mocks are shared across useDueWordsChart, useRetrievabilityChart,
 * and useCountBasedChart tests.
 *
 * IMPORTANT: Due to Jest's hoisting behavior, jest.mock() calls must be inline
 * in test files. Use require() to access these values inside jest.mock() factories.
 *
 * Usage:
 * ```typescript
 * import { resetChartMocks } from '@/__tests__/helpers/chartMocks';
 *
 * // Use require() inside jest.mock() for hoisting compatibility
 * jest.mock('@/components/common/charts/ChartColors', () => ({
 *   useChartColors: () => require('@/__tests__/helpers/chartMocks').mockChartColors,
 * }));
 *
 * // In beforeEach
 * beforeEach(() => {
 *   resetChartMocks();
 * });
 * ```
 */

// ============================================================================
// PATH BUILDER MOCKS
// ============================================================================

/**
 * Mock implementation of buildSmoothChartPath
 * Returns predictable path and points for testing
 *
 * Note: Use inline jest.mock() in test files, but can reference this
 * implementation via require() for consistency.
 */
export const mockBuildSmoothChartPath = jest.fn(
  (params: {
    data: unknown[];
    buildPoint: (x: number, y: number, d: unknown) => unknown;
    dataPointPositions?: number[];
    calculateY?: (d: unknown) => number;
  }) => {
    const { data, buildPoint } = params;
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { path: '', points: [] };
    }
    return {
      path: 'M0,0 L100,100',
      points: data.map((d, i) => buildPoint(i * 10, i * 10, d)),
    };
  },
);

// ============================================================================
// CONSTANTS MOCKS
// ============================================================================

/**
 * Mock implementation of calculateDataPointPositions
 * Returns evenly spaced positions for testing
 */
export const mockCalculateDataPointPositions = (length: number) =>
  Array.from({ length }, (_, i) => i * 10);

/**
 * Mock chart visual constants
 */
export const mockChartConstants = {
  CHART_VISUAL: { CHART_TOP_PADDING: 10 },
  DAYS_7: 7,
  GRAPH_HEIGHT_LARGE: 200,
  getEffectiveChartHeight: () => 180,
  calculateDataPointPositions: mockCalculateDataPointPositions,
};

// ============================================================================
// CHART COLORS MOCKS
// ============================================================================

/**
 * Mock chart colors for consistent testing
 */
export const mockChartColors = {
  primary: '#4CAF50',
  secondary: '#2196F3',
  danger: '#F44336',
  warning: '#FF9800',
};

// ============================================================================
// CHART UTILS MOCKS
// ============================================================================

/**
 * Mock performance zones for standardized chart testing
 */
export const mockPerformanceZones = [
  { y: 0, height: 50, color: 'green' },
  { y: 50, height: 100, color: 'yellow' },
];

// ============================================================================
// RESET UTILITIES
// ============================================================================

/**
 * Resets all chart mock call histories
 * Call in beforeEach for clean test isolation
 */
export function resetChartMocks() {
  mockBuildSmoothChartPath.mockClear();
}
