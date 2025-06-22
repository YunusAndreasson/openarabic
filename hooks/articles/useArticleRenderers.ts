import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { getArticleRoute } from '@/constants/routes';
import type { Article } from '@/types/articles.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

type SentenceWordsMap = Map<number, SentenceWord[]>;

interface ArticleSettings {
  fontScale: number;
}

/**
 * Hook for article rendering functions
 * @param settings - App settings
 * @param selectedWordIds - Set of selected word IDs (can be number or string)
 * @param sentenceWordsMap - Map of sentence IDs to words
 * @param handleWordPress - Function to handle word press
 * @param handleRootPress - Function to handle root press (unused but kept for compatibility)
 * @returns Object with rendering functions
 */
export const useArticleRenderers = (
  _settings: ArticleSettings,
  _selectedWordIds: Set<number> | undefined,
  sentenceWordsMap: SentenceWordsMap,
  _handleWordPress: (word: SentenceWord) => void,
  _handleRootPress?: (rootId: number) => void
): {
  handleArticlePress: (articleOrId: Article | number, isRelatedArticle?: boolean) => void;
  getWordsForSentence: (sentenceId: number) => SentenceWord[];
} => {
  const router = useRouter();

  /**
   * Navigate to an article with debounce protection and smooth transition
   * @param articleOrId - Article object or ID of the article to navigate to
   * @param isRelatedArticle - Whether this is a navigation between related articles
   */
  const handleArticlePress = useCallback(
    (articleOrId: Article | number, isRelatedArticle = false) => {
      // Extract article ID and title whether an Article object or just an ID was passed
      const articleId = typeof articleOrId === 'number' ? articleOrId : articleOrId.id;
      const articleTitle = typeof articleOrId === 'number' ? undefined : articleOrId.title;

      const url = getArticleRoute(articleId, articleTitle);

      try {
        // Use replace for related articles to avoid building up the navigation stack
        if (isRelatedArticle) {
          router.replace(url);
        } else {
          // For normal navigation, use push
          router.push(url);
        }
      } catch (error: unknown) {
        // Ensure error is properly typed before handling
        const errorMessage = error instanceof Error ? error : new Error(String(error));
        handleError(errorMessage);
        // Fallback to most basic navigation if all else fails
        router.push(getArticleRoute(articleId));
      }
    },
    [router]
  );

  // Get words for a sentence - memoize the map lookup function
  const getWordsForSentence = useCallback(
    (sentenceId: number) => {
      return sentenceWordsMap.get(sentenceId) ?? [];
    },
    [sentenceWordsMap]
  );

  // Return memoized object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      handleArticlePress,
      getWordsForSentence,
    }),
    [handleArticlePress, getWordsForSentence]
  );
};

export default useArticleRenderers;
