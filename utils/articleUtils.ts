import { Article } from '../types/articles.types';
import { addDays } from './dateUtils';

/**
 * Filters articles by author ID
 * @param articles - The articles to filter
 * @param authorId - The author ID to filter by
 * @returns Filtered articles by author ID
 */
export function filterArticlesByAuthor(articles: Article[], authorId: number | null): Article[] {
  if (authorId === null) return articles;
  return articles.filter(article => article.author_id === authorId);
}

/**
 * Filters articles by category ID
 * @param articles - The articles to filter
 * @param categoryId - The category ID to filter by
 * @returns Filtered articles by category ID
 */
export function filterArticlesByCategory(
  articles: Article[],
  categoryId: number | null
): Article[] {
  if (categoryId === null) return articles;
  return articles.filter(article => article.category_id === categoryId);
}

/**
 * Filters articles by author or category ID
 * @param articles - The articles to filter
 * @param authorId - The author ID to filter by
 * @param categoryId - The category ID to filter by
 * @returns Filtered articles by author or category ID
 */
export function filterArticles(
  articles: Article[],
  authorId: number | null,
  categoryId: number | null
): Article[] {
  if (authorId !== null) {
    return filterArticlesByAuthor(articles, authorId);
  } else if (categoryId !== null) {
    return filterArticlesByCategory(articles, categoryId);
  }
  return articles;
}

/**
 * Gets recent articles (within the specified number of days from the reference date)
 * @param articles - The articles to filter
 * @param days - The number of days to consider as recent (default: 30)
 * @param limit - The maximum number of articles to return (default: 10)
 * @param referenceDate - The reference date to calculate from (default: current date)
 * @returns Recent articles sorted by creation date (newest first)
 */
export function getRecentArticles(
  articles: Article[],
  days = 30,
  limit = 10,
  referenceDate: Date = new Date()
): Article[] {
  // Calculate the cutoff date by subtracting the specified number of days
  const cutoffDate = addDays(referenceDate, -days);

  return articles
    .filter(article => {
      // Parse the article's creation date
      const articleDate = new Date(article.created_at);
      // Compare the article date with the cutoff date
      return articleDate >= cutoffDate;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

/**
 * Gets latest articles sorted by creation date
 * @param articles - The articles to sort
 * @param limit - The maximum number of articles to return (default: 10)
 * @returns Latest articles sorted by creation date (newest first)
 */
export function getLatestArticles(articles: Article[], limit = 10): Article[] {
  return articles
    .slice(0) // Create a copy to avoid mutating the original array
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

/**
 * Gets featured articles (highest difficulty level)
 * @param articles - The articles to sort
 * @param limit - The maximum number of articles to return (default: 5)
 * @returns Featured articles sorted by difficulty level (highest first)
 */
export function getFeaturedArticles(articles: Article[], limit = 5): Article[] {
  return articles
    .slice(0) // Create a copy to avoid mutating the original array
    .filter(article => article.difficulty_level >= 3) // Only include articles with difficulty 3+
    .sort((a, b) => b.difficulty_level - a.difficulty_level)
    .slice(0, limit);
}

/**
 * Gets beginner-friendly articles (lowest difficulty level)
 * @param articles - The articles to sort
 * @param limit - The maximum number of articles to return (default: 10)
 * @returns Beginner-friendly articles sorted by difficulty level (lowest first)
 */
export function getBeginnerArticles(articles: Article[], limit = 10): Article[] {
  return articles
    .slice(0) // Create a copy to avoid mutating the original array
    .sort((a, b) => a.difficulty_level - b.difficulty_level)
    .slice(0, limit);
}

/**
 * Gets a daily pick article based on the day of the year
 * @param articles - The articles to pick from
 * @param dayOfYear - The day of the year (1-366)
 * @returns A daily pick article or null if no articles are available
 */
export function getDailyPickArticle(articles: Article[], dayOfYear: number): Article | null {
  if (articles.length === 0) return null;

  const pickIndex = dayOfYear % articles.length;
  return articles[pickIndex];
}
