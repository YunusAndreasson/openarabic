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
 * Note: Currently a no-op since remaining mocks are plain objects
 */
export function resetChartMocks() {
  // No-op: mockChartColors and mockPerformanceZones are plain objects
}
