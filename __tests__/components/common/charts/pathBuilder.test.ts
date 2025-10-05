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

import { buildSmoothChartPath } from '@charts/pathBuilder';

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

  it('should build path with single data point', () => {
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

  it('should build smooth path with multiple data points', () => {
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

    // Path should start with moveTo and have cubic curves
    expect(result.path).toContain('M0,150');
    expect(result.path).toContain('C30,150 70,100 100,100'); // First curve
    expect(result.path).toContain('C130,100 170,125 200,125'); // Second curve
  });

  it('should use correct cubic bezier control points', () => {
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

    // Control points should be at 30% (90) and 70% (210) of distance (300)
    // controlX1 = 0 + (300 - 0) * 0.3 = 90
    // controlY1 = 200 (prevPoint.y)
    // controlX2 = 0 + (300 - 0) * 0.7 = 210
    // controlY2 = 100 (current y)
    expect(result.path).toContain('C90,200 210,100 300,100');
  });

  it('should handle empty data array', () => {
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

  it('should pass index to calculateY and buildPoint functions', () => {
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
      })
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

  it('should handle missing position (fallback to 0)', () => {
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
