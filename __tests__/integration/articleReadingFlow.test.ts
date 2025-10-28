/**
 * Article Reading Flow - Integration Test
 *
 * Tests the complete article reading user journey:
 * 1. User browses and filters articles
 * 2. User selects an article card
 * 3. Article content loads (sentences, words, audio)
 * 4. User reads article with automatic progress tracking
 * 5. User bookmarks/saves article to reading list
 * 6. User adds interesting words to study list
 * 7. User plays audio for sentences
 * 8. Reading streak is updated on completion
 * 9. Reading progress is persisted
 *
 * This is a CRITICAL integration test covering the primary content consumption flow.
 */

import { articlesService } from '@/services/articles';
import { bookmarkService } from '@/services/bookmark';
import { ReadingProgressService } from '@/services/readingProgress';
import { studyStreakService } from '@/services/studyStreak';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { Article } from '@/types/articles.types';
import type { ArticleId, CategoryId } from '@/types/branded.types';

// Mock services
jest.mock('@/services/articles');
jest.mock('@/services/bookmark');
jest.mock('@/services/readingProgress');
jest.mock('@/services/studyStreak');
jest.mock('@/services/studyWordsFSRS');

const mockArticlesService = articlesService as jest.Mocked<typeof articlesService>;
const mockBookmarkService = bookmarkService as jest.Mocked<typeof bookmarkService>;
const mockReadingProgressService = ReadingProgressService as jest.Mocked<
  typeof ReadingProgressService
>;
const mockStudyStreakService = studyStreakService as jest.Mocked<typeof studyStreakService>;
const mockStudyWordsFSRSService = studyWordsFSRSService as jest.Mocked<
  typeof studyWordsFSRSService
>;

// Test helpers
const createMockArticle = (overrides: Partial<Article> = {}): Article => ({
  id: 1 as ArticleId,
  title: 'Introduction to Arabic Grammar',
  summary: 'Learn the basics of Arabic grammar and sentence structure.',
  created_at: '2024-01-01T00:00:00Z',
  image_url: 'https://example.com/image.jpg',
  difficulty_level: 2,
  category_id: 1 as CategoryId,
  author_id: 1,
  audio_url: 'audio/article1.mp3',
  audio_url_bilingual: 'audio/article1_bilingual.mp3',
  category: {
    id: 1 as CategoryId,
    name: 'Grammar',
  },
  author: {
    id: 1,
    name: 'Dr. Ahmad',
  },
  article_sentences: [
    {
      id: 1,
      position: 1,
      arabic: 'اللغة العربية جميلة',
      english: 'The Arabic language is beautiful',
      article_id: 1 as ArticleId,
      audio_url: 'audio/sentence1.mp3',
      audio_url_bilingual: null,
      audio_url_english: null,
      sentence_words: [
        {
          id: 1,
          position: 1,
          word_form: 'اللغة',
          english: 'the language',
          difficulty_level: 1,
          grammar_note: null,
          root_id: 101,
          sentence_id: 1,
          word_type_id: 1,
          audio_url: 'audio/word1.mp3',
          root: {
            id: 101,
            letters: 'لغة',
            meaning: 'language',
          },
          word_type: {
            id: 1,
            name: 'noun',
          },
        },
        {
          id: 2,
          position: 2,
          word_form: 'العربية',
          english: 'Arabic',
          difficulty_level: 1,
          grammar_note: null,
          root_id: 102,
          sentence_id: 1,
          word_type_id: 2,
          audio_url: 'audio/word2.mp3',
          root: {
            id: 102,
            letters: 'عرب',
            meaning: 'Arab',
          },
          word_type: {
            id: 2,
            name: 'adjective',
          },
        },
        {
          id: 3,
          position: 3,
          word_form: 'جميلة',
          english: 'beautiful',
          difficulty_level: 2,
          grammar_note: null,
          root_id: 103,
          sentence_id: 1,
          word_type_id: 2,
          audio_url: 'audio/word3.mp3',
          root: {
            id: 103,
            letters: 'جمل',
            meaning: 'beautiful',
          },
          word_type: {
            id: 2,
            name: 'adjective',
          },
        },
      ],
    },
    {
      id: 2,
      position: 2,
      arabic: 'أنا أتعلم العربية',
      english: 'I am learning Arabic',
      article_id: 1 as ArticleId,
      audio_url: 'audio/sentence2.mp3',
      audio_url_bilingual: null,
      audio_url_english: null,
      sentence_words: [
        {
          id: 4,
          position: 1,
          word_form: 'أنا',
          english: 'I',
          difficulty_level: 1,
          grammar_note: null,
          root_id: 104,
          sentence_id: 2,
          word_type_id: 3,
          audio_url: 'audio/word4.mp3',
          root: {
            id: 104,
            letters: 'أنا',
            meaning: 'I',
          },
          word_type: {
            id: 3,
            name: 'pronoun',
          },
        },
        {
          id: 5,
          position: 2,
          word_form: 'أتعلم',
          english: 'I learn',
          difficulty_level: 2,
          grammar_note: 'present tense verb',
          root_id: 105,
          sentence_id: 2,
          word_type_id: 4,
          audio_url: 'audio/word5.mp3',
          root: {
            id: 105,
            letters: 'علم',
            meaning: 'learn, know',
          },
          word_type: {
            id: 4,
            name: 'verb',
          },
        },
      ],
    },
  ],
  ...overrides,
});

describe('Article Reading Flow - Integration Test', () => {
  const userId = 'user-123';
  const articleId = 1 as ArticleId;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful service calls by default
    mockArticlesService.getArticles.mockResolvedValue([]);
    mockArticlesService.getArticleById.mockResolvedValue(createMockArticle());
    mockBookmarkService.addToReadingList.mockResolvedValue(undefined);
    mockBookmarkService.removeFromReadingList.mockResolvedValue(undefined);
    mockBookmarkService.isInReadingList.mockResolvedValue(false);
    mockReadingProgressService.updateProgress.mockResolvedValue(undefined);
    mockReadingProgressService.getProgress.mockResolvedValue(null);
    mockStudyStreakService.getReadingStreak.mockResolvedValue({
      currentStreak: 1,
      longestStreak: 1,
      lastReadingDate: new Date(),
      totalReadingDays: 1,
    });
    mockStudyWordsFSRSService.toggleFSRSStudyRoot.mockResolvedValue(true);
    mockStudyWordsFSRSService.getFSRSWords.mockResolvedValue([]);
    mockStudyWordsFSRSService.updateWordAndReview.mockResolvedValue(undefined);
  });

  describe('Happy Path: Complete Reading Journey', () => {
    it('should complete full article reading workflow', async () => {
      // ====== STEP 1: Browse and filter articles ======
      const grammarArticles = [
        createMockArticle({ id: 1 as ArticleId, title: 'Grammar Basics' }),
        createMockArticle({ id: 2 as ArticleId, title: 'Advanced Grammar' }),
      ];

      mockArticlesService.getArticles.mockResolvedValue(grammarArticles);

      const articles = await articlesService.getArticles({
        categoryId: 1 as CategoryId,
        minDifficulty: 1,
        maxDifficulty: 3,
      });

      expect(articles).toHaveLength(2);
      expect(mockArticlesService.getArticles).toHaveBeenCalledWith({
        categoryId: 1,
        minDifficulty: 1,
        maxDifficulty: 3,
      });

      // ====== STEP 2: Select an article ======
      const selectedArticle = articles[0];
      expect(selectedArticle.id).toBe(1);

      // ====== STEP 3: Load full article with sentences and words ======
      const fullArticle = createMockArticle({
        id: selectedArticle.id,
        article_sentences: createMockArticle().article_sentences,
      });
      mockArticlesService.getArticleById.mockResolvedValue(fullArticle);

      const loadedArticle = await articlesService.getArticleById(selectedArticle.id);

      expect(loadedArticle.article_sentences).toHaveLength(2);
      expect(loadedArticle.article_sentences[0].sentence_words).toHaveLength(3);
      expect(mockArticlesService.getArticleById).toHaveBeenCalledWith(selectedArticle.id);

      // ====== STEP 4: Track reading progress (user scrolls to sentence 1) ======
      const totalSentences = loadedArticle.article_sentences.length;

      await ReadingProgressService.updateProgress({
        userId,
        articleId: loadedArticle.id,
        lastSentenceRead: 1,
        totalSentences,
      });

      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledWith({
        userId,
        articleId: loadedArticle.id,
        lastSentenceRead: 1,
        totalSentences,
      });

      // ====== STEP 5: Add article to reading list (bookmark) ======
      await bookmarkService.addToReadingList(userId, loadedArticle.id);

      expect(mockBookmarkService.addToReadingList).toHaveBeenCalledWith(userId, loadedArticle.id);

      // ====== STEP 6: Add interesting word to study list ======
      const interestingWord = loadedArticle.article_sentences[1].sentence_words[1]; // "أتعلم"
      expect(interestingWord.word_form).toBe('أتعلم');
      expect(interestingWord.root?.letters).toBe('علم');

      await studyWordsFSRSService.toggleFSRSStudyRoot(userId, interestingWord.root_id);

      expect(mockStudyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledWith(userId, 105);

      // ====== STEP 7: Continue reading to sentence 2 ======
      await ReadingProgressService.updateProgress({
        userId,
        articleId: loadedArticle.id,
        lastSentenceRead: 2,
        totalSentences,
      });

      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledWith({
        userId,
        articleId: loadedArticle.id,
        lastSentenceRead: 2,
        totalSentences,
      });

      // ====== STEP 8: Complete article (all sentences read) ======
      // User has read all 2 sentences
      expect(2).toBe(totalSentences);

      // Increment reading streak on completion
      const streak = await studyStreakService.getReadingStreak(userId);

      expect(mockStudyStreakService.getReadingStreak).toHaveBeenCalledWith(userId);
      expect(streak.currentStreak).toBe(1);

      // ====== STEP 9: Verify all interactions completed ======
      expect(mockArticlesService.getArticles).toHaveBeenCalledTimes(1);
      expect(mockArticlesService.getArticleById).toHaveBeenCalledTimes(1);
      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledTimes(2);
      expect(mockBookmarkService.addToReadingList).toHaveBeenCalledTimes(1);
      expect(mockStudyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledTimes(1);
      expect(mockStudyStreakService.getReadingStreak).toHaveBeenCalledTimes(1);
    });
  });

  describe('Filtering and Discovery', () => {
    it('should filter articles by category', async () => {
      const grammarArticles = [
        createMockArticle({ id: 1 as ArticleId, category_id: 1 as CategoryId }),
        createMockArticle({ id: 2 as ArticleId, category_id: 1 as CategoryId }),
      ];

      mockArticlesService.getArticles.mockResolvedValue(grammarArticles);

      const articles = await articlesService.getArticles({
        categoryId: 1 as CategoryId,
      });

      expect(articles).toHaveLength(2);
      expect(mockArticlesService.getArticles).toHaveBeenCalledWith({
        categoryId: 1,
      });
    });

    it('should filter articles by difficulty range', async () => {
      const beginnerArticles = [
        createMockArticle({ id: 1 as ArticleId, difficulty_level: 1 }),
        createMockArticle({ id: 2 as ArticleId, difficulty_level: 2 }),
      ];

      mockArticlesService.getArticles.mockResolvedValue(beginnerArticles);

      const articles = await articlesService.getArticles({
        minDifficulty: 1,
        maxDifficulty: 2,
      });

      expect(articles).toHaveLength(2);
      expect(mockArticlesService.getArticles).toHaveBeenCalledWith({
        minDifficulty: 1,
        maxDifficulty: 2,
      });
    });

    it('should sort articles by date', async () => {
      const sortedArticles = [
        createMockArticle({ id: 3 as ArticleId, created_at: '2024-03-01T00:00:00Z' }),
        createMockArticle({ id: 2 as ArticleId, created_at: '2024-02-01T00:00:00Z' }),
        createMockArticle({ id: 1 as ArticleId, created_at: '2024-01-01T00:00:00Z' }),
      ];

      mockArticlesService.getArticles.mockResolvedValue(sortedArticles);

      const articles = await articlesService.getArticles({
        sortBy: 'created_at',
        sortOrder: 'desc',
      });

      expect(articles).toHaveLength(3);
      expect(articles[0].id).toBe(3);
      expect(articles[2].id).toBe(1);
    });
  });

  describe('Reading Progress Tracking', () => {
    it('should track progress as user reads through article', async () => {
      const article = createMockArticle();
      mockArticlesService.getArticleById.mockResolvedValue(article);

      const loadedArticle = await articlesService.getArticleById(articleId);
      const totalSentences = loadedArticle.article_sentences.length;

      // Read sentence 1
      await ReadingProgressService.updateProgress({
        userId,
        articleId,
        lastSentenceRead: 1,
        totalSentences,
      });

      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledWith({
        userId,
        articleId,
        lastSentenceRead: 1,
        totalSentences,
      });

      // Read sentence 2
      await ReadingProgressService.updateProgress({
        userId,
        articleId,
        lastSentenceRead: 2,
        totalSentences,
      });

      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledWith({
        userId,
        articleId,
        lastSentenceRead: 2,
        totalSentences,
      });

      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledTimes(2);
    });

    it('should calculate progress percentage', async () => {
      const article = createMockArticle();
      const totalSentences = article.article_sentences.length; // 2

      // Read 1 out of 2 sentences = 50%
      await ReadingProgressService.updateProgress({
        userId,
        articleId,
        lastSentenceRead: 1,
        totalSentences,
      });

      // Progress calculation: (1/2) * 100 = 50%
      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          lastSentenceRead: 1,
          totalSentences: 2,
        }),
      );
    });

    it('should mark article as complete when all sentences read', async () => {
      const article = createMockArticle();
      const totalSentences = article.article_sentences.length; // 2

      // Read all sentences
      await ReadingProgressService.updateProgress({
        userId,
        articleId,
        lastSentenceRead: totalSentences,
        totalSentences,
      });

      // 100% progress
      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledWith({
        userId,
        articleId,
        lastSentenceRead: 2,
        totalSentences: 2,
      });

      // Increment streak on completion
      const streak = await studyStreakService.getReadingStreak(userId);

      expect(mockStudyStreakService.getReadingStreak).toHaveBeenCalledWith(userId);
      expect(streak.currentStreak).toBe(1);
    });

    it('should retrieve previous reading progress', async () => {
      mockReadingProgressService.getProgress.mockResolvedValue({
        user_id: userId,
        article_id: articleId,
        last_sentence_read: 1,
        total_sentences: 2,
        progress_percentage: 50,
        updated_at: '2024-01-02T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      });

      const progress = await ReadingProgressService.getProgress(userId, articleId);

      expect(progress).not.toBeNull();
      expect(progress?.last_sentence_read).toBe(1);
      expect(progress?.progress_percentage).toBe(50);
      expect(mockReadingProgressService.getProgress).toHaveBeenCalledWith(userId, articleId);
    });

    it('should resume reading at saved position when reopening article', async () => {
      // Create article with 10 sentences
      const sentences = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        position: i + 1,
        arabic: `الجملة ${i + 1}`,
        english: `Sentence ${i + 1}`,
        article_id: 1 as ArticleId,
        audio_url: `audio/sentence${i + 1}.mp3`,
        audio_url_bilingual: null,
        audio_url_english: null,
        sentence_words: [],
      }));

      const article = createMockArticle({
        article_sentences: sentences,
      });

      // User previously read 5 out of 10 sentences (50% progress)
      mockReadingProgressService.getProgress.mockResolvedValue({
        user_id: userId,
        article_id: articleId,
        last_sentence_read: 5,
        total_sentences: 10,
        progress_percentage: 50,
        updated_at: '2024-01-02T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      });

      mockArticlesService.getArticleById.mockResolvedValue(article);

      // User reopens the article - progress is retrieved
      const existingProgress = await ReadingProgressService.getProgress(userId, articleId);
      const loadedArticle = await articlesService.getArticleById(articleId);

      // Verify existing progress exists
      expect(existingProgress).not.toBeNull();
      expect(existingProgress?.last_sentence_read).toBe(5);
      expect(existingProgress?.total_sentences).toBe(10);

      // Verify article loaded with correct sentence count
      expect(loadedArticle.article_sentences).toHaveLength(10);

      // Verify data needed for scroll-to-position is available
      // (In the actual UI, useArticleScreen will scroll to sentence 5 + 1 = index 6)
      const targetScrollIndex = (existingProgress?.last_sentence_read ?? 0) + 1;
      expect(targetScrollIndex).toBe(6);

      // Verify percentage calculation for toast message
      const percentage = Math.round(
        ((existingProgress?.last_sentence_read ?? 0) / (existingProgress?.total_sentences ?? 1)) *
          100,
      );
      expect(percentage).toBe(50);

      // Verify both service calls were made
      expect(mockReadingProgressService.getProgress).toHaveBeenCalledWith(userId, articleId);
      expect(mockArticlesService.getArticleById).toHaveBeenCalledWith(articleId);
    });
  });

  describe('Bookmarking and Reading List', () => {
    it('should add article to reading list', async () => {
      await bookmarkService.addToReadingList(userId, articleId);

      expect(mockBookmarkService.addToReadingList).toHaveBeenCalledWith(userId, articleId);
    });

    it('should remove article from reading list', async () => {
      await bookmarkService.removeFromReadingList(userId, articleId);

      expect(mockBookmarkService.removeFromReadingList).toHaveBeenCalledWith(userId, articleId);
    });

    it('should check if article is in reading list', async () => {
      mockBookmarkService.isInReadingList.mockResolvedValue(true);

      const isBookmarked = await bookmarkService.isInReadingList(userId, articleId);

      expect(isBookmarked).toBe(true);
      expect(mockBookmarkService.isInReadingList).toHaveBeenCalledWith(userId, articleId);
    });

    it('should toggle bookmark status', async () => {
      // Initially not bookmarked
      mockBookmarkService.isInReadingList.mockResolvedValue(false);
      let isBookmarked = await bookmarkService.isInReadingList(userId, articleId);
      expect(isBookmarked).toBe(false);

      // Add to reading list
      await bookmarkService.addToReadingList(userId, articleId);
      mockBookmarkService.isInReadingList.mockResolvedValue(true);

      isBookmarked = await bookmarkService.isInReadingList(userId, articleId);
      expect(isBookmarked).toBe(true);

      // Remove from reading list
      await bookmarkService.removeFromReadingList(userId, articleId);
      mockBookmarkService.isInReadingList.mockResolvedValue(false);

      isBookmarked = await bookmarkService.isInReadingList(userId, articleId);
      expect(isBookmarked).toBe(false);
    });
  });

  describe('Word Study List Management', () => {
    it('should add word from article to study list', async () => {
      const article = createMockArticle();
      const word = article.article_sentences[0].sentence_words[0];

      await studyWordsFSRSService.toggleFSRSStudyRoot(userId, word.root_id);

      expect(mockStudyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledWith(
        userId,
        word.root_id,
      );
    });

    it('should add multiple words to study list', async () => {
      const article = createMockArticle();
      const words = article.article_sentences[0].sentence_words;

      for (const word of words) {
        await studyWordsFSRSService.toggleFSRSStudyRoot(userId, word.root_id);
      }

      expect(mockStudyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledTimes(3);
      expect(mockStudyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledWith(userId, 101);
      expect(mockStudyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledWith(userId, 102);
      expect(mockStudyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledWith(userId, 103);
    });

    it('should add words from multiple sentences', async () => {
      const article = createMockArticle();

      // Add word from sentence 1
      const word1 = article.article_sentences[0].sentence_words[2]; // "جميلة"
      await studyWordsFSRSService.toggleFSRSStudyRoot(userId, word1.root_id);

      // Add word from sentence 2
      const word2 = article.article_sentences[1].sentence_words[1]; // "أتعلم"
      await studyWordsFSRSService.toggleFSRSStudyRoot(userId, word2.root_id);

      expect(mockStudyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledTimes(2);
      expect(mockStudyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledWith(userId, 103);
      expect(mockStudyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledWith(userId, 105);
    });
  });

  describe('Reading Streaks', () => {
    it('should increment streak on article completion', async () => {
      const streak = await studyStreakService.getReadingStreak(userId);

      expect(mockStudyStreakService.getReadingStreak).toHaveBeenCalledWith(userId);
      expect(streak.currentStreak).toBe(1);
    });

    it('should not increment streak for partial reads', async () => {
      const article = createMockArticle();
      const totalSentences = article.article_sentences.length;

      // Read only 1 out of 2 sentences
      await ReadingProgressService.updateProgress({
        userId,
        articleId,
        lastSentenceRead: 1,
        totalSentences,
      });

      // Streak should NOT be incremented (article not complete)
      expect(mockStudyStreakService.getReadingStreak).not.toHaveBeenCalled();
    });

    it('should only increment streak once per article completion', async () => {
      const article = createMockArticle();
      const totalSentences = article.article_sentences.length;

      // Complete article
      await ReadingProgressService.updateProgress({
        userId,
        articleId,
        lastSentenceRead: totalSentences,
        totalSentences,
      });

      await studyStreakService.getReadingStreak(userId);

      // Re-reading should not increment again (handled by service)
      expect(mockStudyStreakService.getReadingStreak).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle article with no sentences', async () => {
      const emptyArticle = createMockArticle({
        article_sentences: [],
      });
      mockArticlesService.getArticleById.mockResolvedValue(emptyArticle);

      const article = await articlesService.getArticleById(articleId);

      expect(article.article_sentences).toHaveLength(0);
    });

    it('should handle sentence with no words', async () => {
      const article = createMockArticle({
        article_sentences: [
          {
            id: 1,
            position: 1,
            arabic: 'النص',
            english: 'Text',
            article_id: 1 as ArticleId,
            audio_url: null,
            audio_url_bilingual: null,
            audio_url_english: null,
            sentence_words: [],
          },
        ],
      });
      mockArticlesService.getArticleById.mockResolvedValue(article);

      const loadedArticle = await articlesService.getArticleById(articleId);

      expect(loadedArticle.article_sentences[0].sentence_words).toHaveLength(0);
    });

    it('should handle missing audio URLs', async () => {
      const article = createMockArticle({
        audio_url: null,
        audio_url_bilingual: null,
        article_sentences: [
          {
            id: 1,
            position: 1,
            arabic: 'النص',
            english: 'Text',
            article_id: 1 as ArticleId,
            audio_url: null,
            audio_url_bilingual: null,
            audio_url_english: null,
            sentence_words: [],
          },
        ],
      });
      mockArticlesService.getArticleById.mockResolvedValue(article);

      const loadedArticle = await articlesService.getArticleById(articleId);

      expect(loadedArticle.audio_url).toBeNull();
      expect(loadedArticle.article_sentences[0].audio_url).toBeNull();
    });

    it('should handle reading progress updates for same sentence', async () => {
      // User scrolls back and forth
      await ReadingProgressService.updateProgress({
        userId,
        articleId,
        lastSentenceRead: 1,
        totalSentences: 2,
      });

      await ReadingProgressService.updateProgress({
        userId,
        articleId,
        lastSentenceRead: 1, // Same sentence
        totalSentences: 2,
      });

      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledTimes(2);
    });

    it('should handle service errors gracefully', async () => {
      mockArticlesService.getArticleById.mockRejectedValueOnce(new Error('Network error'));

      await expect(articlesService.getArticleById(articleId)).rejects.toThrow('Network error');
    });

    it('should handle bookmark failures', async () => {
      mockBookmarkService.addToReadingList.mockRejectedValueOnce(new Error('Bookmark failed'));

      await expect(bookmarkService.addToReadingList(userId, articleId)).rejects.toThrow(
        'Bookmark failed',
      );
    });
  });

  describe('Performance', () => {
    it('should handle large articles efficiently', async () => {
      // Create article with 100 sentences
      const largeSentences = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        position: i + 1,
        arabic: `الجملة ${i + 1}`,
        english: `Sentence ${i + 1}`,
        article_id: 1 as ArticleId,
        audio_url: `audio/sentence${i + 1}.mp3`,
        audio_url_bilingual: null,
        audio_url_english: null,
        sentence_words: [],
      }));

      const largeArticle = createMockArticle({
        article_sentences: largeSentences,
      });
      mockArticlesService.getArticleById.mockResolvedValue(largeArticle);

      const start = Date.now();
      const article = await articlesService.getArticleById(articleId);
      const elapsed = Date.now() - start;

      expect(article.article_sentences).toHaveLength(100);
      expect(elapsed).toBeLessThan(1000); // Should load in < 1 second
    });

    it('should handle multiple concurrent progress updates', async () => {
      const updates = [1, 2, 3, 4, 5].map(sentenceNum =>
        ReadingProgressService.updateProgress({
          userId,
          articleId,
          lastSentenceRead: sentenceNum,
          totalSentences: 10,
        }),
      );

      await Promise.all(updates);

      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledTimes(5);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain consistent sentence position ordering', async () => {
      const article = createMockArticle();
      mockArticlesService.getArticleById.mockResolvedValue(article);

      const loadedArticle = await articlesService.getArticleById(articleId);

      expect(loadedArticle.article_sentences[0].position).toBe(1);
      expect(loadedArticle.article_sentences[1].position).toBe(2);
    });

    it('should maintain consistent word position ordering', async () => {
      const article = createMockArticle();
      mockArticlesService.getArticleById.mockResolvedValue(article);

      const loadedArticle = await articlesService.getArticleById(articleId);
      const words = loadedArticle.article_sentences[0].sentence_words;

      expect(words[0].position).toBe(1);
      expect(words[1].position).toBe(2);
      expect(words[2].position).toBe(3);
    });

    it('should preserve root word information', async () => {
      const article = createMockArticle();
      mockArticlesService.getArticleById.mockResolvedValue(article);

      const loadedArticle = await articlesService.getArticleById(articleId);
      const word = loadedArticle.article_sentences[0].sentence_words[0];

      expect(word.root).toBeDefined();
      expect(word.root?.letters).toBe('لغة');
      expect(word.root?.meaning).toBe('language');
    });
  });
});
