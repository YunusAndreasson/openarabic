import {
  filterArticlesByAuthor,
  filterArticlesByCategory,
  filterArticles,
  getRecentArticles,
  getLatestArticles,
  getFeaturedArticles,
  getBeginnerArticles,
  getDailyPickArticle,
} from '../../utils/articleUtils';
import { Article } from '../../types/articles.types';

// Mock article data for testing
const mockArticles: Partial<Article>[] = [
  {
    id: 1,
    title: 'Article 1',
    author_id: 1,
    category_id: 1,
    created_at: new Date('2023-01-01').toISOString(),
    difficulty_level: 3,
    image_url: 'image1.jpg',
    category: null,
    author: null,
    article_sentences: [],
    audio_url: null,
    summary: null,
  },
  {
    id: 2,
    title: 'Article 2',
    author_id: 1,
    category_id: 2,
    created_at: new Date('2023-02-01').toISOString(),
    difficulty_level: 1,
    image_url: 'image2.jpg',
    category: null,
    author: null,
    article_sentences: [],
    audio_url: null,
    summary: null,
  },
  {
    id: 3,
    title: 'Article 3',
    author_id: 2,
    category_id: 1,
    created_at: new Date('2023-03-01').toISOString(),
    difficulty_level: 5,
    image_url: 'image3.jpg',
    category: null,
    author: null,
    article_sentences: [],
    audio_url: null,
    summary: null,
  },
  {
    id: 4,
    title: 'Article 4',
    author_id: 2,
    category_id: 3,
    created_at: new Date('2023-04-01').toISOString(),
    difficulty_level: 2,
    image_url: 'image4.jpg',
    category: null,
    author: null,
    article_sentences: [],
    audio_url: null,
    summary: null,
  },
];

describe('Article Utilities', () => {
  describe('filterArticlesByAuthor', () => {
    it('should filter articles by author ID', () => {
      const result = filterArticlesByAuthor(mockArticles as Article[], 1);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should return all articles if authorId is null', () => {
      const result = filterArticlesByAuthor(mockArticles as Article[], null);
      expect(result).toHaveLength(4);
    });
  });

  describe('filterArticlesByCategory', () => {
    it('should filter articles by category ID', () => {
      const result = filterArticlesByCategory(mockArticles as Article[], 1);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });

    it('should return all articles if categoryId is null', () => {
      const result = filterArticlesByCategory(mockArticles as Article[], null);
      expect(result).toHaveLength(4);
    });
  });

  describe('filterArticles', () => {
    it('should filter articles by author ID if provided', () => {
      const result = filterArticles(mockArticles as Article[], 1, null);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should filter articles by category ID if author ID is null', () => {
      const result = filterArticles(mockArticles as Article[], null, 1);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });

    it('should return all articles if both IDs are null', () => {
      const result = filterArticles(mockArticles as Article[], null, null);
      expect(result).toHaveLength(4);
    });
  });

  describe('getLatestArticles', () => {
    it('should return articles sorted by creation date (newest first)', () => {
      const result = getLatestArticles(mockArticles as Article[]);
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe(4); // Most recent
      expect(result[3].id).toBe(1); // Oldest
    });

    it('should respect the limit parameter', () => {
      const result = getLatestArticles(mockArticles as Article[], 2);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(4);
      expect(result[1].id).toBe(3);
    });
  });

  describe('getFeaturedArticles', () => {
    it('should return articles sorted by difficulty level (highest first)', () => {
      const result = getFeaturedArticles(mockArticles as Article[]);
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe(3); // Highest difficulty (5)
      expect(result[3].id).toBe(2); // Lowest difficulty (1)
    });

    it('should respect the limit parameter', () => {
      const result = getFeaturedArticles(mockArticles as Article[], 2);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(3);
      expect(result[1].id).toBe(1);
    });
  });

  describe('getBeginnerArticles', () => {
    it('should return articles sorted by difficulty level (lowest first)', () => {
      const result = getBeginnerArticles(mockArticles as Article[]);
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe(2); // Lowest difficulty (1)
      expect(result[3].id).toBe(3); // Highest difficulty (5)
    });

    it('should respect the limit parameter', () => {
      const result = getBeginnerArticles(mockArticles as Article[], 2);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(2);
      expect(result[1].id).toBe(4);
    });
  });

  describe('getDailyPickArticle', () => {
    it('should return an article based on the day of the year', () => {
      // Day 0 % 4 = 0, so it should return the first article
      const result = getDailyPickArticle(mockArticles as Article[], 0);
      expect(result).toBe(mockArticles[0]);

      // Day 5 % 4 = 1, so it should return the second article
      const result2 = getDailyPickArticle(mockArticles as Article[], 5);
      expect(result2).toBe(mockArticles[1]);
    });

    it('should return null if no articles are available', () => {
      const result = getDailyPickArticle([] as Article[], 1);
      expect(result).toBeNull();
    });
  });

  describe('getRecentArticles', () => {
    it('should return articles created within the specified number of days', () => {
      // With the reference date (2023-04-15), articles from 2023-03-16 or later are considered recent (30 days)
      const referenceDate = new Date('2023-04-15');
      const result = getRecentArticles(mockArticles as Article[], 30, 10, referenceDate);
      expect(result).toHaveLength(1); // Only article 4 is within 30 days (from 2023-03-16)
      expect(result[0].id).toBe(4); // Most recent first
    });

    it('should respect the days parameter', () => {
      // With the reference date (2023-04-15), articles from 2023-02-14 or later are considered recent (60 days)
      const referenceDate = new Date('2023-04-15');
      const result = getRecentArticles(mockArticles as Article[], 60, 10, referenceDate);
      expect(result).toHaveLength(2); // Articles 3 and 4 are within 60 days (from 2023-02-14)
      expect(result[0].id).toBe(4);
      expect(result[1].id).toBe(3);
    });

    it('should respect the limit parameter', () => {
      const referenceDate = new Date('2023-04-15');
      const result = getRecentArticles(mockArticles as Article[], 30, 1, referenceDate);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(4);
    });
  });
});
