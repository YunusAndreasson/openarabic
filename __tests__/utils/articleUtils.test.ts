/**
 * Article Utils Tests
 *
 * Tests article filtering, sorting, and recommendation utilities.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import type { Article } from '@/types/articles.types';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  getArticlesByDueWords,
  pickStarterArticle,
  pickStarterArticles,
  sortArticlesByProgress,
} from '@/utils/articleUtils';

// Mock data for testing
const mockArticles: Article[] = [
  {
    id: 1,
    title: 'Article 1',
    author: { id: 1, name: 'Author A' },
    difficulty_level: 2,
    created_at: '2024-01-01T00:00:00Z',
    image_url: 'test1.jpg',
    summary: 'Test article 1',
    audio_url: 'test1.mp3',
    category: { id: 1, name: 'Test Category' },
    article_sentences: [
      {
        id: 1,
        position: 0,
        arabic: 'كَلِمَة',
        english: 'word',
        article_id: 1,
        audio_url: 'test1.mp3',
        sentence_words: [
          {
            id: 1,
            position: 0,
            word_form: 'كَلِمَة',
            english: 'word',
            difficulty_level: 1,
            grammar_note: null,
            root_id: 1,
            sentence_id: 1,
            word_type_id: 1,
          },
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'Article 2',
    author: { id: 2, name: 'Author B' },
    difficulty_level: 4,
    created_at: '2024-01-15T00:00:00Z',
    image_url: 'test2.jpg',
    summary: 'Test article 2',
    audio_url: 'test2.mp3',
    category: { id: 1, name: 'Test Category' },
    article_sentences: [
      {
        id: 2,
        position: 1,
        arabic: 'كيف حالك',
        english: 'How are you',
        article_id: 2,
        audio_url: 'test2.mp3',
        sentence_words: [
          {
            id: 2,
            position: 1,
            word_form: 'كيف',
            english: 'how',
            difficulty_level: 2,
            grammar_note: null,
            root_id: 2,
            sentence_id: 2,
            word_type_id: 1,
          },
        ],
      },
    ],
  },
];

const mockStudyWords: StudyWord[] = [
  createTestWord({
    root_id: 1,
    fsrs_state: 0,
    fsrs_difficulty: 1.0,
    fsrs_stability: 0,
    fsrs_reps: 0,
    fsrs_lapses: 0,
    fsrs_last_review: null,
    root: { id: 1, letters: 'مرحبا', meaning: 'hello', audio_url: null, audio_url_en: null },
  }),
  createTestWord({
    root_id: 2,
    fsrs_state: 1,
    fsrs_difficulty: 2.0,
    fsrs_stability: 5,
    fsrs_reps: 3,
    fsrs_lapses: 1,
    fsrs_last_review: '2024-01-10T00:00:00Z',
    root: { id: 2, letters: 'كيف', meaning: 'how', audio_url: null, audio_url_en: null },
  }),
];

describe('articleUtils', () => {
  describe('sortArticlesByProgress', () => {
    test('should prioritize articles with partial progress (1-94%)', () => {
      const progressMap = new Map([
        [1, { last_sentence_read: 49, total_sentences: 100 }], // 50% partial progress
        // No entry for id 2 - 0% no progress
      ]);
      const result = sortArticlesByProgress(mockArticles, progressMap);
      expect(result[0].id).toBe(1); // Article with partial progress comes first
    });

    test('should place no-progress articles before completed articles (>=95%)', () => {
      const progressMap = new Map([
        [1, { last_sentence_read: 99, total_sentences: 100 }], // 100% completed
        // No entry for id 2 - 0% no progress
      ]);
      const result = sortArticlesByProgress(mockArticles, progressMap);
      expect(result[0].id).toBe(2); // No progress comes before completed
    });

    test('should handle articles without progress data', () => {
      const progressMap = new Map();
      const result = sortArticlesByProgress(mockArticles, progressMap);
      expect(result).toHaveLength(2);
    });

    test('should sort articles in correct priority order (in-progress > not-opened > completed)', () => {
      // Create extended mock articles for comprehensive testing
      const extendedArticles: Article[] = [
        { ...mockArticles[0], id: 1 },
        { ...mockArticles[1], id: 2 },
        { ...mockArticles[0], id: 3 },
        { ...mockArticles[1], id: 4 },
        { ...mockArticles[0], id: 5 },
        { ...mockArticles[1], id: 6 },
        { ...mockArticles[0], id: 7 },
        { ...mockArticles[1], id: 8 },
      ];

      // Test with all three categories (95% threshold for completion):
      // Note: calculateProgressPercentage does (lastSentenceRead + 1) / totalSentences
      // - In-progress: 94% (id 8), 75% (id 4), 50% (id 1), 25% (id 5), 1% (id 2)
      // - Not-opened: 0% (id 6 - no entry)
      // - Completed: 100% (id 3), 90% (id 7)
      const progressMap = new Map([
        [1, { last_sentence_read: 49, total_sentences: 100 }], // (49+1)/100 = 50%
        [2, { last_sentence_read: 0, total_sentences: 100 }], // (0+1)/100 = 1% (in-progress)
        [3, { last_sentence_read: 99, total_sentences: 100 }], // (99+1)/100 = 100%
        [4, { last_sentence_read: 74, total_sentences: 100 }], // (74+1)/100 = 75%
        [5, { last_sentence_read: 24, total_sentences: 100 }], // (24+1)/100 = 25%
        // No entry for id 6 - returns 0% (not-opened)
        [7, { last_sentence_read: 89, total_sentences: 100 }], // (89+1)/100 = 90%
        [8, { last_sentence_read: 88, total_sentences: 100 }], // (88+1)/100 = 89%
      ]);

      const result = sortArticlesByProgress(extendedArticles, progressMap);

      // Validate complete sorting order
      // Top tier: In-progress articles (1-89%, sorted descending)
      expect(result[0].id).toBe(8); // 89% - highest in-progress
      expect(result[1].id).toBe(4); // 75%
      expect(result[2].id).toBe(1); // 50%
      expect(result[3].id).toBe(5); // 25%
      expect(result[4].id).toBe(2); // 1% - lowest in-progress

      // Middle tier: Not-opened articles (0%)
      expect(result[5].id).toBe(6); // 0% - no entry

      // Bottom tier: Completed articles (>=90%, sorted descending)
      expect(result[6].id).toBe(3); // 100%
      expect(result[7].id).toBe(7); // 90% - at threshold
    });

    test('should treat 89% as in-progress but 90%+ as completed', () => {
      const extendedArticles: Article[] = [
        { ...mockArticles[0], id: 1 },
        { ...mockArticles[1], id: 2 },
        { ...mockArticles[0], id: 3 },
        { ...mockArticles[1], id: 4 },
        { ...mockArticles[0], id: 5 },
        { ...mockArticles[1], id: 6 },
      ];

      // Test edge cases around 90% completion threshold
      // Note: calculateProgressPercentage does (lastSentenceRead + 1) / totalSentences
      const progressMap = new Map([
        [1, { last_sentence_read: 0, total_sentences: 100 }], // (0+1)/100 = 1% in-progress
        // No entry for id 2 - returns 0% (not-opened)
        [3, { last_sentence_read: 88, total_sentences: 100 }], // (88+1)/100 = 89% in-progress
        [4, { last_sentence_read: 89, total_sentences: 100 }], // (89+1)/100 = 90% completed
        [5, { last_sentence_read: 98, total_sentences: 100 }], // (98+1)/100 = 99% completed
        [6, { last_sentence_read: 99, total_sentences: 100 }], // (99+1)/100 = 100% completed
      ]);

      const result = sortArticlesByProgress(extendedArticles, progressMap);

      // Validate edge cases are categorized correctly
      // In-progress tier (1-89%, sorted descending)
      expect(result[0].id).toBe(3); // 89% - highest in-progress
      expect(result[1].id).toBe(1); // 1% - lowest in-progress

      // Not-opened tier (0%)
      expect(result[2].id).toBe(2); // 0% - not opened (no entry)

      // Completed tier (90%+, sorted descending)
      expect(result[3].id).toBe(6); // 100%
      expect(result[4].id).toBe(5); // 99%
      expect(result[5].id).toBe(4); // 90% - at threshold
    });
  });

  describe('getArticlesByDueWords', () => {
    test('should return articles sorted by due words count', () => {
      const result = getArticlesByDueWords(mockArticles, mockStudyWords, 10);
      expect(result).toHaveLength(2);
      // Both articles should have due words (root_id 1 and 2)
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    test('should return empty array for no articles', () => {
      const result = getArticlesByDueWords([], mockStudyWords, 10);
      expect(result).toHaveLength(0);
    });

    test('should return empty array for no due words', () => {
      const result = getArticlesByDueWords(mockArticles, [], 10);
      expect(result).toHaveLength(0);
    });

    test('should respect limit', () => {
      const result = getArticlesByDueWords(mockArticles, mockStudyWords, 1);
      expect(result).toHaveLength(1);
    });
  });

  describe('pickStarterArticles', () => {
    // mockArticles[0] has difficulty 2, mockArticles[1] has difficulty 4.
    // A progress entry with last_sentence_read: 0 counts as 1% (started), so
    // "unread" means no progress entry at all.
    const makeArticle = (id: number, difficulty: number, sentenceCount = 1): Article => ({
      ...mockArticles[0],
      id,
      difficulty_level: difficulty,
      article_sentences: Array.from({ length: sentenceCount }, (_, i) => ({
        ...mockArticles[0].article_sentences[0],
        id: id * 100 + i,
        position: i,
      })),
    });

    test('tier 1: prefers unread beginner articles (difficulty ≤ 2)', () => {
      const articles = [makeArticle(1, 4), makeArticle(2, 2), makeArticle(3, 1)];
      const result = pickStarterArticles(articles, new Map());
      expect(result.map(r => r.article.id)).toEqual([2, 3]);
      expect(result.every(r => r.progress === 0)).toBe(true);
    });

    test('tier 2: falls back to unread difficulty ≤ 3 when no beginner articles', () => {
      const articles = [makeArticle(1, 4), makeArticle(2, 3)];
      const result = pickStarterArticles(articles, new Map());
      expect(result.map(r => r.article.id)).toEqual([2]);
    });

    test('tier 3: falls back to any unread article, shortest first', () => {
      const articles = [makeArticle(1, 5, 10), makeArticle(2, 4, 3)];
      const result = pickStarterArticles(articles, new Map());
      expect(result.map(r => r.article.id)).toEqual([2, 1]);
    });

    test('tier 4: falls back to all articles by least progress when everything is started', () => {
      const articles = [makeArticle(1, 2), makeArticle(2, 2)];
      const progressMap = new Map([
        [1, { last_sentence_read: 49, total_sentences: 100 }], // 50%
        [2, { last_sentence_read: 9, total_sentences: 100 }], // 10%
      ]);
      const result = pickStarterArticles(articles, progressMap);
      expect(result.map(r => r.article.id)).toEqual([2, 1]);
      expect(result[0].progress).toBe(10);
    });

    test('never returns empty for a non-empty catalog', () => {
      const articles = [makeArticle(1, 5)];
      const progressMap = new Map([[1, { last_sentence_read: 99, total_sentences: 100 }]]);
      expect(pickStarterArticles(articles, progressMap)).toHaveLength(1);
    });

    test('returns empty for an empty catalog', () => {
      expect(pickStarterArticles([], new Map())).toHaveLength(0);
      expect(pickStarterArticle([], new Map())).toBeUndefined();
    });

    test('respects max and pickStarterArticle returns the first pick', () => {
      const articles = [makeArticle(1, 1), makeArticle(2, 1), makeArticle(3, 1)];
      expect(pickStarterArticles(articles, new Map(), 2)).toHaveLength(2);
      expect(pickStarterArticle(articles, new Map())?.id).toBe(1);
    });
  });
});
