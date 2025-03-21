import { useCallback } from 'react';
import { router } from 'expo-router';
import { useNavigationWithDebounce } from './useNavigationWithDebounce';
import { Platform } from 'react-native';

// Types
import type { Tables } from '@/types/database.types';
import type { Article } from '@/types/articles.types';

// Helper function to enhance word data
const enhanceWord = (word: Tables<'sentence_words'>) => ({
  ...word,
  root: null,
  word_type: null,
});

/**
 * Hook for article rendering functions
 * @param settings - App settings
 * @param colors - Theme colors
 * @param selectedWordIds - Set of selected word IDs
 * @param sentenceWordsMap - Map of sentence IDs to words
 * @param handleWordPress - Function to handle word press
 * @returns Object with rendering functions
 */
export const useArticleRenderers = (
  settings: any,
  colors: Record<string, string>,
  selectedWordIds: Set<number>,
  sentenceWordsMap: Map<number, Tables<'sentence_words'>[]>,
  handleWordPress: (word: Tables<'sentence_words'>) => void
) => {
  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

  // Prepare word for rendering
  const prepareWord = useCallback(
    (word: Tables<'sentence_words'>) => {
      const enhancedWord = enhanceWord(word);
      const isSelected = selectedWordIds.has(word.id);
      return {
        word: enhancedWord,
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
   * @param articleId - ID of the article to navigate to
   * @param isRelatedArticle - Whether this is a navigation between related articles
   */
  const handleArticlePress = useCallback(
    (articleId: number, isRelatedArticle = false) => {
      // For all article navigation, use a simple approach without transitions
      // This is more stable and less likely to cause crashes
      try {
        // Use replace for related articles to avoid building up the navigation stack
        if (isRelatedArticle) {
          // @ts-ignore - Using router.replace directly for maximum stability
          router.replace({
            pathname: '/article/[id]',
            params: {
              id: articleId.toString(),
            },
          });
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

  return {
    prepareWord,
    enhanceWord,
    handleArticlePress,
    getWordsForSentence: (sentenceId: number) => sentenceWordsMap.get(sentenceId) || [],
  };
};

export default useArticleRenderers;
