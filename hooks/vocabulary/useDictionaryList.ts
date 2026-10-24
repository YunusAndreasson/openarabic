import { useCallback, useMemo, useState } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';
import { normalizeForSearch } from '@/utils/searchNormalization';
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';
import { isLeechWord } from '@/utils/leechUtils';
import { isOneOf } from '@/utils/list';
import {
  getMemoryHorizonDays,
  getWordHorizonBand,
  type HorizonBandKey,
} from '@/utils/memoryHorizon';
import { getWordDepthBand, type DepthBandKey } from '@/utils/practiceDepth';
import { hasBeenPractised, isDueWord, isMasteredWord } from '@/utils/wordClassification';

export type DictionarySortField = 'difficulty' | 'strength' | 'recent';
export type SortDirection = 'asc' | 'desc';

/** The four the scope picker offers. `all` is the resting state, not a filter. */
export const PICKER_SCOPES = ['all', 'due', 'struggling', 'mastered'] as const;

export type PickerScope = (typeof PICKER_SCOPES)[number];

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
 * The depth scopes below join the same slot on the same terms.
 */
export const HORIZON_SCOPES = [
  'horizon-days',
  'horizon-weeks',
  'horizon-months',
  'horizon-year',
  'horizon-none',
] as const;

export type HorizonScope = (typeof HORIZON_SCOPES)[number];

/**
 * The practice-depth bands, as scopes.
 *
 * Reached from the review-depth sheet exactly as the horizon scopes are reached
 * from the memory sheet, and kept out of the picker for the same reason.
 *
 * `depth-none` and `horizon-none` are near-neighbours but NOT the same set:
 * this one is `fsrs_reps === 0`, that one is "no measurable horizon", which
 * additionally catches a practised word whose stability never landed. Each row
 * points at the scope built from the predicate that produced its own count, so
 * a list can never disagree with the number that opened it — which is the whole
 * reason they are separate rather than shared.
 */
export const DEPTH_SCOPES = [
  'depth-deep',
  'depth-solid',
  'depth-few',
  'depth-once',
  'depth-none',
] as const;

export type DepthScope = (typeof DEPTH_SCOPES)[number];

/**
 * The scopes a sheet can hand this list, as opposed to the four the picker
 * offers. Grouped because every rule that applies to one applies to all of
 * them: not in the picker, arrives as a route param, and is left through the
 * sort bar's clear control rather than by being switched away from.
 */
export type NarrowScope = HorizonScope | DepthScope;

/** What the list is showing. */
export type DictionaryScope = PickerScope | NarrowScope;

/** The scope that shows one band's words — the memory sheet's row targets. */
export const HORIZON_BAND_SCOPES: Record<HorizonBandKey, HorizonScope> = {
  days: 'horizon-days',
  weeks: 'horizon-weeks',
  months: 'horizon-months',
  year: 'horizon-year',
};

/** The review-depth sheet's row targets. */
export const DEPTH_BAND_SCOPES: Record<DepthBandKey, DepthScope> = {
  deep: 'depth-deep',
  solid: 'depth-solid',
  few: 'depth-few',
  once: 'depth-once',
  none: 'depth-none',
};

/**
 * Takes a bare `string` so a route param can be validated without a cast.
 *
 * NARROW specifically: this is what decides whether a scope carries its own
 * opening sort (`NARROW_SCOPE_SORT` is total over these and nothing else) and
 * whether the picker shows a selection. It is NOT the test for "may a route ask
 * for this scope" — see `isDictionaryScope`.
 */
export function isNarrowScope(scope: string): scope is NarrowScope {
  return isOneOf(HORIZON_SCOPES, scope) || isOneOf(DEPTH_SCOPES, scope);
}

/**
 * Every scope the list can actually apply, narrow or picker.
 *
 * The route-param test, and deliberately wider than `isNarrowScope`. The
 * dictionary used to validate its `scope` param with that one, which was right
 * while the only deep links were the horizon and depth bands — and silently
 * wrong the moment the "Words to revisit" sheet started handing over
 * `struggling`: a legal scope with a working predicate, rejected by the
 * validator and quietly replaced with the whole vocabulary. The failure has no
 * symptom at the call site, which is why the test that only asserted the
 * navigation arguments passed while the feature was broken.
 *
 * A picker scope arriving this way needs nothing else: `SCOPE_PREDICATES`,
 * `SCOPE_LABELS` and the picker's own `selectedValue` are all total over it, and
 * it correctly opens under the default hardest-first sort rather than a band's.
 */
export function isDictionaryScope(scope: string): scope is DictionaryScope {
  return isOneOf(PICKER_SCOPES, scope) || isNarrowScope(scope);
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
  due: isDueWord,
  struggling: isLeechWord,
  mastered: isMasteredWord,
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
  // Through `getWordDepthBand` for the same reason: the sheet's counts and
  // these lists then come from one definition of a band, not two.
  'depth-deep': word => getWordDepthBand(word) === 'deep',
  'depth-solid': word => getWordDepthBand(word) === 'solid',
  'depth-few': word => getWordDepthBand(word) === 'few',
  'depth-once': word => getWordDepthBand(word) === 'once',
  'depth-none': word => getWordDepthBand(word) === 'none',
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
const NARROW_SCOPE_SORT: Record<
  NarrowScope,
  { field: DictionarySortField; direction: SortDirection }
> = {
  'horizon-days': { field: 'strength', direction: 'asc' },
  'horizon-weeks': { field: 'strength', direction: 'asc' },
  'horizon-months': { field: 'strength', direction: 'asc' },
  'horizon-year': { field: 'strength', direction: 'asc' },
  'horizon-none': { field: 'recent', direction: 'desc' },
  // Weakest first inside a depth band answers the question that makes the band
  // worth opening: of the words you have drilled this often, which are still
  // not holding?
  'depth-deep': { field: 'strength', direction: 'asc' },
  'depth-solid': { field: 'strength', direction: 'asc' },
  'depth-few': { field: 'strength', direction: 'asc' },
  'depth-once': { field: 'strength', direction: 'asc' },
  // Same exception as `horizon-none`, and the same reason: nothing here has a
  // measured stability to rank by, so they are ordered by when they were saved.
  'depth-none': { field: 'recent', direction: 'desc' },
};

/**
 * A word with no review behind it has no difficulty and no memory to compare.
 *
 * Ranking it anyway put the same word at opposite ends of the list depending on
 * the sort: a never-practised word is written with a *placeholder* difficulty
 * and stability (`PLACEHOLDER_FSRS`, see `createInitialFSRSEntry`), so it landed
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

function sortValue(word: StudyWord, field: DictionarySortField): number {
  switch (field) {
    case 'difficulty':
      return word.fsrs_difficulty ?? 0;
    case 'strength':
      return word.fsrs_stability ?? 0;
    case 'recent':
      return parseSupabaseTimestamp(word.created_at)?.getTime() ?? 0;
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
   * cost. The narrow scopes are absent on purpose: nothing renders their counts
   * (each sheet already has them, from `useMemoryHorizonDistribution` and
   * `useReviewDepthDistribution` off the same words), so counting them here
   * would be ten more predicates per word for nothing.
   */
  scopeCounts: Record<PickerScope, number>;
}

export const useDictionaryList = ({
  studyWords,
  initialScope = 'all',
}: UseDictionaryListProps): UseDictionaryListReturn => {
  // A band arrives with its own ordering — see NARROW_SCOPE_SORT. Applied here
  // rather than by calling `selectSortField` later, which flips the direction
  // when the field is already active and would land some entries on
  // strongest-first.
  const initialSort = isNarrowScope(initialScope)
    ? NARROW_SCOPE_SORT[initialScope]
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

  // Sorting is independent of scope and search. Prepare it only when data or
  // ordering changes, and parse each timestamp once rather than per comparison.
  const sortedWords = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return studyWords
      .map(word => ({
        word,
        value: sortValue(word, sortField),
        unmeasured: isUnmeasured(word, sortField),
      }))
      .sort((a, b) => {
        if (a.unmeasured !== b.unmeasured) return a.unmeasured ? 1 : -1;
        return direction * (a.value - b.value) || a.word.root_id - b.word.root_id;
      })
      .map(entry => entry.word);
  }, [studyWords, sortField, sortDirection]);

  const query = normalizeForSearch(searchQuery.trim());
  const hasSearch = query.length > 0;
  // Allocate the search index only while searching. Separate fields preserve
  // substring semantics; a query must not match across meaning/Arabic boundaries.
  const searchIndex = useMemo(
    () =>
      hasSearch
        ? new Map(
            studyWords.map(word => [
              word,
              {
                meaning: normalizeForSearch(word.root?.meaning ?? ''),
                letters: normalizeForSearch(word.root?.letters ?? ''),
              },
            ]),
          )
        : null,
    [studyWords, hasSearch],
  );

  const words = useMemo(() => {
    // Keep time-sensitive scope predicates on the filtering path: typing can
    // reveal a word that became due since the vocabulary cache last changed.
    const inScope = scope === 'all' ? sortedWords : sortedWords.filter(SCOPE_PREDICATES[scope]);
    if (!query || !searchIndex) return inScope;
    return inScope.filter(word => {
      const text = searchIndex.get(word);
      return text?.meaning.includes(query) || text?.letters.includes(query);
    });
  }, [sortedWords, query, searchIndex, scope]);

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
