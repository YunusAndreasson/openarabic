import type { Article } from '../types/articles.types';
import type { StudyWord } from '../types/vocabulary.types';


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
  if (!articles.length) return [];

  return articles.filter(article => {
    if (authorId !== null && article.author_id !== authorId) return false;
    if (categoryId !== null && article.category_id !== categoryId) return false;
    return true;
  });
}

/**
 * Gets latest articles sorted by creation date
 * @param articles - The articles to sort
 * @param limit - The maximum number of articles to return (default: 10)
 * @returns Latest articles sorted by creation date (newest first)
 */
export function getLatestArticles(articles: Article[], limit = 10): Article[] {
  if (!articles.length) return [];

  return [...articles] // Using spread operator for clarity
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
    // TypeScript doesn't track that j < i+1, but we know this is safe
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]] as [T, T];
  }

  return shuffled;
}

/**
 * Gets beginner-friendly articles (difficulty level 1-3)
 * @param articles - The articles to sort
 * @param limit - The maximum number of articles to return (default: 20)
 * @returns Beginner-friendly articles sorted by difficulty level (lowest first)
 */
export function getBeginnerArticles(articles: Article[], limit = 20): Article[] {
  if (!articles.length) return [];

  return [...articles]
    .filter(article => article.difficulty_level >= 1 && article.difficulty_level <= 3)
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
  return shuffledArticles[0] ?? null;
}

/**
 * Gets advanced articles (difficulty level 4-5)
 * @param articles - The articles to sort
 * @param limit - The maximum number of articles to return (default: 20)
 * @returns Advanced articles sorted by difficulty level (highest first)
 */
export function getAdvancedArticles(articles: Article[], limit = 20): Article[] {
  if (!articles.length) return [];

  return [...articles]
    .filter(article => article.difficulty_level >= 4 && article.difficulty_level <= 5)
    .sort((a, b) => b.difficulty_level - a.difficulty_level)
    .slice(0, limit);
}

/**
 * Gets articles sorted by due words count - articles with more due words are prioritized
 * @param articles - The articles to sort
 * @param dueWords - The user's due words (from studyWordsFSRSService)
 * @param limit - The maximum number of articles to return (default: 10)
 * @returns Articles sorted by due words count (highest first)
 */
export function getArticlesByDueWords(
  articles: Article[],
  dueWords: StudyWord[],
  limit = 10
): Article[] {
  if (!articles.length || !dueWords.length) return [];

  // Get the root IDs of due words
  const dueWordRootIds = new Set(dueWords.map(word => word.root_id));

  // Count unique due words in each article
  const articlesWithDueWordCount = articles.map(article => {
    // Use a set to track unique root IDs in this article
    const uniqueDueRootIds = new Set<number>();

    // Check each sentence in the article
    article.article_sentences?.forEach(sentence => {
      // Check each word in the sentence
      sentence.sentence_words?.forEach(word => {
        // If the word's root is in the due words set, add it to our unique set
        if (word.root_id && dueWordRootIds.has(word.root_id)) {
          uniqueDueRootIds.add(word.root_id);
        }
      });
    });

    // Return the count of unique root IDs
    return { article, dueWordCount: uniqueDueRootIds.size };
  });

  // Filter articles that actually have due words
  const articlesWithDueWords = articlesWithDueWordCount.filter(item => item.dueWordCount > 0);

  // Sort by due word count (highest first)
  return articlesWithDueWords
    .sort((a, b) => b.dueWordCount - a.dueWordCount)
    .map(item => item.article)
    .slice(0, limit);
}
