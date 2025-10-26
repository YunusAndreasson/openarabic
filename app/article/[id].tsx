import type { FlashListRef } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArticleSentence, WordDetailsBottomSheet, WordTooltip } from '@/components/article';
import { ArticleContent } from '@/components/article/ArticleContent';
import { ToastProvider, useToast } from '@/components/providers';
import { PulsatingLoader } from '@/components/ui/PulsatingLoader';
import { useArticleScreen } from '@/hooks/articles/useArticleScreen';
import { useColors } from '@/hooks/theme/useColors';
import type { Tables } from '@/types/database.types';

// Static constants to prevent recreation
const FLEX_ONE_STYLE = { flex: 1 } as const;

// Static styles for loading container
const LOADING_CONTAINER_STYLE = {
  flex: 1,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
} as const;

// Custom comparison function for React.memo optimization
const ArticleScreenContentComparison = (
  prevProps: { id: string },
  nextProps: { id: string },
): boolean => {
  return prevProps.id === nextProps.id;
};

// Inner component with toast context access - optimized with React.memo
const ArticleScreenContent = memo(({ id }: { id: string }) => {
  const colors = useColors();
  const { showToast } = useToast();

  // Extract all business logic into hook
  const {
    isLoadingArticle,
    article,
    sortedSentences,
    sentenceWordsMap,
    showEnglish,
    isOverridden,
    isInReadingList,
    hasAudio,
    isPlaying,
    currentSentenceIndex: _currentSentenceIndex,
    scrollViewRef,
    activeTooltip,
    wordDetailsModal,
    isInStudyList,
    handleScroll,
    handleViewableItemsChanged,
    handleToggleReadingListWithFeedback,
    handleToggleLanguageWithFeedback,
    handlePlayPress,
    handleClose,
    handleWordPress,
    handleCloseTooltip,
    handleOpenWordDetails,
    handleAddWordToStudy,
    handleFlashListLoad,
  } = useArticleScreen({ id, showToast });

  // Memoize settings object to prevent recreation on every sentence
  const settings = useMemo(() => ({ showEnglish }), [showEnglish]);

  // Memoize renderSentenceItem to prevent unnecessary recreations
  const renderSentenceItem = useCallback(
    ({ item }: { item: Tables<'article_sentences'> }) => {
      const words = sentenceWordsMap.get(item.id) ?? [];

      if (!words || words.length === 0) {
        return null;
      }

      return (
        <ArticleSentence
          key={item.id}
          sentence={item}
          words={words}
          settings={settings}
          colors={colors}
          onWordPress={handleWordPress}
        />
      );
    },
    [sentenceWordsMap, colors, handleWordPress, settings],
  );

  const tooltipProps = useMemo(
    () => ({
      visible: !!activeTooltip,
      text: activeTooltip?.word.english,
      arabicWord: activeTooltip?.word.word_form,
      layout: activeTooltip?.layout ?? null,
      onClose: handleCloseTooltip,
      onOpenWordDetails: handleOpenWordDetails,
    }),
    [activeTooltip, handleCloseTooltip, handleOpenWordDetails],
  );

  // Only create articleContentProps when article is defined to avoid TypeScript errors
  const articleContentProps = useMemo(() => {
    if (!article) return null;

    return {
      id,
      article,
      sortedSentences,
      renderSentenceItem,
      handleScroll,
      handleViewableItemsChanged,
      colors,
      scrollViewRef: scrollViewRef as React.RefObject<FlashListRef<Tables<'article_sentences'>>>,
      isInReadingList,
      onToggleReadingList: handleToggleReadingListWithFeedback,
      hasAudio,
      isPlaying,
      onPlayPress: handlePlayPress,
      showEnglish,
      onToggleLanguage: handleToggleLanguageWithFeedback,
      isLanguageOverridden: isOverridden,
      onClose: handleClose,
      onFlashListLoad: handleFlashListLoad,
    };
  }, [
    article,
    id,
    sortedSentences,
    renderSentenceItem,
    handleScroll,
    handleViewableItemsChanged,
    colors,
    scrollViewRef,
    isInReadingList,
    handleToggleReadingListWithFeedback,
    hasAudio,
    isPlaying,
    handlePlayPress,
    showEnglish,
    handleToggleLanguageWithFeedback,
    isOverridden,
    handleClose,
    handleFlashListLoad,
  ]);

  // Show loader while article is loading
  if (isLoadingArticle) {
    return (
      <View style={LOADING_CONTAINER_STYLE}>
        <PulsatingLoader size={64} />
      </View>
    );
  }

  return (
    <>
      {articleContentProps ? <ArticleContent {...articleContentProps} /> : null}

      {/* Removed mini-player for article modal */}

      <WordTooltip {...tooltipProps} />

      <WordDetailsBottomSheet
        isVisible={wordDetailsModal.isVisible}
        onClose={wordDetailsModal.close}
        word={wordDetailsModal.data}
        onAddToStudy={handleAddWordToStudy}
        isInStudyList={isInStudyList}
      />
    </>
  );
}, ArticleScreenContentComparison);

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();

  const containerStyle = [FLEX_ONE_STYLE, { backgroundColor: colors.background }];

  return (
    <ToastProvider>
      <SafeAreaView style={containerStyle} edges={['top']}>
        <ArticleScreenContent id={id ?? ''} />
      </SafeAreaView>
    </ToastProvider>
  );
}
