import type { Article } from '@/types/articles.types';
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
    const uniqueDifficultRootIds = new Set<number>();

    // Check each sentence in the article
    article.article_sentences?.forEach(sentence => {
      // Check each word in the sentence
      sentence.sentence_words?.forEach(word => {
        // If the word's root is in the difficult words set, add it to our unique set
        if (word.root_id && difficultWordRootIds.has(word.root_id)) {
          uniqueDifficultRootIds.add(word.root_id);
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

