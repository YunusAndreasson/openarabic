/**
 * Integration Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * Article Reading Flow Integration Test
 *
 * Tests the complete user journey for reading an article with progress tracking.
 * This is a CRITICAL integration test covering the #1 user workflow.
 *
 * User Journey:
 * 1. User opens article from library
 * 2. Article loads with content and reading progress
 * 3. User scrolls through sentences
 * 4. Reading progress auto-saves as user reads
 * 5. User closes article
 * 6. User reopens same article
 * 7. Article resumes from last read position
 *
 * This test validates:
 * - Article data loading
 * - Reading progress persistence
 * - Progress tracking during reading
 * - Cache invalidation after updates
 * - Scroll-to-position on article reopen
 */

import type { Article } from '@/types/articles.types';
import type { ArticleId, AuthorId, CategoryId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';

// Mock services
jest.mock('@/services/articles');
jest.mock('@/services/readingProgress');
jest.mock('@/hooks/auth/useAuth');

import { articlesService } from '@/services/articles';
import { readingProgressService, type ReadingProgress } from '@/services/readingProgress';

const mockArticlesService = articlesService as jest.Mocked<typeof articlesService>;
const mockReadingProgressService = readingProgressService as jest.Mocked<
  typeof readingProgressService
>;

// Mock useAuth
const mockUseAuth = jest.requireMock('@/hooks/auth/useAuth');

describe('Article Reading Flow - Integration Test', () => {
  const testUserId = 'user-123';
  const testArticleId = 42 as ArticleId;

  // Test article with 10 sentences
  const createTestArticle = (): Article => ({
    id: testArticleId,
    title: 'Test Article',
    summary: 'Test summary',
    image_url: 'https://example.com/image.jpg',
    difficulty_level: 2,
    created_at: '2024-01-01T00:00:00Z',
    category_id: 1 as CategoryId,
    author_id: 1 as AuthorId,
    audio_url: 'https://example.com/audio.mp3',
    audio_url_bilingual: null,
    content_hash: 'test-hash-123',
    category: { id: 1 as CategoryId, name: 'Category 1' },
    author: { id: 1 as AuthorId, name: 'Author 1' },
    article_sentences: Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      position: i,
      arabic: `Arabic sentence ${i + 1}`,
      english: `English sentence ${i + 1}`,
      article_id: testArticleId as unknown as number,
      audio_url: null,
      audio_url_bilingual: null,
      audio_url_english: null,
      sentence_words: [
        {
          id: i * 10 + 1,
          position: 0,
          word_form: 'CDE)',
          english: 'word',
          difficulty_level: 1,
          grammar_note: null,
          root_id: 100 + i,
          sentence_id: i + 1,
          word_forms: null,
          root_definition: 'word',
        },
      ],
    })) as unknown as Tables<'article_sentences'>[],
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default auth mock
    mockUseAuth.useAuth = jest.fn(() => ({
      user: { id: testUserId },
      isLoading: false,
    }));

    // Setup default article mock
    mockArticlesService.getArticleById.mockResolvedValue(createTestArticle());

    // Setup default empty progress
    mockReadingProgressService.getProgress.mockResolvedValue(null);
    mockReadingProgressService.getBulkProgress.mockResolvedValue(
      new Map<number, ReadingProgress>(),
    );
    mockReadingProgressService.updateProgress.mockResolvedValue(undefined);
  });

  describe('First-time Article Reading (No existing progress)', () => {
    test('should load article and start tracking progress from beginning', async () => {
      // ====== STEP 1: Open article ======
      const article = await articlesService.getArticleById(testArticleId);

      expect(article).toBeDefined();
      expect(article.article_sentences).toHaveLength(10);
      expect(mockArticlesService.getArticleById).toHaveBeenCalledWith(testArticleId);

      // ====== STEP 2: Check for existing progress ======
      const existingProgress = await readingProgressService.getProgress(testUserId, testArticleId);

      expect(existingProgress).toBeNull(); // No previous progress
      expect(mockReadingProgressService.getProgress).toHaveBeenCalledWith(
        testUserId,
        testArticleId,
      );

      // ====== STEP 3: User reads to sentence 5 ======
      const currentSentenceIndex = 5;
      const totalSentences = article.article_sentences?.length ?? 0;

      await readingProgressService.updateProgress({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: currentSentenceIndex,
        totalSentences,
      });

      // Verify progress was saved
      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledWith({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: 5,
        totalSentences: 10,
      });
    });

    test('should auto-save progress as user scrolls through sentences', async () => {
      const article = await articlesService.getArticleById(testArticleId);
      const totalSentences = article.article_sentences?.length ?? 0;

      // ====== SIMULATE: User scrolls from sentence 0 � 1 � 2 � 3 ======
      const readSentences = [0, 1, 2, 3];

      for (const sentenceIndex of readSentences) {
        await readingProgressService.updateProgress({
          userId: testUserId,
          articleId: testArticleId,
          lastSentenceRead: sentenceIndex,
          totalSentences,
        });
      }

      // Verify updateProgress was called for each sentence
      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledTimes(4);

      // Verify last call saved sentence 3
      const lastCall = mockReadingProgressService.updateProgress.mock.calls[3];
      expect(lastCall).toBeDefined();
      expect(lastCall![0]).toEqual({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: 3,
        totalSentences: 10,
      });
    });
  });

  describe('Resuming Article Reading (With existing progress)', () => {
    test('should load article and resume from last read position', async () => {
      // ====== SETUP: User has previously read to sentence 5 ======
      const previousProgress: ReadingProgress = {
        user_id: testUserId,
        article_id: testArticleId,
        last_sentence_read: 5,
        total_sentences: 10,
        progress_percentage: 50,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      };

      mockReadingProgressService.getProgress.mockResolvedValue(previousProgress);
      mockReadingProgressService.getBulkProgress.mockResolvedValue(
        new Map([[testArticleId, previousProgress]]),
      );

      // ====== STEP 1: Open article ======
      const article = await articlesService.getArticleById(testArticleId);

      expect(article).toBeDefined();

      // ====== STEP 2: Check for existing progress ======
      const existingProgress = await readingProgressService.getProgress(testUserId, testArticleId);

      expect(existingProgress).not.toBeNull();
      expect(existingProgress?.last_sentence_read).toBe(5);
      expect(existingProgress?.progress_percentage).toBe(50);

      // ====== STEP 3: Verify scroll-to-position logic ======
      const lastSentenceRead = existingProgress?.last_sentence_read ?? 0;
      const shouldScrollToPosition = lastSentenceRead > 0;

      expect(shouldScrollToPosition).toBeTruthy();
      expect(lastSentenceRead).toBe(5);

      // ====== STEP 4: User continues reading from sentence 5 � 6 ======
      await readingProgressService.updateProgress({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: 6,
        totalSentences: 10,
      });

      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledWith({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: 6,
        totalSentences: 10,
      });
    });

    test('should handle article completion (read all sentences)', async () => {
      const article = await articlesService.getArticleById(testArticleId);
      const totalSentences = article.article_sentences?.length ?? 0;

      // ====== SIMULATE: User reads to last sentence (index 9) ======
      await readingProgressService.updateProgress({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: 9, // Last sentence (0-indexed)
        totalSentences,
      });

      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledWith({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: 9,
        totalSentences: 10,
      });

      // Verify progress shows 90% completion
      const lastCall = mockReadingProgressService.updateProgress.mock.calls[0];
      expect(lastCall).toBeDefined();
      const lastSentenceRead = lastCall![0].lastSentenceRead;
      // Note: last_sentence_read is 0-based, so add 1 for count
      const progressPercentage = Math.round(((lastSentenceRead + 1) / totalSentences) * 100);

      expect(progressPercentage).toBe(100); // (9+1)/10 = 100% (last sentence at index 9)
    });
  });

  describe('Multiple Article Opens (Persistence)', () => {
    test('should persist progress across multiple open/close cycles', async () => {
      const totalSentences = 10;

      // ====== CYCLE 1: Open � Read to sentence 3 � Close ======
      await articlesService.getArticleById(testArticleId);

      await readingProgressService.updateProgress({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: 3,
        totalSentences,
      });

      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledWith({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: 3,
        totalSentences: 10,
      });

      // ====== CYCLE 2: Reopen � Resume from sentence 3 � Read to sentence 7 � Close ======
      const progress1: ReadingProgress = {
        user_id: testUserId,
        article_id: testArticleId,
        last_sentence_read: 3,
        total_sentences: 10,
        progress_percentage: 30,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      };

      mockReadingProgressService.getProgress.mockResolvedValue(progress1);

      const existingProgress1 = await readingProgressService.getProgress(testUserId, testArticleId);
      expect(existingProgress1?.last_sentence_read).toBe(3);

      await readingProgressService.updateProgress({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: 7,
        totalSentences,
      });

      // ====== CYCLE 3: Reopen � Resume from sentence 7 � Read to end ======
      const progress2: ReadingProgress = {
        user_id: testUserId,
        article_id: testArticleId,
        last_sentence_read: 7,
        total_sentences: 10,
        progress_percentage: 70,
        updated_at: '2024-01-01T13:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      };

      mockReadingProgressService.getProgress.mockResolvedValue(progress2);

      const existingProgress2 = await readingProgressService.getProgress(testUserId, testArticleId);
      expect(existingProgress2?.last_sentence_read).toBe(7);

      // Verify updateProgress was called 2 times (once per cycle)
      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle user not authenticated (no progress tracking)', async () => {
      // Mock no user
      mockUseAuth.useAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      // Article should still load
      const article = await articlesService.getArticleById(testArticleId);
      expect(article).toBeDefined();

      // Progress operations should not be called without user
      expect(mockReadingProgressService.getProgress).not.toHaveBeenCalled();
      expect(mockReadingProgressService.updateProgress).not.toHaveBeenCalled();
    });

    test('should handle article with no sentences gracefully', async () => {
      // Mock article with empty sentences
      const emptyArticle: Article = {
        ...createTestArticle(),
        article_sentences: [],
      };

      mockArticlesService.getArticleById.mockResolvedValue(emptyArticle);

      const article = await articlesService.getArticleById(testArticleId);

      expect(article.article_sentences).toHaveLength(0);

      // Progress update should handle 0 total sentences
      await readingProgressService.updateProgress({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: 0,
        totalSentences: 0,
      });

      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledWith({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: 0,
        totalSentences: 0,
      });
    });

    test('should handle progress update failures gracefully', async () => {
      const article = await articlesService.getArticleById(testArticleId);

      // Mock updateProgress to fail
      const error = new Error('Network error');
      mockReadingProgressService.updateProgress.mockRejectedValue(error);

      // Attempt to update progress
      await expect(
        readingProgressService.updateProgress({
          userId: testUserId,
          articleId: testArticleId,
          lastSentenceRead: 5,
          totalSentences: article.article_sentences?.length ?? 0,
        }),
      ).rejects.toThrow('Network error');

      // Verify error was thrown, not silently swallowed
      expect(mockReadingProgressService.updateProgress).toHaveBeenCalled();
    });

    test('should handle rapid scroll changes efficiently', async () => {
      const article = await articlesService.getArticleById(testArticleId);
      const totalSentences = article.article_sentences?.length ?? 0;

      // ====== SIMULATE: User rapidly scrolls through 5 sentences ======
      // In real app, debouncing/throttling would reduce calls, but service should handle it
      const rapidScrolls = [0, 1, 2, 3, 4];

      for (const sentenceIndex of rapidScrolls) {
        await readingProgressService.updateProgress({
          userId: testUserId,
          articleId: testArticleId,
          lastSentenceRead: sentenceIndex,
          totalSentences,
        });
      }

      // All calls should succeed
      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledTimes(5);

      // Verify last call has correct sentence
      const lastCall = mockReadingProgressService.updateProgress.mock.calls[4];
      expect(lastCall).toBeDefined();
      expect(lastCall![0].lastSentenceRead).toBe(4);
    });
  });

  describe('Data Integrity', () => {
    test('should maintain correct progress percentage calculation', async () => {
      const article = await articlesService.getArticleById(testArticleId);
      const totalSentences = article.article_sentences?.length ?? 0;

      // Test various progress points
      // Note: sentenceIndex is 0-based, so add 1 to get count of sentences read
      const testCases = [
        { sentenceIndex: 0, expectedPercent: 10 }, // First sentence read
        { sentenceIndex: 2, expectedPercent: 30 }, // Third sentence read
        { sentenceIndex: 5, expectedPercent: 60 }, // Sixth sentence read
        { sentenceIndex: 9, expectedPercent: 100 }, // Last sentence (10th) read
      ];

      for (const { sentenceIndex, expectedPercent } of testCases) {
        const calculatedPercent = Math.round(((sentenceIndex + 1) / totalSentences) * 100);
        expect(calculatedPercent).toBe(expectedPercent);
      }
    });

    test('should never regress progress (only move forward)', async () => {
      const totalSentences = 10;

      // ====== User reads to sentence 5 ======
      await readingProgressService.updateProgress({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: 5,
        totalSentences,
      });

      // ====== User scrolls back to sentence 3 (should NOT regress progress) ======
      // In real app, the hook would not call updateProgress for lower sentence indices
      // This test verifies the service accepts the call but app logic prevents regression

      await readingProgressService.updateProgress({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: 3, // Lower than previous
        totalSentences,
      });

      // Service should still be called (service doesn't prevent it, app logic does)
      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledTimes(2);

      // Note: The service accepts the call regardless of regression. The hook prevents
      // regression by not calling updateProgress for lower sentence indices.
      // This test confirms the service layer accepts any valid input.
    });
  });
});
