/**
 * Component Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

// Mock Skia before imports
jest.mock('@shopify/react-native-skia', () => ({
  Skia: {
    Path: {
      Make: () => {
        const commands: string[] = [];
        return {
          moveTo: (x: number, y: number) => {
            commands.push(`M${x},${y}`);
          },
          cubicTo: (cx1: number, cy1: number, cx2: number, cy2: number, x: number, y: number) => {
            commands.push(`C${cx1},${cy1} ${cx2},${cy2} ${x},${y}`);
          },
          toSVGString: () => commands.join(' '),
        };
      },
    },
  },
}));

import { buildSmoothChartPath } from '@/utils/chartPathBuilder';

describe('buildSmoothChartPath', () => {
  interface TestDataItem {
    value: number;
    label: string;
  }

  interface TestPoint {
    x: number;
    y: number;
    value: number;
    label: string;
  }

  const CHART_HEIGHT = 200;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should build path with single data point', () => {
    const data: TestDataItem[] = [{ value: 50, label: 'A' }];
    const positions = [10];

    const result = buildSmoothChartPath<TestDataItem, TestPoint>({
      data,
      dataPointPositions: positions,
      calculateY: item => CHART_HEIGHT - item.value,
      buildPoint: (x, y, item) => ({ x, y, value: item.value, label: item.label }),
    });

    expect(result.points).toHaveLength(1);
    expect(result.points[0]).toEqual({ x: 10, y: 150, value: 50, label: 'A' });
    expect(result.path).toBe('M10,150');
  });

  test('should build smooth path with multiple data points', () => {
    const data: TestDataItem[] = [
      { value: 50, label: 'A' },
      { value: 100, label: 'B' },
      { value: 75, label: 'C' },
    ];
    const positions = [0, 100, 200];

    const result = buildSmoothChartPath<TestDataItem, TestPoint>({
      data,
      dataPointPositions: positions,
      calculateY: item => CHART_HEIGHT - item.value,
      buildPoint: (x, y, item) => ({ x, y, value: item.value, label: item.label }),
    });

    expect(result.points).toHaveLength(3);
    expect(result.points[0]).toEqual({ x: 0, y: 150, value: 50, label: 'A' });
    expect(result.points[1]).toEqual({ x: 100, y: 100, value: 100, label: 'B' });
    expect(result.points[2]).toEqual({ x: 200, y: 125, value: 75, label: 'C' });

    // Path should start with moveTo and have cubic curves connecting all points
    expect(result.path).toContain('M0,150');
    // Should have two cubic curves (one for each transition between points)
    expect(result.path.match(/C/g)?.length).toBe(2);
    // Should end at the last point
    expect(result.path).toContain('200,125');
  });

  test('should create smooth bezier curves between points', () => {
    const data: TestDataItem[] = [
      { value: 0, label: 'Start' },
      { value: 100, label: 'End' },
    ];
    const positions = [0, 300];

    const result = buildSmoothChartPath<TestDataItem, TestPoint>({
      data,
      dataPointPositions: positions,
      calculateY: item => CHART_HEIGHT - item.value,
      buildPoint: (x, y, item) => ({ x, y, value: item.value, label: item.label }),
    });

    // Should start at first point and end at second point
    expect(result.path).toContain('M0,200');
    expect(result.path).toContain('300,100');
    // Should have exactly one cubic bezier curve
    expect(result.path.match(/C/g)?.length).toBe(1);
    // Path should contain a cubic bezier command with control points
    expect(result.path).toMatch(/C[\d.]+,[\d.]+ [\d.]+,[\d.]+ 300,100/);
  });

  test('should handle empty data array', () => {
    const data: TestDataItem[] = [];
    const positions: number[] = [];

    const result = buildSmoothChartPath<TestDataItem, TestPoint>({
      data,
      dataPointPositions: positions,
      calculateY: item => CHART_HEIGHT - item.value,
      buildPoint: (x, y, item) => ({ x, y, value: item.value, label: item.label }),
    });

    expect(result.points).toHaveLength(0);
    expect(result.path).toBe('');
  });

  test('should pass index to calculateY and buildPoint functions', () => {
    const data: TestDataItem[] = [
      { value: 10, label: 'A' },
      { value: 20, label: 'B' },
    ];
    const positions = [0, 100];

    const calculateY = jest.fn((item: TestDataItem, index: number) => {
      return CHART_HEIGHT - item.value - index * 10;
    });

    const buildPoint = jest.fn(
      (x: number, y: number, item: TestDataItem, index: number): TestPoint => ({
        x,
        y,
        value: item.value + index,
        label: item.label,
      }),
    );

    buildSmoothChartPath<TestDataItem, TestPoint>({
      data,
      dataPointPositions: positions,
      calculateY,
      buildPoint,
    });

    expect(calculateY).toHaveBeenCalledWith(data[0], 0);
    expect(calculateY).toHaveBeenCalledWith(data[1], 1);
    expect(buildPoint).toHaveBeenCalledWith(0, 190, data[0], 0);
    expect(buildPoint).toHaveBeenCalledWith(100, 170, data[1], 1);
  });

  test('should handle missing position (fallback to 0)', () => {
    const data: TestDataItem[] = [{ value: 50, label: 'A' }];
    const positions: number[] = []; // Missing position

    const result = buildSmoothChartPath<TestDataItem, TestPoint>({
      data,
      dataPointPositions: positions,
      calculateY: item => CHART_HEIGHT - item.value,
      buildPoint: (x, y, item) => ({ x, y, value: item.value, label: item.label }),
    });

    expect(result.points[0]?.x).toBe(0); // Fallback to 0
    expect(result.path).toContain('M0,150');
  });
});
