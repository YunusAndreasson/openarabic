import { normalizeForSearch } from '@/utils/searchNormalization';

export const DICTIONARY_QUERY_MAX_LENGTH = 60;
const MIN_DICTIONARY_QUERY_LENGTH = 2;
const ARABIC_LETTER = /^[ء-غف-ي]$/;
const ARABIC_MARKS = '[ؐ-ًؚ-ٰٟۖ-ۭـ]*';
const ARABIC_VARIANTS: Record<string, string> = {
  ا: '[اأإآٱ]',
  ي: '[يىی]',
  ك: '[كک]',
  ه: '[هةہھ]',
};

export function dictionarySearchTerm(input: string): string {
  const term = normalizeForSearch(input.slice(0, DICTIONARY_QUERY_MAX_LENGTH));
  return term.length >= MIN_DICTIONARY_QUERY_LENGTH ? term : '';
}

/** PostgreSQL regex for vocalized headwords. Input can contribute Arabic letters and spaces only. */
export function arabicHeadwordPattern(term: string): string | undefined {
  const letters = Array.from(term);
  if (!letters.every(letter => ARABIC_LETTER.test(letter) || letter === ' ')) return undefined;
  return letters.map(letter => ARABIC_VARIANTS[letter] ?? letter).join(ARABIC_MARKS);
}

export function rankDictionaryEntries<T extends { letters: string; meaning: string }>(
  entries: readonly T[],
  term: string,
): T[] {
  const rank = (entry: T) => {
    const letters = normalizeForSearch(entry.letters);
    const meaning = normalizeForSearch(entry.meaning);
    if (letters === term || meaning === term) return 0;
    if (letters.startsWith(term) || meaning.startsWith(term)) return 1;
    return 2;
  };
  return entries
    .map(entry => ({ entry, rank: rank(entry) }))
    .sort((left, right) => left.rank - right.rank)
    .map(({ entry }) => entry);
}
