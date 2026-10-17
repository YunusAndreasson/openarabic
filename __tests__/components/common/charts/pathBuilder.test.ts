/**
 * Component Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

// Mock Skia before imports. chartPathBuilder builds via the immutable
// PathBuilder API (Skia.PathBuilder.Make().moveTo(...).cubicTo(...).build())
// so the mock returns a chainable builder whose build() yields an object with
// toSVGString() reflecting the calls.
jest.mock('react-native-skia', () => ({
  Skia: {
    PathBuilder: {
      Make: () => {
        const commands: string[] = [];
        const builder = {
          moveTo: (x: number, y: number) => {
            commands.push(`M${x},${y}`);
            return builder;
          },
          cubicTo: (cx1: number, cy1: number, cx2: number, cy2: number, x: number, y: number) => {
            commands.push(`C${cx1},${cy1} ${cx2},${cy2} ${x},${y}`);
            return builder;
          },
          build: () => ({
            toSVGString: () => commands.join(' '),
          }),
        };
        return builder;
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

  describe('overshoot clamping', () => {
    /** Pull each cubic segment's control y-values out of the built path. */
    const parseControlYs = (path: string): { cy1: number; cy2: number; endY: number }[] =>
      [...path.matchAll(/C([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+)/g)].map(
        match => ({
          cy1: Number(match[2]),
          cy2: Number(match[4]),
          endY: Number(match[6]),
        }),
      );

    // A plateau, a one-step jump, then another plateau — the exact shape a
    // cumulative "words in practice" series takes when words are added in a
    // burst. Averaging neighbour slopes used to push control points past both
    // plateaus, which the Skia canvas then clipped flat at top and bottom.
    const stepData: TestDataItem[] = [
      { value: 0, label: 'a' },
      { value: 0, label: 'b' },
      { value: 0, label: 'c' },
      { value: 100, label: 'd' },
      { value: 100, label: 'e' },
      { value: 100, label: 'f' },
    ];
    const stepPositions = [0, 20, 40, 60, 80, 100];

    test('keeps every control point inside its segment y-range', () => {
      const result = buildSmoothChartPath<TestDataItem, TestPoint>({
        data: stepData,
        dataPointPositions: stepPositions,
        calculateY: item => CHART_HEIGHT - item.value,
        buildPoint: (x, y, item) => ({ x, y, value: item.value, label: item.label }),
      });

      const segments = parseControlYs(result.path);
      expect(segments).toHaveLength(stepData.length - 1);

      segments.forEach((segment, index) => {
        const startY = result.points[index]?.y ?? 0;
        const minY = Math.min(startY, segment.endY);
        const maxY = Math.max(startY, segment.endY);

        expect(segment.cy1).toBeGreaterThanOrEqual(minY);
        expect(segment.cy1).toBeLessThanOrEqual(maxY);
        expect(segment.cy2).toBeGreaterThanOrEqual(minY);
        expect(segment.cy2).toBeLessThanOrEqual(maxY);
      });
    });

    test('never draws above the highest or below the lowest data point', () => {
      const result = buildSmoothChartPath<TestDataItem, TestPoint>({
        data: stepData,
        dataPointPositions: stepPositions,
        calculateY: item => CHART_HEIGHT - item.value,
        buildPoint: (x, y, item) => ({ x, y, value: item.value, label: item.label }),
      });

      const dataYs = result.points.map(point => point.y);
      const dataMin = Math.min(...dataYs);
      const dataMax = Math.max(...dataYs);

      // Control points bound the curve (convex hull), so bounding them bounds
      // the rendered line — no spike above the plateau, no dip below the floor.
      parseControlYs(result.path).forEach(segment => {
        expect(segment.cy1).toBeGreaterThanOrEqual(dataMin);
        expect(segment.cy1).toBeLessThanOrEqual(dataMax);
        expect(segment.cy2).toBeGreaterThanOrEqual(dataMin);
        expect(segment.cy2).toBeLessThanOrEqual(dataMax);
      });
    });
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
