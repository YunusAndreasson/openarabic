/**
 * Tests for the dictionary list's scope, search and sort composition.
 *
 * Two behaviours are worth guarding:
 *  - each scope delegates to the predicate that already defines that word
 *    elsewhere, so the dictionary can never disagree with the Practice screen
 *    or "Words to revisit" about what is due or what is struggling;
 *  - words with no FSRS measurement stay grouped, instead of ranking as the
 *    "easiest" word under one sort and the "weakest" under another.
 */

import { describe, expect, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { State } from 'ts-fsrs';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { LEECH_MIN_LAPSES } from '@/constants/fsrs';
import { useDictionaryList } from '@/hooks/vocabulary/useDictionaryList';
import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';

const HOUR_MS = 60 * 60 * 1000;

const withRoot = (word: StudyWord, letters: string, meaning: string): StudyWord =>
  ({
    ...word,
    root: { id: word.root_id, letters, meaning, audio_url: null, audio_url_en: null },
  }) as StudyWord;

/** Graduated, not due for a while, never lapsed, comfortably mastered. */
const mastered = (root_id: number) =>
  createTestWord({
    root_id: root_id as RootId,
    fsrs_state: State.Review,
    fsrs_stability: 40,
    fsrs_difficulty: 4,
    fsrs_reps: 8,
    fsrs_lapses: 0,
    fsrs_due: new Date(Date.now() + 30 * 24 * HOUR_MS).toISOString(),
  });

/** Graduated but overdue, and has been forgotten enough to count as a leech. */
const struggling = (root_id: number) =>
  createTestWord({
    root_id: root_id as RootId,
    fsrs_state: State.Review,
    fsrs_stability: 2,
    fsrs_difficulty: 9,
    fsrs_reps: 12,
    fsrs_lapses: LEECH_MIN_LAPSES,
    fsrs_due: new Date(Date.now() - HOUR_MS).toISOString(),
  });

/**
 * Saved but never practised. Deliberately carries the *placeholder* values
 * `createInitialFSRSEntry` really writes — stability 0.4, difficulty 6.5, a
 * last_review stamped at save time — rather than nulls. Nulls would make the
 * unmeasured bucketing look correct while it silently never fired in production.
 */
const unmeasured = (root_id: number) =>
  createTestWord({
    root_id: root_id as RootId,
    fsrs_state: State.New,
    fsrs_stability: 0.4,
    fsrs_difficulty: 6.5,
    fsrs_reps: 0,
    fsrs_lapses: 0,
  });

/** Practised, with the FSRS values under test. */
const measured = (root_id: number, overrides: Partial<StudyWord>) =>
  createTestWord({
    root_id: root_id as RootId,
    fsrs_state: State.Review,
    fsrs_reps: 4,
    ...overrides,
  });

const ids = (words: StudyWord[]): number[] => words.map(word => word.root_id);

describe('useDictionaryList scopes', () => {
  const studyWords = [mastered(1), struggling(2), unmeasured(3)];

  test('defaults to showing everything', () => {
    const { result } = renderHook(() => useDictionaryList({ studyWords }));

    expect(result.current.scope).toBe('all');
    expect(result.current.words).toHaveLength(3);
    expect(result.current.totalCount).toBe(3);
  });

  test('due includes overdue words and new ones, which are always due', () => {
    const { result } = renderHook(() => useDictionaryList({ studyWords }));

    act(() => result.current.setScope('due'));

    expect(ids(result.current.words).sort()).toEqual([2, 3]);
  });

  test('struggling is the leech rule, so a mastered word never qualifies', () => {
    const { result } = renderHook(() => useDictionaryList({ studyWords }));

    act(() => result.current.setScope('struggling'));

    expect(ids(result.current.words)).toEqual([2]);
  });

  test('mastered excludes anything that has not graduated', () => {
    const { result } = renderHook(() => useDictionaryList({ studyWords }));

    act(() => result.current.setScope('mastered'));

    expect(ids(result.current.words)).toEqual([1]);
  });

  test('reports a count per scope so an empty one is visible before it is chosen', () => {
    const { result } = renderHook(() => useDictionaryList({ studyWords }));

    expect(result.current.scopeCounts).toEqual({
      all: 3,
      due: 2,
      struggling: 1,
      mastered: 1,
    });
  });

  test('totalCount stays the whole library while a scope narrows the list', () => {
    const { result } = renderHook(() => useDictionaryList({ studyWords }));

    act(() => result.current.setScope('mastered'));

    expect(result.current.words).toHaveLength(1);
    expect(result.current.totalCount).toBe(3);
  });

  test('search asks its question inside the active scope', () => {
    const words = [
      withRoot(mastered(1), 'كِتاب', 'book'),
      withRoot(struggling(2), 'مَدرَسة', 'book shop'),
    ];
    const { result } = renderHook(() => useDictionaryList({ studyWords: words }));

    act(() => result.current.setSearchQuery('book'));
    expect(ids(result.current.words).sort()).toEqual([1, 2]);

    act(() => result.current.setScope('struggling'));
    expect(ids(result.current.words)).toEqual([2]);
  });
});

describe('useDictionaryList sorting', () => {
  test('never-practised words stay grouped at the end under both directions', () => {
    // The bug this guards: a never-practised word is ranked on placeholder
    // numbers (difficulty 6.5, stability 0.4) that measure nothing, so it landed
    // mid-table one way and dead last the other — an order the learner cannot
    // read, about a word whose own dot says "New".
    const studyWords = [
      unmeasured(3),
      measured(1, { fsrs_difficulty: 2, fsrs_stability: 1 }),
      measured(2, { fsrs_difficulty: 9, fsrs_stability: 30 }),
    ];

    const { result } = renderHook(() => useDictionaryList({ studyWords }));

    // Default: difficulty, hardest first
    expect(ids(result.current.words)).toEqual([2, 1, 3]);

    // Flip to easiest first — the unmeasured word must not migrate to the top
    act(() => result.current.selectSortField('difficulty'));
    expect(ids(result.current.words)).toEqual([1, 2, 3]);
  });

  test('the same holds for the strength sort', () => {
    const studyWords = [
      unmeasured(3),
      measured(1, { fsrs_stability: 1, fsrs_difficulty: 5 }),
      measured(2, { fsrs_stability: 30, fsrs_difficulty: 5 }),
    ];

    const { result } = renderHook(() => useDictionaryList({ studyWords }));

    act(() => result.current.selectSortField('strength'));
    expect(ids(result.current.words)).toEqual([1, 2, 3]);

    act(() => result.current.selectSortField('strength'));
    expect(ids(result.current.words)).toEqual([2, 1, 3]);
  });

  test('re-selecting the active field flips direction; a new field resets it', () => {
    const { result } = renderHook(() => useDictionaryList({ studyWords: [mastered(1)] }));

    expect(result.current.sortDirection).toBe('desc');

    act(() => result.current.selectSortField('difficulty'));
    expect(result.current.sortDirection).toBe('asc');

    act(() => result.current.selectSortField('strength'));
    expect(result.current.sortField).toBe('strength');
    expect(result.current.sortDirection).toBe('asc'); // weakest memory first
  });

  test('the recent sort has nothing to bucket — every word has a created_at', () => {
    const studyWords = [
      measured(1, { created_at: new Date(Date.now() - HOUR_MS).toISOString() }),
      unmeasured(2),
    ];

    const { result } = renderHook(() => useDictionaryList({ studyWords }));

    act(() => result.current.selectSortField('recent'));
    expect(ids(result.current.words)).toEqual([2, 1]);
  });
});
