/**
 * Tests for rankStrugglingWords — the "words to revisit" (leech) ranking.
 *
 * Ported in spirit from edenmind's rankStrugglingCards tests, adapted to the
 * StudyWord shape: filters New / never-studied words, ranks by lapses then
 * difficulty, and honours the minLapses / limit options.
 */

import { describe, expect, test } from '@jest/globals';
import { State } from 'ts-fsrs';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { LEECH_LIST_LIMIT, LEECH_MIN_LAPSES } from '@/constants/fsrs';
import type { RootId } from '@/types/branded.types';
import { rankStrugglingWords } from '@/utils/leechUtils';

const leech = (root_id: number, lapses: number, difficulty: number) =>
  createTestWord({
    root_id: root_id as RootId,
    fsrs_state: State.Review,
    fsrs_reps: 5,
    fsrs_lapses: lapses,
    fsrs_difficulty: difficulty,
  });

describe('rankStrugglingWords', () => {
  test('excludes New / never-studied words even with high lapses', () => {
    const words = [
      createTestWord({ root_id: 1 as RootId, fsrs_state: State.New, fsrs_reps: 0, fsrs_lapses: 9 }),
      createTestWord({
        root_id: 2 as RootId,
        fsrs_state: State.Review,
        fsrs_reps: 0, // never actually reviewed
        fsrs_lapses: 9,
      }),
    ];

    expect(rankStrugglingWords(words)).toEqual([]);
  });

  test('excludes words below the minimum lapse threshold', () => {
    const words = [leech(1, LEECH_MIN_LAPSES - 1, 7), leech(2, LEECH_MIN_LAPSES, 7)];

    const result = rankStrugglingWords(words);

    expect(result).toHaveLength(1);
    expect(result[0]?.root_id).toBe(2);
  });

  test('sorts by lapses desc, then difficulty desc as a tiebreak', () => {
    const words = [
      leech(1, 2, 9), // fewer lapses but harder
      leech(2, 5, 4),
      leech(3, 5, 8), // same lapses as #2, higher difficulty → ranks above it
    ];

    const result = rankStrugglingWords(words).map(w => w.root_id);

    expect(result).toEqual([3, 2, 1]);
  });

  test('respects an explicit limit', () => {
    const words = [leech(1, 6, 7), leech(2, 5, 7), leech(3, 4, 7)];

    const result = rankStrugglingWords(words, { limit: 2 }).map(w => w.root_id);

    expect(result).toEqual([1, 2]);
  });

  test('honours a custom minLapses', () => {
    const words = [leech(1, 2, 7), leech(2, 4, 7)];

    const result = rankStrugglingWords(words, { minLapses: 3 }).map(w => w.root_id);

    expect(result).toEqual([2]);
  });

  test('defaults cap the result at LEECH_LIST_LIMIT', () => {
    const words = Array.from({ length: LEECH_LIST_LIMIT + 5 }, (_, i) => leech(i + 1, 2 + i, 7));

    expect(rankStrugglingWords(words)).toHaveLength(LEECH_LIST_LIMIT);
  });
});
