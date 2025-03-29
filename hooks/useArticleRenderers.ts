import { useCallback } from 'react';
import { router } from 'expo-router';
import { useNavigationWithDebounce } from './useNavigationWithDebounce';

// Types
import type { Article } from '@/types/articles.types';
import type { SentenceWord } from '@/types/vocabulary.types';

/**
 * Hook for article rendering functions
 * @param settings - App settings
 * @param _colors - Theme colors
 * @param selectedWordIds - Set of selected word IDs (can be number or string)
 * @param sentenceWordsMap - Map of sentence IDs to words
 * @param handleWordPress - Function to handle word press
 * @returns Object with rendering functions
 */
export const useArticleRenderers = (
  settings: {
    fontScale: number;
    showEnglish: boolean;
  },
  _colors: Record<string, string>,
  selectedWordIds: Set<number | string>,
  sentenceWordsMap: Map<number, SentenceWord[]>,
  handleWordPress: (word: SentenceWord) => void
) => {
  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

  // Prepare word for rendering
  const prepareWord = useCallback(
    (word: SentenceWord) => {
      // Extract the word ID as both number and string representations for checking
      const wordId = word.id;
      const stringWordId = String(wordId);

      // Check both number and string formats to ensure robust matching
      const isSelected =
        selectedWordIds.has(wordId) ||
        selectedWordIds.has(Number(wordId)) ||
        (typeof wordId === 'number' && selectedWordIds.has(stringWordId));

      return {
        word,
        isSelected,
        key: word.id,
        onPress: handleWordPress,
        scale: settings.fontScale,
        baseSize: 24,
      };
    },
    [handleWordPress, selectedWordIds, settings.fontScale]
  );

  /**
   * Navigate to an article with debounce protection and smooth transition
   * @param articleOrId - Article object or ID of the article to navigate to
   * @param isRelatedArticle - Whether this is a navigation between related articles
   */
  const handleArticlePress = useCallback(
    (articleOrId: Article | number, isRelatedArticle = false) => {
      // Extract article ID whether an Article object or just an ID was passed
      const articleId = typeof articleOrId === 'number' ? articleOrId : articleOrId.id;

      // For all article navigation, use a simple approach without transitions
      // This is more stable and less likely to cause crashes
      try {
        // Use replace for related articles to avoid building up the navigation stack
        if (isRelatedArticle) {
          router.replace({
            pathname: '/article/[id]',
            params: {
              id: articleId.toString(),
            },
          } as any); // Cast to any to fix type issue temporarily
        } else {
          // For normal navigation, use the debounce hook
          navigateTo({
            pathname: '/article/[id]',
            params: { id: articleId.toString() },
          });
        }
      } catch (error) {
        // Fallback to most basic navigation if all else fails
        router.push(`/article/${articleId}`);
      }
    },
    [navigateTo]
  );

  // Memoize getWordsForSentence to prevent recreation on every render
  const getWordsForSentence = useCallback(
    (sentenceId: number): SentenceWord[] => sentenceWordsMap.get(sentenceId) || [],
    [sentenceWordsMap]
  );

  return {
    prepareWord,
    handleArticlePress,
    getWordsForSentence,
  };
};

export default useArticleRenderers;
