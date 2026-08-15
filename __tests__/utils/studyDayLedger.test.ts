/**
 * The append-only study-day ledger, and the property it exists to restore.
 *
 * Without it, the streak's day keys come from each word's single, overwritten
 * `fsrs_last_review`, so re-reviewing a word ERASES the day it previously
 * contributed. `longestStreak` and `totalReadingDays` could therefore fall
 * between two app opens, and a beginner drilling the same small set every day
 * collapsed every key onto today and read a permanent streak of 1 — the metric
 * punished the most consistent new learner hardest.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// A STATEFUL AsyncStorage. The repo-wide mock always resolves `getItem` to
// null, which would make every ledger read look like a fresh install and every
// assertion below vacuous.
//
// Plain closures, NOT jest.fn(): jest.config sets `resetMocks: true`, which
// strips a jest.fn's implementation before each test — so a mocked store built
// from them silently starts returning undefined. Same trap the practice chart
// truth harness documents for the Skia path builder.
const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (key: string) => mockStore.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    mockStore.set(key, value);
  },
  removeItem: async (key: string) => {
    mockStore.delete(key);
  },
}));

import { mergeStudyDays, readStudyDays, recordStudyDay } from '@/utils/studyDayLedger';
import { toLocalDateString } from '@/utils/dateTimeUtils';

const daysAgo = (count: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - count);
  date.setHours(12, 0, 0, 0);
  return date;
};

const keysFor = (...counts: number[]): Set<string> =>
  new Set(counts.map(count => toLocalDateString(daysAgo(count))));

beforeEach(() => {
  mockStore.clear();
});

describe('studyDayLedger', () => {
  test('a fresh install has no history and does not invent any', async () => {
    expect(await readStudyDays()).toEqual(new Set());
  });

  test('recording a day is idempotent within that day', async () => {
    await recordStudyDay(daysAgo(0));
    await recordStudyDay(daysAgo(0));

    const days = await readStudyDays();
    expect(days.size).toBe(1);
    expect(days.has(toLocalDateString(daysAgo(0)))).toBe(true);
  });

  test('merging seeds the ledger from what the server could still derive', async () => {
    const derived = keysFor(0, 1, 2);
    const merged = await mergeStudyDays(derived);

    expect(merged).toEqual(derived);
    // …and it persists, so the next merge does not depend on the server still
    // being able to derive it.
    expect(await readStudyDays()).toEqual(derived);
  });

  test('THE invariant: a day already recorded survives the server forgetting it', async () => {
    // Day 1: three study days are derivable.
    await mergeStudyDays(keysFor(0, 1, 2));

    // Day 2: the learner re-reviews every word, so every `fsrs_last_review`
    // now points at today. The server-derived set collapses to a single key —
    // this is the exact scenario that used to destroy a streak.
    const collapsed = keysFor(0);
    const merged = await mergeStudyDays(collapsed);

    expect(merged.size).toBe(3);
    expect(merged).toEqual(keysFor(0, 1, 2));
  });

  test('the merged set only ever grows across repeated collapses', async () => {
    let previousSize = 0;

    for (const day of [4, 3, 2, 1, 0]) {
      // Each pass the server can only "remember" one day — the most recent.
      const merged = await mergeStudyDays(keysFor(day));
      expect(merged.size).toBeGreaterThanOrEqual(previousSize);
      previousSize = merged.size;
    }

    expect(previousSize).toBe(5);
  });

  test('corrupt storage degrades to empty rather than throwing', async () => {
    mockStore.set('study_day_keys', 'not json at all');
    expect(await readStudyDays()).toEqual(new Set());

    mockStore.set('study_day_keys', JSON.stringify({ not: 'an array' }));
    expect(await readStudyDays()).toEqual(new Set());
  });

  test('entries that are not day keys are discarded, not trusted', async () => {
    mockStore.set(
      'study_day_keys',
      JSON.stringify(['2026-08-09', 42, null, 'yesterday', '2026-8-9']),
    );

    expect(await readStudyDays()).toEqual(new Set(['2026-08-09']));
  });
});
