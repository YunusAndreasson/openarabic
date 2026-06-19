import { State } from 'ts-fsrs';

import { LEECH_LIST_LIMIT, LEECH_MIN_LAPSES } from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';

interface RankStrugglingWordsOptions {
  /** Minimum lapses for a word to qualify (default: LEECH_MIN_LAPSES). */
  minLapses?: number;
  /** Maximum number of words to return (default: LEECH_LIST_LIMIT). */
  limit?: number;
}

/**
 * Rank a learner's "leeches" — studied words they keep forgetting — from the
 * current FSRS state on each study word. Ported from edenmind's
 * `rankStrugglingCards`.
 *
 * `fsrs_lapses` is the honest signal: ts-fsrs only counts a lapse when an
 * already-graduated Review card is answered Unknown, so this is a real "these
 * keep tripping you up" list, not a guess. FSRS `difficulty` is the tiebreak.
 * Never-studied words (New / `fsrs_reps === 0`) can't be leeches and are excluded.
 *
 * Pure and side-effect free so it can be unit-tested and reused on both the
 * dedicated screen and the practice-home count.
 */
export function rankStrugglingWords(
  words: readonly StudyWord[],
  opts: RankStrugglingWordsOptions = {},
): StudyWord[] {
  const minLapses = opts.minLapses ?? LEECH_MIN_LAPSES;
  const limit = opts.limit ?? LEECH_LIST_LIMIT;

  return words
    .filter(
      word =>
        word.fsrs_state !== State.New &&
        (word.fsrs_reps ?? 0) > 0 &&
        (word.fsrs_lapses ?? 0) >= minLapses,
    )
    .sort(
      (a, b) =>
        (b.fsrs_lapses ?? 0) - (a.fsrs_lapses ?? 0) ||
        (b.fsrs_difficulty ?? 0) - (a.fsrs_difficulty ?? 0),
    )
    .slice(0, limit);
}
