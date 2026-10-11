import { STRINGS } from '@/constants/strings';
import { formatCount } from '@/utils/stringUtils';

/**
 * "1 word" / "{n} words".
 *
 * Lives here rather than beside its first caller (the dictionary's sort bar):
 * it is four lines of pluralisation with no UI in it, and it now has callers in
 * three different component families. Importing it out of a component module
 * dragged a `SegmentedControl`, an icon set and the haptics util into the graph
 * of anything that wanted to print a count.
 *
 * Use it rather than concatenating a number onto a fixed noun — the practice
 * tab said "1 words reviewed today" to every learner on their first day.
 */
export function formatWordCount(count: number): string {
  return count === 1
    ? STRINGS.WORD_COUNT_ONE
    : STRINGS.WORD_COUNT_OTHER.replace('{count}', formatCount(count));
}

/** "1 text" / "{n} texts" — the same rule, for the library's unit. */
export function formatTextCount(count: number): string {
  return count === 1
    ? STRINGS.SEARCH_TEXTS_RESULT_COUNT_ONE
    : STRINGS.SEARCH_TEXTS_RESULT_COUNT_OTHER.replace('{count}', formatCount(count));
}
