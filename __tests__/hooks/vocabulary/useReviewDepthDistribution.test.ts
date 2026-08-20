/**
 * The distribution behind the practice screen's "Reviews done" tile.
 *
 * The assertions that matter most are the ones tying the parts to the whole.
 * This sheet exists to explain a number the learner tapped, so a breakdown that
 * counts a different set of words than the tile sums would be worse than no
 * breakdown at all. Both come from `fsrs_reps` and nothing else — these tests
 * are what keeps that true.
 */

import { describe, expect, test } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { rootId } from '@/__tests__/helpers/ids';
import { useReviewDepthDistribution } from '@/hooks/vocabulary/useReviewDepthDistribution';
import type { StudyWord } from '@/types/vocabulary.types';
import { DEPTH_BAND_KEYS, getWordDepthBand } from '@/utils/practiceDepth';

/** A word with exactly `reps` grades behind it. */
const withReps = (id: number, reps: number): StudyWord =>
  createTestWord({
    root_id: rootId(id),
    fsrs_state: reps > 0 ? 2 : 0,
    fsrs_reps: reps,
    fsrs_stability: reps > 0 ? 10 : 0.4,
  });

const render = (words: StudyWord[]) =>
  renderHook(() => useReviewDepthDistribution(words)).result.current;

const countOf = (result: ReturnType<typeof render>, key: string): number =>
  result.bands.find(band => band.key === key)?.count ?? -1;

describe('useReviewDepthDistribution', () => {
  test('an empty vocabulary reports zero everywhere, and still names all five bands', () => {
    const result = render([]);

    expect(result.totalReviews).toBe(0);
    expect(result.reviewedWords).toBe(0);
    expect(result.totalWords).toBe(0);
    expect(result.maxBandCount).toBe(0);
    expect(result.bands.map(band => band.key)).toEqual([...DEPTH_BAND_KEYS]);
  });

  test('bands partition the vocabulary — every word lands in exactly one', () => {
    const words = [0, 1, 2, 4, 5, 9, 10, 40].map((reps, index) => withReps(index + 1, reps));
    const result = render(words);

    const summed = result.bands.reduce((total, band) => total + band.count, 0);
    expect(summed).toBe(words.length);
    expect(result.totalWords).toBe(words.length);
  });

  test('the band boundaries are 1, 2, 5 and 10 reps', () => {
    const result = render([
      withReps(1, 0),
      withReps(2, 1),
      withReps(3, 2),
      withReps(4, 4),
      withReps(5, 5),
      withReps(6, 9),
      withReps(7, 10),
      withReps(8, 99),
    ]);

    expect(countOf(result, 'none')).toBe(1); // 0
    expect(countOf(result, 'once')).toBe(1); // 1
    expect(countOf(result, 'few')).toBe(2); // 2, 4
    expect(countOf(result, 'solid')).toBe(2); // 5, 9
    expect(countOf(result, 'deep')).toBe(2); // 10, 99
  });

  test('the total is Σ fsrs_reps — the same sum the practice tile shows', () => {
    const reps = [0, 1, 3, 7, 12];
    const result = render(reps.map((value, index) => withReps(index + 1, value)));

    expect(result.totalReviews).toBe(23);
    // Four of the five have a review behind them; the zero does not.
    expect(result.reviewedWords).toBe(4);
  });

  test('a null rep count is a word with no reviews, not a crash', () => {
    const result = render([createTestWord({ root_id: rootId(1), fsrs_reps: null })]);

    expect(result.totalReviews).toBe(0);
    expect(result.reviewedWords).toBe(0);
    expect(countOf(result, 'none')).toBe(1);
  });

  test('an impossible negative rep count cannot drag the total below the parts', () => {
    // The practice tile clamps at zero; so must this, or one bad row would make
    // the headline disagree with the rows underneath it.
    const result = render([withReps(1, -5), withReps(2, 6)]);

    expect(result.totalReviews).toBe(6);
    expect(countOf(result, 'none')).toBe(1);
    expect(countOf(result, 'solid')).toBe(1);
  });

  test('maxBandCount is the tallest band, so the row meters share one scale', () => {
    const result = render([withReps(1, 10), withReps(2, 11), withReps(3, 12), withReps(4, 1)]);

    expect(result.maxBandCount).toBe(3);
  });

  test('the never-reviewed band is off the scale, not the tallest bar on it', () => {
    // The bug this guards: on a young account "Not yet" is usually the biggest
    // group by far, and the sheet deliberately draws it WITHOUT a meter.
    // Counting it toward the scale measured every visible bar against an
    // invisible one, so a learner with 20 saved words and 2 reviewed saw two
    // bars at a tenth width and read the sheet as "you have done nothing".
    const result = render([
      ...Array.from({ length: 20 }, (_, index) => withReps(index + 1, 0)),
      withReps(21, 3),
      withReps(22, 4),
    ]);

    expect(result.bands.find(band => band.key === 'none')?.count).toBe(20);
    expect(result.maxBandCount).toBe(2);
  });

  test('depth is read off fsrs_reps alone — never off the practised gate', () => {
    // `hasBeenPractised` additionally requires `fsrs_state !== New`. If the
    // breakdown went through it, this word's reps would be counted in the total
    // and excluded from every band, so the rows would silently stop adding up.
    const oddball = createTestWord({ root_id: rootId(1), fsrs_state: 0, fsrs_reps: 6 });

    expect(getWordDepthBand(oddball)).toBe('solid');

    const result = render([oddball]);
    expect(result.totalReviews).toBe(6);
    expect(countOf(result, 'solid')).toBe(1);
  });
});
