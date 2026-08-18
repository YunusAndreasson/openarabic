import { FSRS_DIFFICULTY_MAX, FSRS_DIFFICULTY_MIN } from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';
import { getSortMeterColorName, getSortMeterFraction } from '@/utils/dictionaryMeter';
import { LEGACY_NULL_TIMESTAMP } from '@/__tests__/helpers/fsrsTestHelpers';

const NOW = Date.parse('2026-08-11T12:00:00Z');
const DAY = 86_400_000;

function makeWord(overrides: Partial<StudyWord> = {}): StudyWord {
  return {
    root_id: 1,
    // Practised by default: state != 0 and reps > 0, which is what
    // hasBeenPractised gates the difficulty meter on.
    fsrs_state: 2,
    fsrs_reps: 4,
    fsrs_difficulty: 5,
    fsrs_stability: 10,
    created_at: new Date(NOW - 30 * DAY).toISOString(),
    ...overrides,
  } as StudyWord;
}

describe('getSortMeterFraction', () => {
  describe('difficulty — length maps the variable directly', () => {
    it('gives the hardest word a full bar and the easiest an empty one', () => {
      // The bar is labelled "Difficulty" by the sort control above it, so the
      // most difficult word has to be the longest. An earlier version inverted
      // this to keep one column rhythm and read as plainly broken.
      const easiest = makeWord({ fsrs_difficulty: FSRS_DIFFICULTY_MIN });
      const hardest = makeWord({ fsrs_difficulty: FSRS_DIFFICULTY_MAX });
      expect(getSortMeterFraction(hardest, 'difficulty', NOW)).toBe(1);
      expect(getSortMeterFraction(easiest, 'difficulty', NOW)).toBe(0);
    });

    it('a harder word is always longer than an easier one', () => {
      const easier = getSortMeterFraction(makeWord({ fsrs_difficulty: 3 }), 'difficulty', NOW);
      const harder = getSortMeterFraction(makeWord({ fsrs_difficulty: 8 }), 'difficulty', NOW);
      expect(harder).toBeGreaterThan(easier);
    });

    it('shows nothing for a word that has never been practised', () => {
      // The placeholder difficulty is 6.5, not null — without the practised gate
      // every brand-new word would draw a confident mid-length bar describing a
      // judgement the learner was never asked to make.
      const untouched = makeWord({ fsrs_state: 0, fsrs_reps: 0, fsrs_difficulty: 6.5 });
      expect(getSortMeterFraction(untouched, 'difficulty', NOW)).toBe(0);
    });
  });

  describe('strength — the memory horizon', () => {
    it('grows with stability', () => {
      const weak = getSortMeterFraction(makeWord({ fsrs_stability: 1 }), 'strength', NOW);
      const strong = getSortMeterFraction(makeWord({ fsrs_stability: 200 }), 'strength', NOW);
      expect(strong).toBeGreaterThan(weak);
      expect(weak).toBeGreaterThan(0);
    });

    it('shows nothing for a word that has never been practised', () => {
      const untouched = makeWord({ fsrs_state: 0, fsrs_reps: 0, fsrs_stability: 0.4 });
      expect(getSortMeterFraction(untouched, 'strength', NOW)).toBe(0);
    });
  });

  describe('recent — recency, matching the label, so the newest reads longest', () => {
    it('gives a word added today a full bar', () => {
      const today = makeWord({ created_at: new Date(NOW).toISOString() });
      expect(getSortMeterFraction(today, 'recent', NOW)).toBe(1);
    });

    it('shrinks the longer a word has been in the library', () => {
      const week = getSortMeterFraction(
        makeWord({ created_at: new Date(NOW - 7 * DAY).toISOString() }),
        'recent',
        NOW,
      );
      const year = getSortMeterFraction(
        makeWord({ created_at: new Date(NOW - 365 * DAY).toISOString() }),
        'recent',
        NOW,
      );
      expect(year).toBeLessThan(week);
      expect(week).toBeLessThanOrEqual(1);
    });

    it('clamps rather than going negative for a word older than the window', () => {
      const ancient = makeWord({ created_at: new Date(NOW - 5000 * DAY).toISOString() });
      expect(getSortMeterFraction(ancient, 'recent', NOW)).toBe(0);
    });

    it('survives a missing or unparseable created_at', () => {
      expect(
        getSortMeterFraction(makeWord({ created_at: LEGACY_NULL_TIMESTAMP }), 'recent', NOW),
      ).toBe(0);
    });
  });

  it('reports a different magnitude per sort for the same word', () => {
    // The whole point of the change: one row, three readings.
    const word = makeWord({ fsrs_difficulty: 9, fsrs_stability: 200 });
    const difficulty = getSortMeterFraction(word, 'difficulty', NOW);
    const strength = getSortMeterFraction(word, 'strength', NOW);
    const recent = getSortMeterFraction(word, 'recent', NOW);
    expect(new Set([difficulty, strength, recent]).size).toBe(3);
  });

  describe('colour — where the word stands on the sorted variable', () => {
    it('paints difficulty with the same scale as the word detail screen', () => {
      expect(getSortMeterColorName(makeWord({ fsrs_difficulty: 9 }), 'difficulty')).toBe('error');
      expect(getSortMeterColorName(makeWord({ fsrs_difficulty: 2 }), 'difficulty')).toBe('success');
    });

    it('makes a hard word long AND red — magnitude and judgement agree', () => {
      const hard = makeWord({ fsrs_difficulty: 9.5 });
      expect(getSortMeterFraction(hard, 'difficulty', NOW)).toBeGreaterThan(0.9);
      expect(getSortMeterColorName(hard, 'difficulty')).toBe('error');
    });

    it('never paints a memory red — a young memory is a stage, not a fault', () => {
      // Every word passes through learning. Colouring it like an error would
      // paint an active learner's whole list as failure.
      for (const state of [0, 1, 2, 3]) {
        for (const stability of [0.4, 1, 5, 50, 300]) {
          const colorName = getSortMeterColorName(
            makeWord({ fsrs_state: state, fsrs_stability: stability }),
            'strength',
          );
          expect(colorName).not.toBe('error');
          expect(colorName).not.toBe('warning');
        }
      }
    });

    it('greens a memory only once it clears the app mastery rule', () => {
      const mastered = makeWord({ fsrs_state: 2, fsrs_stability: 50 });
      const familiar = makeWord({ fsrs_state: 2, fsrs_stability: 1 });
      expect(getSortMeterColorName(mastered, 'strength')).toBe('success');
      expect(getSortMeterColorName(familiar, 'strength')).not.toBe('success');
    });

    it('greys an untouched word rather than judging it', () => {
      const untouched = makeWord({ fsrs_state: 0, fsrs_reps: 0 });
      expect(getSortMeterColorName(untouched, 'difficulty')).toBe('textTertiary');
      expect(getSortMeterColorName(untouched, 'strength')).toBe('textTertiary');
    });

    it('leaves recency neutral, because lateness carries no verdict', () => {
      expect(getSortMeterColorName(makeWord(), 'recent')).toBe('chartAccent');
    });
  });

  it('always returns a drawable 0–1 fraction', () => {
    const hostile = makeWord({
      fsrs_difficulty: Number.NaN,
      fsrs_stability: Number.NaN,
      created_at: 'not-a-date',
    });
    for (const field of ['difficulty', 'strength', 'recent'] as const) {
      const value = getSortMeterFraction(hostile, field, NOW);
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
