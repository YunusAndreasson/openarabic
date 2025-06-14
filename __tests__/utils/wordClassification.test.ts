import { isStrugglingWord, getStrugglingWordsCount } from '../../utils/wordClassification';
import type { StudyWord } from '../../types/vocabulary.types';

const baseWord = (overrides: Partial<StudyWord> = {}): StudyWord => ({
  root_id: 1,
  user_id: 'u1',
  created_at: '2024-01-01',
  fsrs_due: null,
  fsrs_stability: 8,
  fsrs_difficulty: 6.5,
  fsrs_elapsed_days: 0,
  fsrs_scheduled_days: 0,
  fsrs_learning_steps: 0,
  fsrs_reps: 0,
  fsrs_lapses: 0,
  fsrs_state: 0,
  fsrs_last_review: null,
  ...overrides,
});

describe('isStrugglingWord', () => {
  it('detects high difficulty words with lapses', () => {
    const word = baseWord({ fsrs_difficulty: 8.5, fsrs_lapses: 1 });
    expect(isStrugglingWord(word)).toBe(true);
  });

  it('detects words struggling in learning state', () => {
    const word = baseWord({ fsrs_state: 1, fsrs_lapses: 2, fsrs_stability: 8, fsrs_difficulty: 6.5 });
    expect(isStrugglingWord(word)).toBe(true);
  });

  it('detects unstable and difficult words', () => {
    const word = baseWord({ fsrs_stability: 6, fsrs_difficulty: 7.5, fsrs_lapses: 1 });
    expect(isStrugglingWord(word)).toBe(true);
  });

  it('returns false when word is not struggling', () => {
    const word = baseWord({ fsrs_difficulty: 6, fsrs_lapses: 0, fsrs_stability: 8, fsrs_state: 0 });
    expect(isStrugglingWord(word)).toBe(false);
  });
});

describe('getStrugglingWordsCount', () => {
  it('counts struggling words in an array', () => {
    const words = [
      baseWord({ fsrs_difficulty: 8.2, fsrs_lapses: 1 }), // struggling
      baseWord({ fsrs_state: 1, fsrs_lapses: 2 }), // struggling
      baseWord({ fsrs_difficulty: 6 }), // not struggling
    ];
    expect(getStrugglingWordsCount(words)).toBe(2);
  });

  it('returns 0 for empty input', () => {
    expect(getStrugglingWordsCount([])).toBe(0);
  });
});
