import { STRINGS } from '@/constants/strings';

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
    : STRINGS.WORD_COUNT_OTHER.replace('{count}', String(count));
}
