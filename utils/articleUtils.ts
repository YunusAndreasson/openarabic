import { Article } from '../types/articles.types';
import { getDayOfYear } from './dateUtils';

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
 * Creates a seeded random number generator
 * @param seed - The seed for the random number generator
 * @returns A function that generates random numbers between 0 and 1
 */
function createSeededRandom(seed: number) {
  return function () {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
}

/**
 * Shuffles an array using a seeded random number generator
 * @param array - The array to shuffle
 * @param seed - The seed for the random number generator
 * @returns A new shuffled array
 */
function seededShuffle<T>(array: T[], seed: number): T[] {
  const random = createSeededRandom(seed);
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Gets beginner-friendly articles (lowest difficulty level)
 * @param articles - The articles to sort
 * @param limit - The maximum number of articles to return (default: 20)
 * @returns Beginner-friendly articles sorted by difficulty level (lowest first)
 */
export function getBeginnerArticles(articles: Article[], limit = 20): Article[] {
  return articles
    .slice(0) // Create a copy to avoid mutating the original array
    .sort((a, b) => a.difficulty_level - b.difficulty_level)
    .slice(0, limit);
}

/**
 * Gets a daily pick article based on the day of the year
 * @param articles - The articles to pick from
 * @param dayOfYear - The day of the year (1-366)
 * @returns A random but consistent daily pick article or null if no articles are available
 */
export function getDailyPickArticle(articles: Article[], dayOfYear: number): Article | null {
  if (articles.length === 0) return null;

  // Shuffle the articles using the day of year as seed
  const shuffledArticles = seededShuffle(articles, dayOfYear);

  // Return the first article from the shuffled array
  return shuffledArticles[0];
}
