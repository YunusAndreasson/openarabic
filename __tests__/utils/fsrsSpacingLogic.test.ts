/**
 * Unit tests for FSRS spacing logic
 * Tests the core spacing algorithm without React hooks complexity
 */

import { PriorityQueue } from '../../utils/priorityQueue';
import type { StudyWord } from '../../types/vocabulary.types';

// Test data factory
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
    root: {
      id: 1,
      letters: 'كتاب',
      meaning: 'book',
      audio_url: null,
      audio_url_en: null,
    },
    ...overrides,
  } as StudyWord;
};

// Simulate the spacing logic from useFSRS
class SpacingSimulator {
  private queue: PriorityQueue<StudyWord>;
  private recentWords: number[] = [];
  private spacedWords: Array<{ word: StudyWord; remainingSpacing: number }> = [];
  private readonly MIN_WORD_SPACING = 3;

  constructor(words: StudyWord[]) {
    this.queue = new PriorityQueue<StudyWord>();
    words.forEach(word => {
      const priority = this.calculateWordPriority(word);
      this.queue.push(word, priority);
    });
  }

  private calculateWordPriority(word: StudyWord): number {
    const now = new Date();
    const dueDate = word.fsrs_due ? new Date(word.fsrs_due) : now;
    const hoursOverdue = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60);
    const stability = word.fsrs_stability ?? 1;
    const stabilityFactor = Math.max(0, 10 - stability) * 0.1;
    const difficulty = word.fsrs_difficulty ?? 6.5;
    const difficultyFactor = (difficulty - 5) * 0.01;
    return -hoursOverdue + stabilityFactor + difficultyFactor;
  }

  getNextWordWithSpacing(): StudyWord | null {
    // Check if any spaced words are ready
    const readySpacedWords = this.spacedWords.filter(item => item.remainingSpacing <= 0);

    if (readySpacedWords.length > 0) {
      // Remove ready words from spacing queue and add them back to main queue
      this.spacedWords = this.spacedWords.filter(item => item.remainingSpacing > 0);

      // Add ready words back to main queue
      readySpacedWords.forEach(item => {
        const priority = this.calculateWordPriority(item.word);
        this.queue.push(item.word, priority);
      });
    }

    // Get next word from main queue
    let nextWord = this.queue.pop();
    let checkedWords: StudyWord[] = [];

    // Ensure the word doesn't violate spacing rules
    while (nextWord && this.recentWords.includes(nextWord.root_id)) {
      // This word was recently processed, put it in spacing queue
      this.spacedWords.push({
        word: nextWord,
        remainingSpacing: this.MIN_WORD_SPACING,
      });
      checkedWords.push(nextWord);
      nextWord = this.queue.pop();

      // Prevent infinite loop
      if (checkedWords.length > 20 || this.queue.size() === 0) {
        break;
      }
    }

    return nextWord || null;
  }

  processWord(wordId: number, requeue: boolean = false): void {
    // Add processed word to recent words
    this.recentWords.push(wordId);

    // Keep only the last MIN_WORD_SPACING words in recent list
    if (this.recentWords.length > this.MIN_WORD_SPACING) {
      this.recentWords.shift();
    }

    // Decrease spacing counter for all spaced words
    this.spacedWords.forEach(item => {
      item.remainingSpacing -= 1;
    });

    // If requeuing, add the word back to spacing queue
    if (requeue) {
      const word = createTestWord({ root_id: wordId });
      this.spacedWords.push({
        word,
        remainingSpacing: this.MIN_WORD_SPACING,
      });
    }
  }

  getQueueState() {
    return {
      mainQueueSize: this.queue.size(),
      spacedWordsCount: this.spacedWords.length,
      recentWords: [...this.recentWords],
      spacedWords: this.spacedWords.map(item => ({
        id: item.word.root_id,
        remainingSpacing: item.remainingSpacing,
      })),
    };
  }
}

describe('FSRS Spacing Logic Unit Tests', () => {
  test('basic spacing logic prevents immediate requeuing', () => {
    const words = [
      createTestWord({ root_id: 1, fsrs_due: new Date(Date.now() - 5 * 3600000).toISOString() }),
      createTestWord({ root_id: 2, fsrs_due: new Date(Date.now() - 4 * 3600000).toISOString() }),
      createTestWord({ root_id: 3, fsrs_due: new Date(Date.now() - 3 * 3600000).toISOString() }),
      createTestWord({ root_id: 4, fsrs_due: new Date(Date.now() - 2 * 3600000).toISOString() }),
      createTestWord({ root_id: 5, fsrs_due: new Date(Date.now() - 1 * 3600000).toISOString() }),
    ];

    const simulator = new SpacingSimulator(words);

    // First word should be most overdue (word 1)
    const firstWord = simulator.getNextWordWithSpacing();
    expect(firstWord?.root_id).toBe(1);

    // Process first word and requeue it
    simulator.processWord(1, true);

    // Process next 3 words and track sequence
    const processedSequence: number[] = [];
    for (let i = 0; i < 4; i++) {
      const nextWord = simulator.getNextWordWithSpacing();
      if (nextWord) {
        processedSequence.push(nextWord.root_id);
        simulator.processWord(nextWord.root_id, false);
      }
    }

    console.log('Processed sequence after requeuing word 1:', processedSequence);
    console.log('Queue state:', simulator.getQueueState());

    // Word 1 should NOT appear in the first 3 positions after requeuing
    const word1Index = processedSequence.indexOf(1);
    if (word1Index !== -1) {
      expect(word1Index).toBeGreaterThanOrEqual(3);
    }

    // The first 3 words should not include word 1
    expect(processedSequence.slice(0, 3)).not.toContain(1);
  });

  test('multiple requeued words maintain proper spacing', () => {
    const words = Array.from({ length: 8 }, (_, i) =>
      createTestWord({
        root_id: i + 1,
        fsrs_due: new Date(Date.now() - (8 - i) * 3600000).toISOString(),
      })
    );

    const simulator = new SpacingSimulator(words);

    // Requeue first 2 words
    const requeuedWords: number[] = [];
    for (let i = 0; i < 2; i++) {
      const word = simulator.getNextWordWithSpacing();
      if (word) {
        requeuedWords.push(word.root_id);
        simulator.processWord(word.root_id, true);
      }
    }

    // Process next several words and track sequence
    const processedSequence: number[] = [];
    for (let i = 0; i < 6; i++) {
      const nextWord = simulator.getNextWordWithSpacing();
      if (nextWord) {
        processedSequence.push(nextWord.root_id);
        simulator.processWord(nextWord.root_id, false);
      }
    }

    console.log('Requeued words:', requeuedWords);
    console.log('Processed sequence:', processedSequence);
    console.log('Final queue state:', simulator.getQueueState());

    // Each requeued word should not appear in the first 3 positions
    for (const requeuedId of requeuedWords) {
      const index = processedSequence.indexOf(requeuedId);
      if (index !== -1) {
        expect(index).toBeGreaterThanOrEqual(3);
      }
    }
  });

  test('spacing queue handles edge cases correctly', () => {
    // Test with only 2 words (less than MIN_WORD_SPACING)
    const words = [createTestWord({ root_id: 1 }), createTestWord({ root_id: 2 })];

    const simulator = new SpacingSimulator(words);

    // Process first word and requeue it
    const firstWord = simulator.getNextWordWithSpacing();
    expect(firstWord?.root_id).toBe(1);
    simulator.processWord(1, true);

    // Process second word
    const secondWord = simulator.getNextWordWithSpacing();
    expect(secondWord?.root_id).toBe(2);
    simulator.processWord(2, false);

    // Now there should be no more words available immediately
    // (word 1 is in spacing queue)
    const thirdWord = simulator.getNextWordWithSpacing();
    expect(thirdWord).toBeNull();

    console.log('Edge case queue state:', simulator.getQueueState());
  });
});
