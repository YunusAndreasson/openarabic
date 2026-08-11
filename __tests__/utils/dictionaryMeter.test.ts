import { FSRS_DIFFICULTY_MAX, FSRS_DIFFICULTY_MIN } from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';
import { getSortMeterFraction } from '@/utils/dictionaryMeter';

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
  describe('difficulty — inverted, so a hard word reads short', () => {
    it('gives the easiest word a full bar and the hardest an empty one', () => {
      const easiest = makeWord({ fsrs_difficulty: FSRS_DIFFICULTY_MIN });
      const hardest = makeWord({ fsrs_difficulty: FSRS_DIFFICULTY_MAX });
      expect(getSortMeterFraction(easiest, 'difficulty', NOW)).toBe(1);
      expect(getSortMeterFraction(hardest, 'difficulty', NOW)).toBe(0);
    });

    it('a harder word is always shorter than an easier one', () => {
      const easier = getSortMeterFraction(makeWord({ fsrs_difficulty: 3 }), 'difficulty', NOW);
      const harder = getSortMeterFraction(makeWord({ fsrs_difficulty: 8 }), 'difficulty', NOW);
      expect(harder).toBeLessThan(easier);
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

  describe('recent — age, so a newly added word starts empty', () => {
    it('gives a word added today an empty bar', () => {
      const today = makeWord({ created_at: new Date(NOW).toISOString() });
      expect(getSortMeterFraction(today, 'recent', NOW)).toBe(0);
    });

    it('grows the longer a word has been in the library', () => {
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
      expect(year).toBeGreaterThan(week);
      expect(year).toBeLessThanOrEqual(1);
    });

    it('clamps rather than overflowing for a word older than the window', () => {
      const ancient = makeWord({ created_at: new Date(NOW - 5000 * DAY).toISOString() });
      expect(getSortMeterFraction(ancient, 'recent', NOW)).toBe(1);
    });

    it('survives a missing or unparseable created_at', () => {
      expect(getSortMeterFraction(makeWord({ created_at: null }), 'recent', NOW)).toBe(0);
    });
  });

  it('reports a different magnitude per sort for the same word', () => {
    // The whole point of the change: one row, three readings.
    const word = makeWord({ fsrs_difficulty: 9, fsrs_stability: 200 });
    const difficulty = getSortMeterFraction(word, 'difficulty', NOW);
    const strength = getSortMeterFraction(word, 'strength', NOW);
    const recent = getSortMeterFraction(word, 'recent', NOW);
    expect(new Set([difficulty, strength, recent]).size).toBe(3);
    // Hard but well-remembered: short under difficulty, long under strength.
    expect(difficulty).toBeLessThan(strength);
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
