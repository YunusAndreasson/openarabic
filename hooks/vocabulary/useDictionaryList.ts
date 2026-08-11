import { useCallback, useMemo, useState } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';
import { isLeechWord } from '@/utils/leechUtils';
import { hasBeenPractised, isDueWord, isMasteredWord } from '@/utils/wordClassification';

export type DictionarySortField = 'difficulty' | 'strength' | 'recent';
export type SortDirection = 'asc' | 'desc';

/** What the list is showing. `all` is the resting state, not a filter. */
export type DictionaryScope = 'all' | 'due' | 'struggling' | 'mastered';

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
  setScope: (scope: DictionaryScope) => void;
  /** How many words each scope would show — lets the picker state its own cost */
  scopeCounts: Record<DictionaryScope, number>;
}

export const useDictionaryList = ({
  studyWords,
}: UseDictionaryListProps): UseDictionaryListReturn => {
  const [sortField, setSortField] = useState<DictionarySortField>('difficulty');
  const [sortDirection, setSortDirection] = useState<SortDirection>(DEFAULT_DIRECTIONS.difficulty);
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState<DictionaryScope>('all');

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

  const scopeCounts = useMemo<Record<DictionaryScope, number>>(
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
