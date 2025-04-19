import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { Article } from '../types/articles.types';
import type { SentenceWord } from '../types/vocabulary.types';
import { handleError } from '../utils/errorHandling';

import { useNavigationWithDebounce } from './useNavigationWithDebounce';

type SentenceWordsMap = Map<number, SentenceWord[]>;

interface ArticleSettings {
  fontScale: number;
  showEnglish: boolean;
}

/**
 * Hook for article rendering functions
 * @param settings - App settings
 * @param colors - Theme colors
 * @param selectedWordIds - Set of selected word IDs (can be number or string)
 * @param sentenceWordsMap - Map of sentence IDs to words
 * @param handleWordPress - Function to handle word press
 * @param handleRootPress - Function to handle root press
 * @returns Object with rendering functions
 */
export const useArticleRenderers = (
  settings: ArticleSettings,
  selectedWordIds: Set<number> | undefined,
  sentenceWordsMap: SentenceWordsMap,
  handleWordPress: (word: SentenceWord) => void,
  handleRootPress?: (rootId: number) => void
): {
  prepareWord: (word: SentenceWord) => {
    word: SentenceWord;
    isSelected: boolean;
    key: number | string;
    onPress: (word: SentenceWord) => void;
    scale: number;
    baseSize: number;
    onLongPress?: () => void;
  };
  handleArticlePress: (articleOrId: Article | number, isRelatedArticle?: boolean) => void;
  getWordsForSentence: (sentenceId: number) => SentenceWord[];
} => {
  const router = useRouter();

  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

  // Prepare word for rendering
  const prepareWord = useCallback(
    (word: SentenceWord) => {
      // Check if the word's root is selected
      const isSelected = word.root_id !== undefined && selectedWordIds?.has(word.root_id) === true;

      return {
        word,
        isSelected,
        key: word.id,
        scale: settings.fontScale,
        baseSize: 16,
        onPress: () => handleWordPress(word),
        onLongPress:
          handleRootPress && word.root_id ? () => handleRootPress(word.root_id) : undefined,
      };
    },
    [selectedWordIds, handleWordPress, handleRootPress, settings.fontScale]
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
          });
        } else {
          // For normal navigation, use the debounce hook
          navigateTo({
            pathname: '/article/[id]',
            params: { id: articleId.toString() },
          });
        }
      } catch (error: unknown) {
        // Ensure error is properly typed before handling
        const errorMessage = error instanceof Error ? error : new Error(String(error));
        handleError(errorMessage);
        // Fallback to most basic navigation if all else fails
        router.push(`/article/${articleId}`);
      }
    },
    [navigateTo, router]
  );

  // Get words for a sentence
  const getWordsForSentence = useCallback(
    (sentenceId: number) => {
      return sentenceWordsMap.get(sentenceId) || [];
    },
    [sentenceWordsMap]
  );

  return {
    prepareWord,
    handleArticlePress,
    getWordsForSentence,
  };
};

export default useArticleRenderers;
