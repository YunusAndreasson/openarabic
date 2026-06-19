import { Rating } from 'ts-fsrs';

import { CONFIDENCE_TO_RATING, MISS_CONFIDENCE, RECALLED_CONFIDENCE } from '@/constants/fsrs';
import type { WordConfidence } from '@/types/review.types';

/**
 * Source-of-truth lock for the three-way self-grade mapping. If any of these
 * change, the drill / metrics / scheduling behaviour changes with them — so the
 * mapping is asserted explicitly here rather than implicitly across suites.
 */
describe('review grade → FSRS rating mapping', () => {
  it('maps Forgot / Guessed / Knew it to Again / Hard / Good', () => {
    expect(CONFIDENCE_TO_RATING).toEqual({
      unknown: Rating.Again,
      vague: Rating.Hard,
      known: Rating.Good,
    });
  });

  it('treats only Forgot (unknown) as a within-session miss', () => {
    expect(MISS_CONFIDENCE.has('unknown')).toBe(true);
    expect(MISS_CONFIDENCE.has('vague')).toBe(false);
    expect(MISS_CONFIDENCE.has('known')).toBe(false);
  });

  it('counts Guessed (vague) and Knew it (known) as recalls', () => {
    expect(RECALLED_CONFIDENCE.has('vague')).toBe(true);
    expect(RECALLED_CONFIDENCE.has('known')).toBe(true);
    expect(RECALLED_CONFIDENCE.has('unknown')).toBe(false);
  });

  it('partitions every confidence into exactly miss XOR recalled', () => {
    const all: WordConfidence[] = ['known', 'vague', 'unknown'];
    for (const c of all) {
      expect(MISS_CONFIDENCE.has(c) !== RECALLED_CONFIDENCE.has(c)).toBe(true);
    }
  });
});
