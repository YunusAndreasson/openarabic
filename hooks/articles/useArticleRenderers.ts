import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

import type { Article } from '@/types/articles.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

import { useNavigationWithDebounce } from '../navigation/useNavigationWithDebounce';

type SentenceWordsMap = Map<number, SentenceWord[]>;

interface ArticleSettings {
  fontScale: number;
  showEnglish: boolean;
}

/**
 * Hook for article rendering functions
 * @param settings - App settings
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
  const { fontScale } = settings;

  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

  // Prepare word for rendering
  const prepareWord = useCallback(
    (word: SentenceWord) => {
      // Check if the word's root is selected
      const isSelected = word.root_id !== undefined && selectedWordIds?.has(word.root_id) === true;

      // Memoize the long press handler if it exists
      const onLongPress =
        word.root_id && handleRootPress ? () => handleRootPress(word.root_id) : undefined;

      return {
        word,
        isSelected,
        key: word.id,
        scale: fontScale,
        baseSize: 16,
        onPress: () => handleWordPress(word),
        onLongPress,
      };
    },
    [selectedWordIds, handleWordPress, handleRootPress, fontScale]
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
      const params = { id: articleId.toString() };

      try {
        // Use replace for related articles to avoid building up the navigation stack
        if (isRelatedArticle) {
          router.replace({
            pathname: '/(tabs)/read/article/[id]',
            params,
          });
        } else {
          // For normal navigation, use the debounce hook
          navigateTo({
            pathname: '/(tabs)/read/article/[id]',
            params,
          });
        }
      } catch (error: unknown) {
        // Ensure error is properly typed before handling
        const errorMessage = error instanceof Error ? error : new Error(String(error));
        handleError(errorMessage);
        // Fallback to most basic navigation if all else fails
        router.push(`/(tabs)/read/article/${articleId}`);
      }
    },
    [navigateTo, router]
  );

  // Get words for a sentence - memoize the map lookup function
  const getWordsForSentence = useCallback(
    (sentenceId: number) => {
      return sentenceWordsMap.get(sentenceId) || [];
    },
    [sentenceWordsMap]
  );

  // Return memoized object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      prepareWord,
      handleArticlePress,
      getWordsForSentence,
    }),
    [prepareWord, handleArticlePress, getWordsForSentence]
  );
};

export default useArticleRenderers;
