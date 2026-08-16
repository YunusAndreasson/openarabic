/**
 * The review header's bar has to be readable during the session it describes.
 *
 * It used to divide finished words by the entire due backlog, which is honest
 * and useless: measured on a 1,493-word account, ten correct answers in a row
 * moved the fill six pixels out of six hundred and twenty-seven. These lock in
 * the sitting-sized denominator that replaced it, and the two properties the
 * surrounding code depends on — never above 100, never going down.
 */

import { REVIEW_SESSION_CHUNK_SIZE } from '@/constants/fsrs';
import { getSessionProgress } from '@/utils/review/sessionProgress';

const BACKLOG = 1493;

describe('getSessionProgress', () => {
  test('a large backlog is measured against one sitting, not the backlog', () => {
    // The regression itself: under the old denominator this rounded to 1%.
    expect(getSessionProgress(10, BACKLOG)).toBe(50);
    expect(getSessionProgress(1, BACKLOG)).toBe(5);
  });

  test('a day with fewer words due than a sitting is measured against the day', () => {
    expect(getSessionProgress(0, 4)).toBe(0);
    expect(getSessionProgress(2, 4)).toBe(50);
    // The bar fills exactly as the last word lands, rather than at some fraction
    // of a chunk the learner was never given.
    expect(getSessionProgress(4, 4)).toBe(100);
  });

  test('holds at full once the sitting is behind you', () => {
    expect(getSessionProgress(REVIEW_SESSION_CHUNK_SIZE, BACKLOG)).toBe(100);
    expect(getSessionProgress(REVIEW_SESSION_CHUNK_SIZE + 40, BACKLOG)).toBe(100);
  });

  test('never reports progress before there is a session', () => {
    expect(getSessionProgress(0, 0)).toBe(0);
    expect(getSessionProgress(5, 0)).toBe(0);
  });

  /**
   * `useReview` ratchets this to a high-water mark, so a value that dipped would
   * stick at its peak and stop reporting for the rest of the session. Monotonic
   * is not a nicety here — it is what keeps the bar alive.
   */
  test('never decreases as words finish', () => {
    let previous = -1;
    for (let finished = 0; finished <= 60; finished += 1) {
      const current = getSessionProgress(finished, BACKLOG);
      expect(current).toBeGreaterThanOrEqual(previous);
      expect(current).toBeLessThanOrEqual(100);
      previous = current;
    }
  });
});
