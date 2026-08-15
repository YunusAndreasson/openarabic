/**
 * Geometry + path invariants for the memory constellation.
 *
 * The load-bearing one is interpolatability: `usePathInterpolation` validates
 * `outputRange[0].isInterpolatable(next)` on EVERY render and THROWS rather than
 * warning when it fails. A path built with a different verb sequence for a
 * different dataset would therefore crash the app's most-visited screen the
 * first time a learner's distribution changed shape. The emitter guards against
 * that by always writing `BIN_COUNT` columns of seven verbs each; these tests
 * are what keep that property from being "simplified" away.
 */

import { describe, expect, jest, test } from '@jest/globals';

// The repo-wide Skia mock is built from jest.fn()s and jest.config sets
// `resetMocks: true`, so by the time a test runs PathBuilder.Make() returns
// undefined. Substitute a real (tiny) recording builder: plain closures survive
// resetMocks, and the emitted verb sequence is genuine, which is the whole point
// of the assertions below. Same technique as the practice chart truth harness.
jest.mock('@shopify/react-native-skia', () => {
  const makePathBuilder = () => {
    const segments: string[] = [];
    const builder = {
      moveTo: (x: number, y: number) => {
        segments.push(`M${x} ${y}`);
        return builder;
      },
      lineTo: (x: number, y: number) => {
        segments.push(`L${x} ${y}`);
        return builder;
      },
      quadTo: (cx: number, cy: number, x: number, y: number) => {
        segments.push(`Q${cx} ${cy} ${x} ${y}`);
        return builder;
      },
      addRect: (rect: { x: number; y: number; width: number; height: number }) => {
        segments.push(`R${rect.x} ${rect.y} ${rect.width} ${rect.height}`);
        return builder;
      },
      close: () => {
        segments.push('Z');
        return builder;
      },
      build: () => ({ toSVGString: () => segments.join(' ') }),
    };
    return builder;
  };

  return { Skia: { PathBuilder: { Make: makePathBuilder } } };
});

import {
  BIN_COUNT,
  BIN_GAP,
  BIN_WIDTH,
  DOT_COLUMN_CAP,
  MIN_BIN_SCALE,
  PLOT_HEIGHT,
  binX,
  buildHorizonBandPath,
  dotCenter,
  getPlotMax,
  getWordsPerDot,
} from '@/utils/horizonBandPath';
import {
  formatHorizon,
  getHorizonBand,
  getHorizonBandsAccessibilityLabel,
  HORIZON_BAND_KEYS,
  HORIZON_BAND_LABELS,
} from '@/utils/memoryHorizon';

/** Count the drawing commands the mocked PathBuilder recorded. */
const verbsOf = (path: { toSVGString: () => string }): string[] =>
  path
    .toSVGString()
    .split(' ')
    .filter(token => /^[A-Za-z]/.test(token))
    .map(token => token[0] as string);

const bins = (...counts: number[]): number[] => {
  const filled = new Array<number>(BIN_COUNT).fill(0);
  counts.forEach((count, index) => {
    if (index < BIN_COUNT) filled[index] = count;
  });
  return filled;
};

describe('horizon band geometry', () => {
  test('columns tile the full width without overlapping', () => {
    expect(BIN_COUNT).toBeGreaterThanOrEqual(16);
    expect(BIN_COUNT).toBeLessThanOrEqual(32);
    expect(binX(0)).toBe(0);

    for (let index = 1; index < BIN_COUNT; index++) {
      expect(binX(index)).toBeCloseTo(binX(index - 1) + BIN_WIDTH + BIN_GAP, 5);
    }
  });

  test('the scale floor stops one word filling the canvas', () => {
    expect(getPlotMax(0)).toBe(MIN_BIN_SCALE);
    expect(getPlotMax(1)).toBe(MIN_BIN_SCALE);
    // A single word occupies at most 1/MIN_BIN_SCALE of the plot.
    expect(1 / getPlotMax(1)).toBeLessThanOrEqual(1 / MIN_BIN_SCALE);
    // Past the floor the real peak takes over.
    expect(getPlotMax(12)).toBe(12);
  });

  test('dots stay inside the canvas at every depth up to the cap', () => {
    for (let depth = 0; depth < DOT_COLUMN_CAP; depth++) {
      const { y } = dotCenter(0, depth);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(PLOT_HEIGHT);
    }
  });

  test('one dot means one word until a column would overflow', () => {
    expect(getWordsPerDot(0)).toBe(1);
    expect(getWordsPerDot(DOT_COLUMN_CAP)).toBe(1);

    const overflowing = DOT_COLUMN_CAP * 3 + 1;
    const perDot = getWordsPerDot(overflowing);
    expect(perDot).toBeGreaterThan(1);
    // Whatever the ratio, the tallest column must now fit.
    expect(Math.ceil(overflowing / perDot)).toBeLessThanOrEqual(DOT_COLUMN_CAP);
  });
});

describe('buildHorizonBandPath — interpolatability contract', () => {
  const datasets: Record<string, number[]> = {
    'all empty': bins(),
    'one word': bins(1),
    'single bin, many words': bins(0, 0, 0, 40),
    'every bin full': new Array<number>(BIN_COUNT).fill(7),
    'sparse tail': bins(3, 0, 0, 1, 0, 0, 0, 9),
  };

  const verbCounts = Object.entries(datasets).map(([name, counts]) => {
    const path = buildHorizonBandPath(counts, getPlotMax(Math.max(0, ...counts)));
    return [name, verbsOf(path)] as const;
  });

  test('every dataset emits exactly BIN_COUNT columns of seven verbs', () => {
    verbCounts.forEach(([name, verbs]) => {
      expect([name, verbs.length]).toEqual([name, BIN_COUNT * 7]);
    });
  });

  test('every dataset emits the identical verb sequence', () => {
    const [, reference] = verbCounts[0] as readonly [string, string[]];
    verbCounts.forEach(([name, verbs]) => {
      expect([name, verbs.join('')]).toEqual([name, reference.join('')]);
    });
  });

  test('a zero-count column is degenerate, not absent', () => {
    // An empty dataset still draws every column; they simply have no height.
    const empty = buildHorizonBandPath(bins(), getPlotMax(0));
    expect(verbsOf(empty)).toHaveLength(BIN_COUNT * 7);
  });
});

describe('horizon bands agree with the horizon labels', () => {
  test('band boundaries are formatHorizon boundaries', () => {
    // 6.99 days is still "days"; 7 is "1 week". If these ever disagree, a word's
    // detail screen and the practice chart describe the same word differently.
    expect(getHorizonBand(6.99)).toBe('days');
    expect(getHorizonBand(7)).toBe('weeks');
    expect(getHorizonBand(29.99)).toBe('weeks');
    expect(getHorizonBand(30)).toBe('months');
    expect(getHorizonBand(364.99)).toBe('months');
    expect(getHorizonBand(365)).toBe('year');
  });

  test('no horizon is not band zero', () => {
    expect(getHorizonBand(null)).toBeNull();
    expect(getHorizonBand(0)).toBeNull();
    expect(getHorizonBand(Number.NaN)).toBeNull();
  });

  test('every stability inside a band is named by that band’s unit', () => {
    const samples: Record<string, number[]> = {
      days: [0.4, 1, 3, 6.5],
      weeks: [7, 13, 21, 29],
      months: [30, 45, 120, 364],
      year: [365, 400],
    };

    Object.entries(samples).forEach(([band, values]) => {
      values.forEach(days => {
        expect([days, getHorizonBand(days)]).toEqual([days, band]);
        // And the printed horizon uses the same unit word the band label does.
        const printed = formatHorizon(days).toLowerCase();
        const label = HORIZON_BAND_LABELS[band as keyof typeof HORIZON_BAND_LABELS].toLowerCase();
        if (band === 'year') {
          expect(printed).toContain('year');
        } else {
          expect(printed).toContain(label.replace(/s$/, ''));
        }
      });
    });
  });

  test('the spoken description names only the non-empty bands', () => {
    const spoken = getHorizonBandsAccessibilityLabel(
      HORIZON_BAND_KEYS.map((key, index) => ({
        key,
        label: HORIZON_BAND_LABELS[key],
        count: index === 1 ? 4 : 0,
      })),
    );

    expect(spoken).toBe('4 for weeks');
  });
});
