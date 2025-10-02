import type { Article } from '@/types/articles.types';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  calculateFilterDate,
  filterArticles,
  getArticlesByDifficultWords,
  getArticlesByDueWords,
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
  {
    id: 1,
    root_id: 1,
    fsrs_state: 0,
    fsrs_difficulty: 1.0,
    fsrs_stability: 0,
    fsrs_reps: 0,
    fsrs_lapses: 0,
    fsrs_last_review: null,
    created_at: '2024-01-01T00:00:00Z',
    root: { id: 1, letters: 'مرحبا', meaning: 'hello' },
  },
  {
    id: 2,
    root_id: 2,
    fsrs_state: 1,
    fsrs_difficulty: 2.0,
    fsrs_stability: 5,
    fsrs_reps: 3,
    fsrs_lapses: 1,
    fsrs_last_review: '2024-01-10T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    root: { id: 2, letters: 'كيف', meaning: 'how' },
  },
];

describe('articleUtils', () => {
  describe('calculateFilterDate', () => {
    it('should return null for "all" date range', () => {
      const result = calculateFilterDate('all');
      expect(result).toBeNull();
    });

    it('should calculate week date correctly', () => {
      const result = calculateFilterDate('week');
      expect(result).not.toBeNull();
      expect(result!.getTime()).toBeLessThan(Date.now());
    });

    it('should calculate month date correctly', () => {
      const result = calculateFilterDate('month');
      expect(result).not.toBeNull();
      expect(result!.getTime()).toBeLessThan(Date.now());
    });
  });

  describe('sortArticlesByProgress', () => {
    it('should prioritize articles with partial progress (1-99%)', () => {
      const progressMap = new Map([
        [1, { progress_percentage: 50 }], // Partial progress
        [2, { progress_percentage: 0 }], // No progress
      ]);
      const result = sortArticlesByProgress(mockArticles, progressMap);
      expect(result[0].id).toBe(1); // Article with partial progress comes first
    });

    it('should place no-progress articles before completed articles', () => {
      const progressMap = new Map([
        [1, { progress_percentage: 100 }], // Completed
        [2, { progress_percentage: 0 }], // No progress
      ]);
      const result = sortArticlesByProgress(mockArticles, progressMap);
      expect(result[0].id).toBe(2); // No progress comes before completed
    });

    it('should handle articles without progress data', () => {
      const progressMap = new Map();
      const result = sortArticlesByProgress(mockArticles, progressMap);
      expect(result).toHaveLength(2);
    });
  });

  describe('filterArticles', () => {
    it('should filter by author IDs', () => {
      const filters = {
        authorIds: [1],
        difficultyRange: [1, 5] as [number, number],
        dateRange: 'all' as const,
      };
      const result = filterArticles(mockArticles, filters, null);
      expect(result).toHaveLength(1);
      expect(result[0].author.id).toBe(1);
    });

    it('should filter by difficulty range', () => {
      const filters = {
        authorIds: [],
        difficultyRange: [3, 5] as [number, number],
        dateRange: 'all' as const,
      };
      const result = filterArticles(mockArticles, filters, null);
      expect(result).toHaveLength(1);
      expect(result[0].difficulty_level).toBe(4);
    });

    it('should filter by date range', () => {
      const filters = {
        authorIds: [],
        difficultyRange: [1, 5] as [number, number],
        dateRange: 'all' as const,
      };
      const filterDate = new Date('2024-01-10T00:00:00Z');
      const result = filterArticles(mockArticles, filters, filterDate);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2); // Second article is newer
    });

    it('should return empty array for empty input', () => {
      const filters = {
        authorIds: [],
        difficultyRange: [1, 5] as [number, number],
        dateRange: 'all' as const,
      };
      const result = filterArticles([], filters, null);
      expect(result).toHaveLength(0);
    });
  });

  describe('getArticlesByDueWords', () => {
    it('should return articles sorted by due words count', () => {
      const result = getArticlesByDueWords(mockArticles, mockStudyWords, 10);
      expect(result).toHaveLength(2);
      // Both articles should have due words (root_id 1 and 2)
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should return empty array for no articles', () => {
      const result = getArticlesByDueWords([], mockStudyWords, 10);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for no due words', () => {
      const result = getArticlesByDueWords(mockArticles, [], 10);
      expect(result).toHaveLength(0);
    });

    it('should respect limit', () => {
      const result = getArticlesByDueWords(mockArticles, mockStudyWords, 1);
      expect(result).toHaveLength(1);
    });
  });

  describe('getArticlesByDifficultWords', () => {
    it('should return articles sorted by difficult words count', () => {
      const result = getArticlesByDifficultWords(mockArticles, mockStudyWords, 10);
      expect(result).toHaveLength(2);
      // Both articles should have difficult words (root_id 1 and 2)
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should return empty array for no articles', () => {
      const result = getArticlesByDifficultWords([], mockStudyWords, 10);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for no difficult words', () => {
      const result = getArticlesByDifficultWords(mockArticles, [], 10);
      expect(result).toHaveLength(0);
    });

    it('should respect limit', () => {
      const result = getArticlesByDifficultWords(mockArticles, mockStudyWords, 1);
      expect(result).toHaveLength(1);
    });
  });
});
