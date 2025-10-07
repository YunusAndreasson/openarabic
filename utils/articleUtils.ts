import type { Article } from '@/types/articles.types';
import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';

/**
 * Filters articles by author or category ID
 * @param articles - The articles to filter
 * @param authorId - The author ID to filter by
 * @param categoryId - The category ID to filter by
 * @returns Filtered articles by author or category ID
 */

/**
 * Gets beginner-friendly articles (difficulty level 1-3)
 * @param articles - The articles to sort
 * @param limit - The maximum number of articles to return (default: 20)
 * @returns Beginner-friendly articles sorted by difficulty level (lowest first)
 */
export function getBeginnerArticles(articles: Article[], limit = 20): Article[] {
  if (!articles.length) return [];

  return articles
    .filter(article => article.difficulty_level >= 1 && article.difficulty_level <= 3)
    .sort((a, b) => a.difficulty_level - b.difficulty_level)
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
    const uniqueDueRootIds = new Set<RootId>();

    // Check each sentence in the article
    article.article_sentences?.forEach(sentence => {
      // Iterate through all sentence words
      sentence.sentence_words?.forEach(word => {
        const rootId: RootId | undefined = word?.root_id;
        if (rootId && dueWordRootIds.has(rootId)) {
          uniqueDueRootIds.add(rootId);
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

/**
 * Gets articles sorted by difficult words count - articles with more difficult words are prioritized
 * @param articles - The articles to sort
 * @param difficultWords - The user's difficult words (from strugglingWordsService)
 * @param limit - The maximum number of articles to return (default: 10)
 * @returns Articles sorted by difficult words count (highest first)
 */
export function getArticlesByDifficultWords(
  articles: Article[],
  difficultWords: StudyWord[],
  limit = 10
): Article[] {
  if (!articles.length || !difficultWords.length) return [];

  // Get the root IDs of difficult words
  const difficultWordRootIds = new Set(difficultWords.map(word => word.root_id));

  // Count unique difficult words in each article
  const articlesWithDifficultWordCount = articles.map(article => {
    // Use a set to track unique root IDs in this article
    const uniqueDifficultRootIds = new Set<RootId>();

    // Check each sentence in the article
    article.article_sentences?.forEach(sentence => {
      // Iterate through all sentence words
      sentence.sentence_words?.forEach(word => {
        const rootId: RootId | undefined = word?.root_id;
        if (rootId && difficultWordRootIds.has(rootId)) {
          uniqueDifficultRootIds.add(rootId);
        }
      });
    });

    // Return the count of unique root IDs
    return { article, difficultWordCount: uniqueDifficultRootIds.size };
  });

  // Filter articles that actually have difficult words
  const articlesWithDifficultWords = articlesWithDifficultWordCount.filter(
    item => item.difficultWordCount > 0
  );

  // Sort by difficult word count (highest first)
  return articlesWithDifficultWords
    .sort((a, b) => b.difficultWordCount - a.difficultWordCount)
    .map(item => item.article)
    .slice(0, limit);
}

/**
 * Calculate filter date based on date range
 */
export function calculateFilterDate(dateRange: 'week' | 'month' | 'all'): Date | null {
  if (dateRange === 'all') return null;
  const date = new Date();
  if (dateRange === 'week') {
    date.setDate(date.getDate() - 7);
  } else if (dateRange === 'month') {
    date.setDate(date.getDate() - 30);
  }
  return date;
}

/**
 * Filter articles based on filter criteria
 */
export function filterArticles(
  articles: Article[],
  filters: {
    authorIds: number[];
    difficultyRange: [number, number];
    dateRange: 'week' | 'month' | 'all';
  },
  filterDate: Date | null
): Article[] {
  if (!articles?.length) return [];

  return articles.filter(article => {
    // Filter by authors
    if (
      filters.authorIds.length > 0 &&
      (!article.author || !filters.authorIds.includes(article.author.id))
    ) {
      return false;
    }

    // Filter by difficulty range
    if (
      (filters.difficultyRange[0] > 1 || filters.difficultyRange[1] < 5) &&
      (article.difficulty_level < filters.difficultyRange[0] ||
        article.difficulty_level > filters.difficultyRange[1])
    ) {
      return false;
    }

    // Filter by date range
    if (filterDate && new Date(article.created_at) < filterDate) {
      return false;
    }

    return true;
  });
}

/**
 * Sort articles by progress: articles with progress (partially read) first,
 * then articles with no progress, then articles with full progress (completed)
 */
export function sortArticlesByProgress(
  articles: Article[],
  progressMap: Map<number, { progress_percentage: number | null }>
): Article[] {
  return [...articles].sort((a, b) => {
    // Handle null explicitly - treat as 0 (no progress)
    // null indicates database corruption or calculation error, treat same as "not started"
    const progressA = progressMap.get(a.id)?.progress_percentage ?? 0;
    const progressB = progressMap.get(b.id)?.progress_percentage ?? 0;

    // Articles with partial progress (1-99%) come first
    const aHasPartialProgress = progressA > 0 && progressA < 100;
    const bHasPartialProgress = progressB > 0 && progressB < 100;

    if (aHasPartialProgress && !bHasPartialProgress) return -1;
    if (!aHasPartialProgress && bHasPartialProgress) return 1;

    // Articles with no progress come second (includes null, 0, or no entry)
    const aHasNoProgress = progressA === 0;
    const bHasNoProgress = progressB === 0;

    if (aHasNoProgress && !bHasNoProgress) return -1;
    if (!aHasNoProgress && bHasNoProgress) return 1;

    // Articles with full progress (100%) come last
    const aIsCompleted = progressA === 100;
    const bIsCompleted = progressB === 100;

    if (aIsCompleted && !bIsCompleted) return 1;
    if (!aIsCompleted && bIsCompleted) return -1;

    // If both articles are in the same category, sort by progress percentage (descending)
    return progressB - progressA;
  });
}
