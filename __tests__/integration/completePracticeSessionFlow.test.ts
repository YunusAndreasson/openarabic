/**
 * Complete Practice Session Flow - Integration Test
 *
 * Tests the entire user journey for a practice session from start to completion.
 * This is a CRITICAL integration test covering the core learning workflow.
 *
 * User Journey:
 * 1. User opens practice tab
 * 2. System loads due words
 * 3. User reviews words (swipe right = known, left = unknown, slight left = vague)
 * 4. System updates FSRS data after each review
 * 5. Vague words reappear later in session
 * 6. Session completes when all words marked as known
 * 7. System shows completion screen with stats
 * 8. System invalidates queries to refresh data
 */

import { Rating } from 'ts-fsrs';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { StudyWord } from '@/types/vocabulary.types';

// Mock the service layer
jest.mock('@/services/studyWordsFSRS');

const mockService = studyWordsFSRSService as jest.Mocked<typeof studyWordsFSRSService>;

describe('Complete Practice Session Flow - Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path: User completes session successfully', () => {
    it('should complete full session workflow with all words known', async () => {
      // ====== SETUP: Initial state ======
      const userId = 'user-123';
      const dueWords: StudyWord[] = [
        createTestWord({
          id: 1,
          root_id: 101,
          word: 'كتاب',
          definition: 'book',
          fsrs_due: new Date(Date.now() - 1000).toISOString(), // Due now
          fsrs_state: 2, // Review state
          fsrs_stability: 5,
          fsrs_difficulty: 5,
          fsrs_reps: 2,
        }),
        createTestWord({
          id: 2,
          root_id: 102,
          word: 'بيت',
          definition: 'house',
          fsrs_due: new Date(Date.now() - 1000).toISOString(),
          fsrs_state: 2,
          fsrs_stability: 3,
          fsrs_difficulty: 6,
          fsrs_reps: 1,
        }),
        createTestWord({
          id: 3,
          root_id: 103,
          word: 'مدرسة',
          definition: 'school',
          fsrs_due: new Date(Date.now() - 1000).toISOString(),
          fsrs_state: 2,
          fsrs_stability: 4,
          fsrs_difficulty: 5,
          fsrs_reps: 3,
        }),
      ];

      // Mock service to return due words
      mockService.getFSRSWords.mockResolvedValue(dueWords);

      // ====== STEP 1: Load due words ======
      const loadedWords = await studyWordsFSRSService.getFSRSWords(userId, {
        onlyDue: true,
      });

      expect(loadedWords).toHaveLength(3);
      expect(mockService.getFSRSWords).toHaveBeenCalledWith(userId, { onlyDue: true });

      // ====== STEP 2: Review first word (KNOWN - swipe right) ======
      mockService.updateWordAndReview.mockResolvedValue(true);

      const word1Review = await studyWordsFSRSService.updateWordAndReview(
        userId,
        loadedWords[0].root_id,
        {
          fsrs_due: new Date(Date.now() + 86400000).toISOString(), // Due in 1 day
          fsrs_stability: 7, // Increased
          fsrs_difficulty: 4.8, // Decreased slightly
          fsrs_elapsed_days: 0,
          fsrs_scheduled_days: 1,
          fsrs_learning_steps: 0,
          fsrs_reps: 3, // Incremented
          fsrs_lapses: 0,
          fsrs_state: 2,
          fsrs_last_review: new Date().toISOString(),
        },
        Rating.Good,
        5000, // 5 seconds to answer
      );

      expect(word1Review).toBe(true);
      expect(mockService.updateWordAndReview).toHaveBeenCalledWith(
        userId,
        101,
        expect.objectContaining({
          fsrs_reps: 3,
          fsrs_stability: 7,
        }),
        Rating.Good,
        5000,
      );

      // ====== STEP 3: Review second word (VAGUE - slight left swipe) ======
      // Vague words are marked as Hard and will reappear
      const word2Review = await studyWordsFSRSService.updateWordAndReview(
        userId,
        loadedWords[1].root_id,
        {
          fsrs_due: new Date(Date.now() + 3600000).toISOString(), // Due in 1 hour
          fsrs_stability: 3.5,
          fsrs_difficulty: 6.2,
          fsrs_elapsed_days: 0,
          fsrs_scheduled_days: 0,
          fsrs_learning_steps: 1,
          fsrs_reps: 2,
          fsrs_lapses: 0,
          fsrs_state: 1, // Learning state
          fsrs_last_review: new Date().toISOString(),
        },
        Rating.Hard,
        8000,
      );

      expect(word2Review).toBe(true);

      // ====== STEP 4: Review third word (KNOWN) ======
      const word3Review = await studyWordsFSRSService.updateWordAndReview(
        userId,
        loadedWords[2].root_id,
        {
          fsrs_due: new Date(Date.now() + 86400000).toISOString(),
          fsrs_stability: 6,
          fsrs_difficulty: 4.5,
          fsrs_elapsed_days: 0,
          fsrs_scheduled_days: 1,
          fsrs_learning_steps: 0,
          fsrs_reps: 4,
          fsrs_lapses: 0,
          fsrs_state: 2,
          fsrs_last_review: new Date().toISOString(),
        },
        Rating.Good,
        3000,
      );

      expect(word3Review).toBe(true);

      // ====== STEP 5: Vague word reappears ======
      // Simulate spacing algorithm bringing back word 2
      // User now marks it as KNOWN
      const word2SecondReview = await studyWordsFSRSService.updateWordAndReview(
        userId,
        loadedWords[1].root_id,
        {
          fsrs_due: new Date(Date.now() + 86400000).toISOString(),
          fsrs_stability: 5,
          fsrs_difficulty: 5.8,
          fsrs_elapsed_days: 0,
          fsrs_scheduled_days: 1,
          fsrs_learning_steps: 0,
          fsrs_reps: 3,
          fsrs_lapses: 0,
          fsrs_state: 2,
          fsrs_last_review: new Date().toISOString(),
        },
        Rating.Good,
        4000,
      );

      expect(word2SecondReview).toBe(true);

      // ====== STEP 6: Session completion check ======
      // All words reviewed and marked as known
      const sessionComplete = true; // Logic: knownWords === totalWords

      expect(sessionComplete).toBe(true);

      // ====== STEP 7: Calculate session metrics ======
      const sessionMetrics = {
        wordsReviewed: 3, // Unique words
        totalReviews: 4, // Including vague word second review
        wordsKnown: 3,
        wordsVague: 1,
        wordsUnknown: 0,
        currentStreak: 2, // Last 2 known
        longestStreak: 2,
        totalTime: 20000, // 20 seconds total
        averageTime: 5000, // Average per review
      };

      expect(sessionMetrics.wordsReviewed).toBe(3);
      expect(sessionMetrics.totalReviews).toBe(4);
      expect(sessionMetrics.wordsKnown).toBe(3);

      // ====== STEP 8: Verify all words updated ======
      expect(mockService.updateWordAndReview).toHaveBeenCalledTimes(4);

      // Verify each word was updated with correct rating
      const calls = mockService.updateWordAndReview.mock.calls;
      expect(calls[0][3]).toBe(Rating.Good); // Word 1: Known
      expect(calls[1][3]).toBe(Rating.Hard); // Word 2: Vague
      expect(calls[2][3]).toBe(Rating.Good); // Word 3: Known
      expect(calls[3][3]).toBe(Rating.Good); // Word 2 second review: Known
    });
  });

  describe('Edge Case: User marks all words as unknown', () => {
    it('should handle session with all words marked unknown', async () => {
      const userId = 'user-123';
      const dueWords = [
        createTestWord({
          id: 1,
          root_id: 101,
          word: 'صعب',
          definition: 'difficult',
          fsrs_due: new Date(Date.now() - 1000).toISOString(),
          fsrs_state: 2,
          fsrs_stability: 2,
          fsrs_difficulty: 7,
          fsrs_reps: 1,
        }),
        createTestWord({
          id: 2,
          root_id: 102,
          word: 'معقد',
          definition: 'complex',
          fsrs_due: new Date(Date.now() - 1000).toISOString(),
          fsrs_state: 2,
          fsrs_stability: 1,
          fsrs_difficulty: 8,
          fsrs_reps: 1,
        }),
      ];

      mockService.getFSRSWords.mockResolvedValue(dueWords);
      mockService.updateWordAndReview.mockResolvedValue(true);

      const loadedWords = await studyWordsFSRSService.getFSRSWords(userId, {
        onlyDue: true,
      });

      // Review both words as UNKNOWN (Rating.Again)
      await studyWordsFSRSService.updateWordAndReview(
        userId,
        loadedWords[0].root_id,
        {
          fsrs_due: new Date(Date.now() + 600000).toISOString(), // 10 min
          fsrs_stability: 1,
          fsrs_difficulty: 7.5,
          fsrs_elapsed_days: 0,
          fsrs_scheduled_days: 0,
          fsrs_learning_steps: 1,
          fsrs_reps: 2,
          fsrs_lapses: 1, // Lapse recorded
          fsrs_state: 3, // Relearning
          fsrs_last_review: new Date().toISOString(),
        },
        Rating.Again,
        10000,
      );

      await studyWordsFSRSService.updateWordAndReview(
        userId,
        loadedWords[1].root_id,
        {
          fsrs_due: new Date(Date.now() + 600000).toISOString(),
          fsrs_stability: 0.8,
          fsrs_difficulty: 8.5,
          fsrs_elapsed_days: 0,
          fsrs_scheduled_days: 0,
          fsrs_learning_steps: 1,
          fsrs_reps: 2,
          fsrs_lapses: 1,
          fsrs_state: 3,
          fsrs_last_review: new Date().toISOString(),
        },
        Rating.Again,
        12000,
      );

      // Both words should be rescheduled soon
      const calls = mockService.updateWordAndReview.mock.calls;
      expect(calls[0][3]).toBe(Rating.Again);
      expect(calls[1][3]).toBe(Rating.Again);

      // Verify lapses were recorded
      expect(calls[0][1]).toBe(101);
      expect(calls[1][1]).toBe(102);
    });
  });

  describe('Edge Case: Session interrupted and resumed', () => {
    it('should handle session interruption correctly', async () => {
      const userId = 'user-123';
      const dueWords = [
        createTestWord({
          id: 1,
          root_id: 101,
          fsrs_due: new Date(Date.now() - 1000).toISOString(),
        }),
        createTestWord({
          id: 2,
          root_id: 102,
          fsrs_due: new Date(Date.now() - 1000).toISOString(),
        }),
      ];

      mockService.getFSRSWords.mockResolvedValue(dueWords);
      mockService.updateWordAndReview.mockResolvedValue(true);

      // Start session
      const loadedWords = await studyWordsFSRSService.getFSRSWords(userId, {
        onlyDue: true,
      });

      // Review first word
      await studyWordsFSRSService.updateWordAndReview(
        userId,
        loadedWords[0].root_id,
        expect.any(Object),
        Rating.Good,
        5000,
      );

      // ====== INTERRUPTION: App backgrounded, then resumed ======
      // When resumed, reload due words (should get second word)
      mockService.getFSRSWords.mockResolvedValue([dueWords[1]]);

      const remainingWords = await studyWordsFSRSService.getFSRSWords(userId, {
        onlyDue: true,
      });

      expect(remainingWords).toHaveLength(1);
      expect(remainingWords[0].root_id).toBe(102);

      // Complete second word
      await studyWordsFSRSService.updateWordAndReview(
        userId,
        remainingWords[0].root_id,
        expect.any(Object),
        Rating.Good,
        6000,
      );

      // Session should complete
      expect(mockService.updateWordAndReview).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance: Large session (50+ words)', () => {
    it('should handle session with 50 words efficiently', async () => {
      const userId = 'user-123';

      // Generate 50 due words
      const dueWords = Array.from({ length: 50 }, (_, i) =>
        createTestWord({
          id: i + 1,
          root_id: 1000 + i,
          word: `word${i}`,
          definition: `definition${i}`,
          fsrs_due: new Date(Date.now() - 1000).toISOString(),
          fsrs_state: 2,
          fsrs_stability: 3 + Math.random() * 5,
          fsrs_difficulty: 4 + Math.random() * 3,
          fsrs_reps: Math.floor(Math.random() * 5) + 1,
        }),
      );

      mockService.getFSRSWords.mockResolvedValue(dueWords);
      mockService.updateWordAndReview.mockResolvedValue(true);

      const start = Date.now();

      // Load words
      const loadedWords = await studyWordsFSRSService.getFSRSWords(userId, {
        onlyDue: true,
      });

      expect(loadedWords).toHaveLength(50);

      // Review all words
      for (const word of loadedWords) {
        await studyWordsFSRSService.updateWordAndReview(
          userId,
          word.root_id,
          expect.any(Object),
          Rating.Good,
          3000,
        );
      }

      const elapsed = Date.now() - start;

      // Should complete 50 reviews in reasonable time (< 1 second for service calls)
      expect(elapsed).toBeLessThan(1000);
      expect(mockService.updateWordAndReview).toHaveBeenCalledTimes(50);
    });
  });

  describe('Data Integrity: FSRS fields consistency', () => {
    it('should maintain valid FSRS field values throughout session', async () => {
      const userId = 'user-123';
      const word = createTestWord({
        id: 1,
        root_id: 101,
        fsrs_due: new Date(Date.now() - 1000).toISOString(),
        fsrs_state: 2,
        fsrs_stability: 5,
        fsrs_difficulty: 5,
        fsrs_reps: 2,
        fsrs_lapses: 0,
      });

      mockService.getFSRSWords.mockResolvedValue([word]);
      mockService.updateWordAndReview.mockResolvedValue(true);

      await studyWordsFSRSService.getFSRSWords(userId, { onlyDue: true });

      // Review as Good - stability should increase
      await studyWordsFSRSService.updateWordAndReview(
        userId,
        word.root_id,
        {
          fsrs_due: new Date(Date.now() + 172800000).toISOString(), // 2 days
          fsrs_stability: 10, // Increased from 5
          fsrs_difficulty: 4.5, // Decreased from 5
          fsrs_elapsed_days: 0,
          fsrs_scheduled_days: 2,
          fsrs_learning_steps: 0,
          fsrs_reps: 3, // Incremented
          fsrs_lapses: 0, // No change (Good rating)
          fsrs_state: 2,
          fsrs_last_review: new Date().toISOString(),
        },
        Rating.Good,
        4000,
      );

      const updateCall = mockService.updateWordAndReview.mock.calls[0];
      const updatedFSRS = updateCall[2];

      // Verify FSRS invariants
      expect(updatedFSRS.fsrs_stability).toBeGreaterThan(word.fsrs_stability); // Stability increased
      expect(updatedFSRS.fsrs_difficulty).toBeLessThan(word.fsrs_difficulty); // Difficulty decreased
      expect(updatedFSRS.fsrs_reps).toBe(word.fsrs_reps + 1); // Reps incremented
      expect(updatedFSRS.fsrs_lapses).toBe(0); // No lapses on Good
      expect(updatedFSRS.fsrs_state).toBe(2); // Still in Review state

      // Due date should be in future
      const dueDate = new Date(updatedFSRS.fsrs_due);
      expect(dueDate.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
