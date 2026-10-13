import { PRACTICE_DUE_WORDS_LIMIT } from '@/constants/queries';
import { formatCount } from '@/utils/stringUtils';

/**
 * True when the due query clipped at its fetch limit, so the count is a floor
 * rather than a total.
 */
export function isDueCountCapped(count: number): boolean {
  return count >= PRACTICE_DUE_WORDS_LIMIT;
}

/**
 * The due count as the learner reads it: "23", or "100+" once the query clipped.
 *
 * One spelling for the tab badge and the practice screen's lead card. They read
 * the same cache entry, and each used to format it alone — the badge printed a
 * bare "100" over a card that said "100+".
 *
 * Its own module rather than a neighbour of `formatWordCount`: the limit lives
 * in `constants/queries`, which imports the services, and that file is kept
 * light for callers that only want to pluralise a noun.
 */
export function formatDueCount(count: number): string {
  return isDueCountCapped(count) ? `${formatCount(count)}+` : formatCount(count);
}
