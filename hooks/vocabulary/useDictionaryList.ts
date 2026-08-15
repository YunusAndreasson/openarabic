import { useCallback, useMemo, useState } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';
import { isLeechWord } from '@/utils/leechUtils';
import {
  getMemoryHorizonDays,
  getWordHorizonBand,
  type HorizonBandKey,
} from '@/utils/memoryHorizon';
import { hasBeenPractised, isDueWord, isMasteredWord } from '@/utils/wordClassification';

export type DictionarySortField = 'difficulty' | 'strength' | 'recent';
export type SortDirection = 'asc' | 'desc';

/** The four the scope picker offers. `all` is the resting state, not a filter. */
export type PickerScope = 'all' | 'due' | 'struggling' | 'mastered';

/**
 * The horizon bands, as scopes.
 *
 * These are NOT in the scope picker: it renders full-height option cards inside
 * a dynamically-sized bottom sheet with no scroll, and nine of them overflow a
 * small phone. They are reached from the memory-horizon sheet, which is where
 * the bands are drawn and explained, and left through the sort bar's clear
 * control.
 *
 * They share the single `scope` slot rather than adding a second filter
 * dimension, which buys two things for free: the list can only ever be under one
 * filter, and the sort bar's existing count line already names whichever it is.
 */
export const HORIZON_SCOPES = [
  'horizon-days',
  'horizon-weeks',
  'horizon-months',
  'horizon-year',
  'horizon-none',
] as const;

export type HorizonScope = (typeof HORIZON_SCOPES)[number];

/** What the list is showing. */
export type DictionaryScope = PickerScope | HorizonScope;

/** The scope that shows one band's words — the memory sheet's row targets. */
export const HORIZON_BAND_SCOPES: Record<HorizonBandKey, HorizonScope> = {
  days: 'horizon-days',
  weeks: 'horizon-weeks',
  months: 'horizon-months',
  year: 'horizon-year',
};

/** Takes a bare `string` so a route param can be validated without a cast. */
export function isHorizonScope(scope: string): scope is HorizonScope {
  return (HORIZON_SCOPES as readonly string[]).includes(scope);
}

/** Direction applied when a field is first selected — the reading a learner wants most. */
const DEFAULT_DIRECTIONS: Record<DictionarySortField, SortDirection> = {
  difficulty: 'desc', // hardest first
  strength: 'asc', // weakest memory first
  recent: 'desc', // newest first
};

/**
 * Every scope reuses a predicate that already defines that word elsewhere, so a
 * word can never be "due" here and not due on the Practice screen, or
 * "struggling" here and absent from Words to revisit.
 */
const SCOPE_PREDICATES: Record<DictionaryScope, (word: StudyWord) => boolean> = {
  all: () => true,
  due: word => isDueWord(word),
  // Wrapped, not passed by reference: `filter` hands the callback the index as a
  // second argument, and `isLeechWord`'s second parameter is `minLapses` — so a
  // bare reference made every word at index 0 or 1 a leech.
  struggling: word => isLeechWord(word),
  mastered: word => isMasteredWord(word),
  // Through `getWordHorizonBand`, never a bare stability comparison: the band
  // boundaries and the practised gate both live there, so a row in the memory
  // sheet and the list it opens count the same words by construction.
  'horizon-days': word => getWordHorizonBand(word) === 'days',
  'horizon-weeks': word => getWordHorizonBand(word) === 'weeks',
  'horizon-months': word => getWordHorizonBand(word) === 'months',
  'horizon-year': word => getWordHorizonBand(word) === 'year',
  // The complement of the four bands — saved, but with no memory state to place
  // on the axis. `null` horizon, not stability 0: a never-practised word carries
  // a placeholder stability, so a numeric test would file it under "days".
  'horizon-none': word => getMemoryHorizonDays(word) === null,
};

/**
 * The order that makes a band worth opening.
 *
 * Inside a band, weakest-first puts the words about to fall out of it at the
 * top — and because `strength` sorts on stability, the row meter then draws the
 * very quantity the constellation placed each dot by. The list reads as a
 * zoomed-in slice of the chart rather than as a different view of it.
 *
 * "Not started" is the exception: those words have no measured stability at all
 * (they sort as one undifferentiated block at the end, by design), so they are
 * ordered by when they were saved instead.
 */
const HORIZON_SCOPE_SORT: Record<
  HorizonScope,
  { field: DictionarySortField; direction: SortDirection }
> = {
  'horizon-days': { field: 'strength', direction: 'asc' },
  'horizon-weeks': { field: 'strength', direction: 'asc' },
  'horizon-months': { field: 'strength', direction: 'asc' },
  'horizon-year': { field: 'strength', direction: 'asc' },
  'horizon-none': { field: 'recent', direction: 'desc' },
};

// Harakat, superscript alef, and tatweel — stripped so typing "كتب" matches "كَتَبَ"
const ARABIC_DIACRITICS = /[ً-ْٰـ]/g;

function normalizeForSearch(text: string): string {
  return text.replace(ARABIC_DIACRITICS, '').toLowerCase();
}

/**
 * A word with no review behind it has no difficulty and no memory to compare.
 *
 * Ranking it anyway put the same word at opposite ends of the list depending on
 * the sort: a never-practised word is written with a *placeholder* difficulty of
 * 6.5 and stability of 0.4 (see `createInitialFSRSEntry`), so it landed
 * mid-table under "hardest first" and dead last under "strongest first" — an
 * order built from numbers that measure nothing. Grouping them keeps them
 * together at one known end, matching the empty meter and "New" dot the row
 * already shows.
 *
 * Note this cannot be a null check: those placeholder columns are never null.
 */
function isUnmeasured(word: StudyWord, field: DictionarySortField): boolean {
  if (field === 'recent') return false;
  return !hasBeenPractised(word);
}

function compareWords(a: StudyWord, b: StudyWord, field: DictionarySortField): number {
  switch (field) {
    case 'difficulty':
      return (a.fsrs_difficulty ?? 0) - (b.fsrs_difficulty ?? 0);
    case 'strength':
      return (a.fsrs_stability ?? 0) - (b.fsrs_stability ?? 0);
    case 'recent':
      return (
        (parseSupabaseTimestamp(a.created_at)?.getTime() ?? 0) -
        (parseSupabaseTimestamp(b.created_at)?.getTime() ?? 0)
      );
  }
}

interface UseDictionaryListProps {
  studyWords: StudyWord[];
  /**
   * The scope this list opens under, when it was opened *at* something — the
   * memory sheet's horizon rows are the only caller today.
   *
   * Read once, as initial state rather than through an effect: an effect would
   * paint the whole dictionary for a frame before narrowing it, which reads as
   * the filter failing and then catching up.
   */
  initialScope?: DictionaryScope;
}

interface UseDictionaryListReturn {
  /** Words after scope + search filtering, sorted */
  words: StudyWord[];
  /** Word count before any filtering */
  totalCount: number;
  sortField: DictionarySortField;
  sortDirection: SortDirection;
  /** Select a sort field; re-selecting the active field flips its direction */
  selectSortField: (field: DictionarySortField) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  scope: DictionaryScope;
  /**
   * Narrowed to the picker's own four. A horizon band is not something this
   * screen can switch *to* — it is the state the screen opened in, and the only
   * move out of it is back to `all`.
   */
  setScope: (scope: PickerScope) => void;
  /**
   * How many words each PICKER scope would show — lets the picker state its own
   * cost. Horizon scopes are absent on purpose: nothing renders their counts
   * (the memory sheet has them from `useMemoryHorizonDistribution`, off the same
   * words), so counting them here would be nine predicates per word for nothing.
   */
  scopeCounts: Record<PickerScope, number>;
}

export const useDictionaryList = ({
  studyWords,
  initialScope = 'all',
}: UseDictionaryListProps): UseDictionaryListReturn => {
  // A band arrives with its own ordering — see HORIZON_SCOPE_SORT. Applied here
  // rather than by calling `selectSortField` later, which flips the direction
  // when the field is already active and would land some entries on
  // strongest-first.
  const initialSort = isHorizonScope(initialScope)
    ? HORIZON_SCOPE_SORT[initialScope]
    : { field: 'difficulty' as const, direction: DEFAULT_DIRECTIONS.difficulty };

  const [sortField, setSortField] = useState<DictionarySortField>(initialSort.field);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSort.direction);
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState<DictionaryScope>(initialScope);

  const selectSortField = useCallback(
    (field: DictionarySortField) => {
      if (field === sortField) {
        setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'));
        return;
      }
      setSortField(field);
      setSortDirection(DEFAULT_DIRECTIONS[field]);
    },
    [sortField],
  );

  const scopeCounts = useMemo<Record<PickerScope, number>>(
    () => ({
      all: studyWords?.length ?? 0,
      due: studyWords?.filter(SCOPE_PREDICATES.due).length ?? 0,
      struggling: studyWords?.filter(SCOPE_PREDICATES.struggling).length ?? 0,
      mastered: studyWords?.filter(SCOPE_PREDICATES.mastered).length ?? 0,
    }),
    [studyWords],
  );

  const words = useMemo(() => {
    if (!studyWords?.length) return [];

    // Scope first, then search, then sort: the scope says what the list is, and
    // a search is a question asked inside it.
    const inScope = scope === 'all' ? studyWords : studyWords.filter(SCOPE_PREDICATES[scope]);

    const query = normalizeForSearch(searchQuery.trim());
    const visible = query
      ? inScope.filter(
          word =>
            normalizeForSearch(word.root?.meaning ?? '').includes(query) ||
            normalizeForSearch(word.root?.letters ?? '').includes(query),
        )
      : inScope;

    const direction = sortDirection === 'asc' ? 1 : -1;
    // root_id tiebreak keeps equal-valued words (e.g. all-new, no FSRS state yet)
    // in a stable order across re-sorts
    return [...visible].sort((a, b) => {
      // Words with nothing to measure sort as one block at the end, whichever way
      // the measured ones are running.
      const aUnmeasured = isUnmeasured(a, sortField);
      const bUnmeasured = isUnmeasured(b, sortField);
      if (aUnmeasured !== bUnmeasured) return aUnmeasured ? 1 : -1;

      return direction * compareWords(a, b, sortField) || a.root_id - b.root_id;
    });
  }, [studyWords, searchQuery, sortField, sortDirection, scope]);

  return {
    words,
    totalCount: studyWords?.length ?? 0,
    sortField,
    sortDirection,
    selectSortField,
    searchQuery,
    setSearchQuery,
    scope,
    setScope,
    scopeCounts,
  };
};
