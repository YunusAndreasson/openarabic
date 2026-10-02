import { COMPLETION_THRESHOLD } from '@/constants/layout';
import type { Article } from '@/types/articles.types';
import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { getArticleProgressPercentage, type ReadingProgressLookup } from '@/utils/progressUtils';
import { generateStorageUrl } from '@/utils/storageUtils';

/**
 * Common props extracted from an Article for use with ArticleCard component.
 * This eliminates repetitive prop mapping across multiple components.
 */
export interface ArticleCardBaseProps {
  imageUrl: string;
  summary: string;
  title: string;
}

/**
 * Builds the common props for ArticleCard from an Article object.
 * Eliminates duplicated prop mapping across FeaturedSection, HorizontalArticleSlider, etc.
 *
 * @param article - The article to extract props from
 * @returns Common props ready to spread into ArticleCard
 *
 * @example
 * ```tsx
 * <ArticleCard
 *   article={article}
 *   {...buildArticleCardProps(article)}
 * />
 * ```
 */
export function buildArticleCardProps(article: Article): ArticleCardBaseProps {
  return {
    imageUrl: generateStorageUrl('images', article.image_url),
    summary: String(article.summary),
    title: article.title,
  };
}

/**
 * Keep the first article for each non-empty image URL. Articles without an
 * image remain distinct because there is no visual asset to collide on.
 */
export function deduplicateArticlesByImage(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter(article => {
    if (!article.image_url) return true;
    if (seen.has(article.image_url)) return false;
    seen.add(article.image_url);
    return true;
  });
}

/**
 * Helper function to shuffle array and return first N items using Fisher-Yates algorithm
 * @param items - The array to shuffle
 * @param count - The number of items to return
 * @returns Randomly selected items from the array
 */
export function getRandomItems<T>(items: T[], count: number): T[] {
  if (items.length <= count) return [...items];

  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    const other = shuffled[j];
    if (temp !== undefined && other !== undefined) {
      shuffled[i] = other;
      shuffled[j] = temp;
    }
  }

  return shuffled.slice(0, count);
}

/**
 * Gets beginner-friendly articles (difficulty level 1-3) with variety
 * Prioritizes longer articles and ensures a mix of different authors
 * @param articles - The articles to sort
 * @param limit - The maximum number of articles to return (default: 20)
 * @returns Beginner-friendly articles with author diversity
 */
export function getBeginnerArticles(articles: Article[], limit = 20): Article[] {
  if (!articles.length) return [];

  // Filter beginner articles (difficulty 1-3)
  const beginnerArticles = articles.filter(
    article => article.difficulty_level >= 1 && article.difficulty_level <= 3,
  );

  if (beginnerArticles.length === 0) return [];

  // Sort by length (longer articles first, using sentence count)
  const sortedByLength = [...beginnerArticles].sort(
    (a, b) => b.article_sentences.length - a.article_sentences.length,
  );

  // Select articles with author diversity
  const result: Article[] = [];
  const usedAuthorIds = new Set<number>();

  // First pass: pick one article per author (longest available)
  for (const article of sortedByLength) {
    if (result.length >= limit) break;
    if (!usedAuthorIds.has(article.author.id)) {
      result.push(article);
      usedAuthorIds.add(article.author.id);
    }
  }

  // Second pass: fill remaining slots with longest articles not yet selected
  if (result.length < limit) {
    const selectedIds = new Set(result.map(a => a.id));
    for (const article of sortedByLength) {
      if (result.length >= limit) break;
      if (!selectedIds.has(article.id)) {
        result.push(article);
      }
    }
  }

  return result;
}

export interface StarterArticlePick {
  article: Article;
  progress: number;
}

/**
 * Each article's progress percentage, computed once so a sort or a filter over
 * the list reads it instead of recomputing per comparison.
 */
function buildProgressCache(
  articles: Article[],
  progressMap: ReadingProgressLookup,
): Map<number, number> {
  const progressCache = new Map<number, number>();
  for (const article of articles) {
    progressCache.set(article.id, getArticleProgressPercentage(progressMap, article.id));
  }
  return progressCache;
}

/**
 * Pick "start here" articles for a fresh (or nearly fresh) user.
 * Guaranteed non-empty whenever `articles` is non-empty via a fallback cascade:
 * 1. unread beginner articles (difficulty ≤ 2)
 * 2. unread easy articles (difficulty ≤ 3)
 * 3. any unread article, shortest first
 * 4. all articles, least progress first
 *
 * Used by the Getting Started rail, the welcome intro CTA, and the
 * Get Started checklist so they always have somewhere to send the user.
 */
export function pickStarterArticles(
  articles: Article[],
  progressMap: ReadingProgressLookup,
  max = 5,
): StarterArticlePick[] {
  if (articles.length === 0) return [];

  const progressCache = buildProgressCache(articles, progressMap);

  const unread = articles.filter(article => (progressCache.get(article.id) ?? 0) === 0);

  const tiers: Article[][] = [
    unread.filter(article => article.difficulty_level <= 2),
    unread.filter(article => article.difficulty_level <= 3),
    [...unread].sort((a, b) => a.article_sentences.length - b.article_sentences.length),
    [...articles].sort((a, b) => (progressCache.get(a.id) ?? 0) - (progressCache.get(b.id) ?? 0)),
  ];

  const picked = tiers.find(tier => tier.length > 0) ?? [];
  return picked.slice(0, max).map(article => ({
    article,
    progress: progressCache.get(article.id) ?? 0,
  }));
}

/**
 * First starter article, or undefined when the catalog is empty.
 */
export function pickStarterArticle(
  articles: Article[],
  progressMap: ReadingProgressLookup,
): Article | undefined {
  return pickStarterArticles(articles, progressMap, 1)[0]?.article;
}

/**
 * Build an index of article IDs to their root IDs for efficient lookups.
 * This avoids O(articles × sentences × words) nested loops during filtering.
 */
function buildArticleRootIdIndex(articles: Article[]): Map<number, Set<RootId>> {
  const index = new Map<number, Set<RootId>>();
  for (const article of articles) {
    const rootIds = new Set<RootId>();
    article.article_sentences.forEach(sentence => {
      sentence.sentence_words?.forEach(word => {
        if (word.root_id) {
          rootIds.add(word.root_id);
        }
      });
    });
    index.set(article.id, rootIds);
  }
  return index;
}

/**
 * Generic function to filter articles by a set of word root IDs
 * @param articles - The articles to filter and sort
 * @param wordRootIds - Set of root IDs to match against
 * @param limit - The maximum number of articles to return
 * @returns Articles sorted by matching word count (highest first)
 */
function filterArticlesByWordSet(
  articles: Article[],
  wordRootIds: Set<RootId>,
  limit: number,
): Article[] {
  // Build index once: O(articles × sentences × words)
  const articleRootIdIndex = buildArticleRootIdIndex(articles);

  // Count matching words per article: O(articles × unique_roots_per_article)
  const articlesWithWordCount = articles.map(article => {
    const articleRootIds = articleRootIdIndex.get(article.id);
    if (!articleRootIds) {
      return { article, wordCount: 0 };
    }

    // Count matching root IDs using Set intersection
    let matchCount = 0;
    for (const rootId of articleRootIds) {
      if (wordRootIds.has(rootId)) {
        matchCount++;
      }
    }

    return { article, wordCount: matchCount };
  });

  // Filter articles that actually have matching words
  const articlesWithWords = articlesWithWordCount.filter(item => item.wordCount > 0);

  // Sort by word count (highest first) and limit results
  return articlesWithWords
    .sort((a, b) => b.wordCount - a.wordCount)
    .map(item => item.article)
    .slice(0, limit);
}

/**
 * Articles in which at least one word belongs to the given set of roots, in
 * their original order. Use {@link getArticlesByDueWords} to rank by overlap.
 */
export function filterArticlesContainingRoots(
  articles: Article[],
  rootIds: ReadonlySet<number>,
): Article[] {
  return articles.filter(article =>
    article.article_sentences.some(sentence =>
      sentence.sentence_words?.some(word => rootIds.has(word.root_id)),
    ),
  );
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
  limit = 10,
): Article[] {
  if (!articles.length || !dueWords.length) return [];

  // Get the root IDs of due words
  const dueWordRootIds = new Set(dueWords.map(word => word.root_id));

  return filterArticlesByWordSet(articles, dueWordRootIds, limit);
}

/**
 * Sort articles by progress: articles with progress (partially read) first,
 * then articles with no progress, then articles with full progress (completed)
 */
export function sortArticlesByProgress(
  articles: Article[],
  progressMap: ReadingProgressLookup,
): Article[] {
  const progressCache = buildProgressCache(articles, progressMap);

  return [...articles].sort((a, b) => {
    // Use cached progress values
    const progressA = progressCache.get(a.id) ?? 0;
    const progressB = progressCache.get(b.id) ?? 0;

    // Articles with partial progress (1-94%) come first
    const aHasPartialProgress = progressA > 0 && progressA < COMPLETION_THRESHOLD;
    const bHasPartialProgress = progressB > 0 && progressB < COMPLETION_THRESHOLD;

    if (aHasPartialProgress && !bHasPartialProgress) return -1;
    if (!aHasPartialProgress && bHasPartialProgress) return 1;

    // Articles with no progress come second (includes null, 0, or no entry)
    const aHasNoProgress = progressA === 0;
    const bHasNoProgress = progressB === 0;

    if (aHasNoProgress && !bHasNoProgress) return -1;
    if (!aHasNoProgress && bHasNoProgress) return 1;

    // Articles with >=95% progress are considered completed and come last
    const aIsCompleted = progressA >= COMPLETION_THRESHOLD;
    const bIsCompleted = progressB >= COMPLETION_THRESHOLD;

    if (aIsCompleted && !bIsCompleted) return 1;
    if (!aIsCompleted && bIsCompleted) return -1;

    // If both articles are in the same category, sort by progress percentage (descending)
    return progressB - progressA;
  });
}
