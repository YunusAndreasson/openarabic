/**
 * The distribution behind the practice screen's memory constellation.
 *
 * The assertions that matter most are about what does NOT get counted. A word
 * that has never been practised carries PLACEHOLDER FSRS values — stability 0.4,
 * difficulty 6.5, and an `fsrs_last_review` stamped at save time — not nulls.
 * Reading those as a real memory has already caused two shipped bugs, so the
 * gate gets its own tests here rather than being assumed.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

jest.mock('@shopify/react-native-skia', () => {
  const makePathBuilder = () => {
    const builder = {
      moveTo: () => builder,
      lineTo: () => builder,
      quadTo: () => builder,
      addRect: () => builder,
      close: () => builder,
      build: () => ({ toSVGString: () => '' }),
    };
    return builder;
  };
  return { Skia: { PathBuilder: { Make: makePathBuilder } } };
});

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { useMemoryHorizonDistribution } from '@/hooks/vocabulary/useMemoryHorizonDistribution';
import type { StudyWord } from '@/types/vocabulary.types';
import { BIN_COUNT } from '@/utils/horizonBandPath';
import { rootId } from '@/__tests__/helpers/ids';

/** A word that has genuinely been reviewed, holding for `stability` days. */
const practised = (id: number, stability: number): StudyWord =>
  createTestWord({
    root_id: rootId(id),
    fsrs_state: 2,
    fsrs_reps: 3,
    fsrs_stability: stability,
    fsrs_last_review: new Date().toISOString(),
  });

/** Exactly what `createInitialFSRSEntry` / `createResetFSRSUpdate` write. */
const neverPractised = (id: number): StudyWord =>
  createTestWord({
    root_id: rootId(id),
    fsrs_state: 0,
    fsrs_reps: 0,
    fsrs_stability: 0.4,
    fsrs_difficulty: 6.5,
    fsrs_last_review: new Date().toISOString(),
  });

const render = (words: StudyWord[]) =>
  renderHook(() => useMemoryHorizonDistribution(words)).result.current;

describe('useMemoryHorizonDistribution', () => {
  test('an all-new vocabulary has no distribution, and reports zero — not a band', () => {
    const result = render([neverPractised(1), neverPractised(2), neverPractised(3)]);

    expect(result.hasDistribution).toBe(false);
    expect(result.practisedCount).toBe(0);
    expect(result.notStartedCount).toBe(3);
    expect(result.totalWords).toBe(3);
    // Crucially: nothing is drawn at bin 0. A never-practised word has no
    // horizon, which is not the same as the shortest possible one.
    expect(result.bins.every(count => count === 0)).toBe(true);
    expect(result.bands.every(band => band.count === 0)).toBe(true);
    expect(result.medianDays).toBeNull();
    expect(result.medianLabel).toBe('');
  });

  test('placeholder values never leak into the distribution', () => {
    const result = render([practised(1, 20), neverPractised(2), neverPractised(3)]);

    expect(result.practisedCount).toBe(1);
    expect(result.notStartedCount).toBe(2);
    expect(result.bins.reduce((sum, count) => sum + count, 0)).toBe(1);
    expect(result.medianDays).toBe(20);
  });

  test('bins partition the practised words exactly', () => {
    const words = [1, 3, 8, 20, 45, 200, 400].map((days, index) => practised(index + 1, days));
    const result = render(words);

    expect(result.bins).toHaveLength(BIN_COUNT);
    expect(result.bins.reduce((sum, count) => sum + count, 0)).toBe(words.length);
    expect(result.bands.reduce((sum, band) => sum + band.count, 0)).toBe(words.length);
    expect(result.maxBinCount).toBe(Math.max(...result.bins));
  });

  test('bands sort words the way the labels claim', () => {
    const result = render([
      practised(1, 2), // days
      practised(2, 5), // days
      practised(3, 10), // weeks
      practised(4, 60), // months
      practised(5, 400), // year
    ]);

    const counts = Object.fromEntries(result.bands.map(band => [band.key, band.count]));
    expect(counts).toEqual({ days: 2, weeks: 1, months: 1, year: 1 });
  });

  test('the median is a median, not a mean', () => {
    // A mean would be dragged past 100 by the one long word; the median stays
    // where the learner's words actually are.
    const result = render([practised(1, 2), practised(2, 4), practised(3, 300)]);

    expect(result.medianDays).toBe(4);
    expect(result.medianFraction).toBeGreaterThan(0);
    expect(result.medianFraction).toBeLessThan(1);
  });

  test('an even-sized collection averages the two middle words', () => {
    const result = render([practised(1, 2), practised(2, 4), practised(3, 6), practised(4, 100)]);
    expect(result.medianDays).toBe(5);
  });

  test('a single practised word still produces a median and one mark', () => {
    const result = render([practised(1, 12)]);

    expect(result.hasDistribution).toBe(true);
    expect(result.medianDays).toBe(12);
    expect(result.bins.reduce((sum, count) => sum + count, 0)).toBe(1);
    expect(result.wordsPerDot).toBe(1);
  });

  test('a word at the top of the range lands in the last bin, not past it', () => {
    const result = render([practised(1, 365), practised(2, 100000)]);
    expect(result.bins[BIN_COUNT - 1]).toBe(2);
  });

  test('a big collection scales dots instead of overflowing, and says so', () => {
    // 400 words all at the same horizon: one column, far taller than fits.
    const words = Array.from({ length: 400 }, (_, index) => practised(index + 1, 30));
    const result = render(words);

    expect(result.wordsPerDot).toBeGreaterThan(1);
    expect(Math.ceil(result.maxBinCount / result.wordsPerDot)).toBeLessThanOrEqual(
      result.maxBinCount,
    );
  });

  test('an empty vocabulary is empty, not NaN', () => {
    const result = render([]);

    expect(result.totalWords).toBe(0);
    expect(result.notStartedCount).toBe(0);
    expect(result.hasDistribution).toBe(false);
    expect(Number.isNaN(result.medianFraction)).toBe(false);
  });
});
