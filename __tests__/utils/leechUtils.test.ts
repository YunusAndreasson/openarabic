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
import { isLeechWord, rankStrugglingWords } from '@/utils/leechUtils';
import { rootId } from '@/__tests__/helpers/ids';

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
      createTestWord({ root_id: rootId(1), fsrs_state: State.New, fsrs_reps: 0, fsrs_lapses: 9 }),
      createTestWord({
        root_id: rootId(2),
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

describe('isLeechWord', () => {
  test('needs a review behind it, not just lapses', () => {
    expect(
      isLeechWord(createTestWord({ fsrs_state: State.New, fsrs_reps: 0, fsrs_lapses: 9 })),
    ).toBe(false);
    expect(
      isLeechWord(createTestWord({ fsrs_state: State.Review, fsrs_reps: 0, fsrs_lapses: 9 })),
    ).toBe(false);
  });

  test('qualifies exactly at LEECH_MIN_LAPSES', () => {
    expect(isLeechWord(leech(1, LEECH_MIN_LAPSES - 1, 7))).toBe(false);
    expect(isLeechWord(leech(1, LEECH_MIN_LAPSES, 7))).toBe(true);
  });

  test('a caller-supplied minLapses overrides the default', () => {
    expect(isLeechWord(leech(1, 2, 7), 3)).toBe(false);
    expect(isLeechWord(leech(1, 4, 7), 3)).toBe(true);
  });

  test('is safe to hand straight to Array.filter', () => {
    // `filter` passes the index as a second argument, which lands on the
    // `minLapses` parameter — at index 0 that would make every word a leech.
    // Call sites must wrap it; this pins the failure mode so the reason is on
    // record.
    const clean = createTestWord({ fsrs_state: State.Review, fsrs_reps: 5, fsrs_lapses: 0 });
    expect([clean].filter(word => isLeechWord(word))).toEqual([]);
  });
});
