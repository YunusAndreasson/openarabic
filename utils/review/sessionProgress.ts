import { REVIEW_SESSION_CHUNK_SIZE } from '@/constants/fsrs';

/**
 * How full the review header's bar is, as a percentage.
 *
 * **The bar measures a sitting, not the backlog.** `totalWords` stays the whole
 * due list everywhere else in the session — it is what "everything is done" is
 * decided on, and scoping *that* to the chunk is a bug the session queue's own
 * comments describe. This is only the number the header draws, which nothing
 * else reads.
 *
 * Over a backlog of hundreds, `finished / total` is unreadable: measured on a
 * 1,493-word account, ten correct answers in a row moved the fill six pixels out
 * of six hundred and twenty-seven. A learner cannot clear a backlog that size in
 * one sitting, so the reachable unit is the same chunk the working set is built
 * from. On a small day, when fewer words are due than a chunk, the target is the
 * whole session and the bar fills exactly as the last word lands.
 *
 * Capped at the sitting rather than re-based each lap because `useReview`
 * ratchets this value to its own high-water mark: anything that dipped would
 * stick at the peak and stop reporting altogether. Past the sitting the bar sits
 * full and the header's "N done" counter carries the session on.
 *
 * @param finishedWords Words drilled to criterion (or capped out). Words still
 *   circulating in the spacing queue must not count — a word you are still being
 *   re-asked is not behind you.
 * @param totalWords The whole due list for the session.
 */
export function getSessionProgress(finishedWords: number, totalWords: number): number {
  const target = Math.min(totalWords, REVIEW_SESSION_CHUNK_SIZE);
  if (target <= 0) return 0;
  return Math.min(Math.round((finishedWords / target) * 100), 100);
}
