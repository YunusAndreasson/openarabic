/**
 * `columnGeometry` — the one place the bar charts lay their columns out.
 */

import { describe, expect, test } from '@jest/globals';

import { columnGeometry } from '@/utils/barChartPath';

describe('columnGeometry', () => {
  test('fills the width exactly, the gaps included', () => {
    const { barWidth, pitch, span } = columnGeometry(96, 7, 3);

    expect(barWidth).toBeCloseTo((96 - 6 * 3) / 7);
    expect(pitch).toBeCloseTo(barWidth + 3);
    expect(span).toBeCloseTo(96);
    // The last column ends on the right edge.
    expect(6 * pitch + barWidth).toBeCloseTo(96);
  });

  // The streak chart's forty days on a narrow screen: a day must not shrink
  // to nothing, so the columns span wider than they were given instead.
  test('a floor on the column wins over the width, and says how wide it went', () => {
    const { barWidth, span } = columnGeometry(100, 40, 2, 6);

    expect(barWidth).toBe(6);
    expect(span).toBe(40 * 6 + 39 * 2);
  });

  test('no columns span nothing rather than dividing by zero', () => {
    expect(columnGeometry(100, 0, 2)).toEqual({ barWidth: 0, pitch: 2, span: 0 });
  });
});
