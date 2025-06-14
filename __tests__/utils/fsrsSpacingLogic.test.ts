import { PriorityQueue } from '../../utils/priorityQueue';
import {
  calculateWordPriority,
  getNextWordWithSpacing,
  updateSpacingCounters,
  createSpacingState,
  MIN_WORD_SPACING,
} from '../../utils/fsrsSpacing';
import type { StudyWord } from '../../types/vocabulary.types';

const createTestWord = (overrides: Partial<StudyWord> = {}): StudyWord => {
  const now = Date.now();
  return {
    root_id: 1,
    user_id: 'test-user',
    created_at: new Date(now).toISOString(),
    fsrs_due: new Date(now).toISOString(),
    fsrs_stability: 5,
    fsrs_difficulty: 6.5,
    fsrs_elapsed_days: 0,
    fsrs_scheduled_days: 1,
    fsrs_learning_steps: 0,
    fsrs_reps: 0,
    fsrs_lapses: 0,
    fsrs_state: 0,
    fsrs_last_review: null,
    difficulty: 0.65,
    success_streak: 0,
    root: { id: 1, letters: 'كتاب', meaning: 'book', audio_url: null, audio_url_en: null },
    ...overrides,
  } as StudyWord;
};

describe('FSRS Spacing Logic', () => {
  const setupQueue = (words: StudyWord[]) => {
    const queue = new PriorityQueue<StudyWord>();
    words.forEach(w => queue.push(w, calculateWordPriority(w)));
    return queue;
  };

  test('basic spacing logic prevents immediate requeuing', () => {
    const words = [
      createTestWord({ root_id: 1, fsrs_due: new Date(Date.now() - 5 * 3600000).toISOString() }),
      createTestWord({ root_id: 2, fsrs_due: new Date(Date.now() - 4 * 3600000).toISOString() }),
      createTestWord({ root_id: 3, fsrs_due: new Date(Date.now() - 3 * 3600000).toISOString() }),
      createTestWord({ root_id: 4, fsrs_due: new Date(Date.now() - 2 * 3600000).toISOString() }),
      createTestWord({ root_id: 5, fsrs_due: new Date(Date.now() - 1 * 3600000).toISOString() }),
    ];

    const queue = setupQueue(words);
    const spacing = createSpacingState();

    const first = getNextWordWithSpacing(queue, spacing);
    expect(first?.root_id).toBe(1);
    updateSpacingCounters(spacing, 1);
    spacing.spacedWords.push({ word: words[0], remainingSpacing: MIN_WORD_SPACING });

    const processed: number[] = [];
    for (let i = 0; i < 4; i++) {
      const next = getNextWordWithSpacing(queue, spacing);
      if (next) {
        processed.push(next.root_id);
        updateSpacingCounters(spacing, next.root_id);
      }
    }

    const index = processed.indexOf(1);
    if (index !== -1) {
      expect(index).toBeGreaterThanOrEqual(MIN_WORD_SPACING);
    }
    expect(processed.slice(0, MIN_WORD_SPACING)).not.toContain(1);
  });

  test('multiple requeued words maintain proper spacing', () => {
    const words = Array.from({ length: 8 }, (_, i) =>
      createTestWord({ root_id: i + 1, fsrs_due: new Date(Date.now() - (8 - i) * 3600000).toISOString() })
    );
    const queue = setupQueue(words);
    const spacing = createSpacingState();

    const requeued: StudyWord[] = [];
    for (let i = 0; i < 2; i++) {
      const w = getNextWordWithSpacing(queue, spacing);
      if (w) {
        requeued.push(w);
        updateSpacingCounters(spacing, w.root_id);
        spacing.spacedWords.push({ word: w, remainingSpacing: MIN_WORD_SPACING });
      }
    }

    const processed: number[] = [];
    for (let i = 0; i < 6; i++) {
      const n = getNextWordWithSpacing(queue, spacing);
      if (n) {
        processed.push(n.root_id);
        updateSpacingCounters(spacing, n.root_id);
      }
    }

    for (const w of requeued) {
      const idx = processed.indexOf(w.root_id);
      if (idx !== -1) {
        expect(idx).toBeGreaterThanOrEqual(MIN_WORD_SPACING - 1);
      }
    }
  });

  test('spacing queue handles edge cases correctly', () => {
    const words = [createTestWord({ root_id: 1 }), createTestWord({ root_id: 2 })];
    const queue = setupQueue(words);
    const spacing = createSpacingState();

    const first = getNextWordWithSpacing(queue, spacing);
    expect(first?.root_id).toBe(1);
    updateSpacingCounters(spacing, 1);
    spacing.spacedWords.push({ word: words[0], remainingSpacing: MIN_WORD_SPACING });

    const second = getNextWordWithSpacing(queue, spacing);
    expect(second?.root_id).toBe(2);
    updateSpacingCounters(spacing, 2);

    const third = getNextWordWithSpacing(queue, spacing);
    expect(third).toBeNull();
  });
});
