import { useCallback } from 'react';
import { router } from 'expo-router';

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

  // Navigate to an article
  const handleArticlePress = useCallback((articleId: number) => {
    router.push({
      pathname: '/article/[id]',
      params: { id: articleId },
    });
  }, []);

  return {
    prepareWord,
    enhanceWord,
    handleArticlePress,
    getWordsForSentence: (sentenceId: number) => sentenceWordsMap.get(sentenceId) || [],
  };
};

export default useArticleRenderers;
