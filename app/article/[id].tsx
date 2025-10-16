import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ArticleSentence,
  SentenceScrubber,
  WordDetailsBottomSheet,
  WordTooltip,
} from '@/components/article';
import { ArticleContent } from '@/components/article/ArticleContent';
import { ToastProvider, useToast } from '@/components/providers';
import PulsatingLoader from '@/components/ui/PulsatingLoader';
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
  nextProps: { id: string }
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
    currentSentenceIndex,
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
    handleSentenceChange,
    handleScrubStart,
    handleScrubEnd,
  } = useArticleScreen({ id, showToast });

  // Memoize renderSentenceItem to prevent unnecessary recreations
  const renderSentenceItem = useCallback(
    ({ item }: { item: Tables<'article_sentences'> }) => {
      const words = sentenceWordsMap.get(item.id) ?? [];

      if (!words || words.length === 0) {
        return <React.Fragment />;
      }

      return (
        <ArticleSentence
          key={item.id}
          sentence={item}
          words={words}
          settings={{
            showEnglish,
          }}
          colors={colors}
          onWordPress={handleWordPress}
        />
      );
    },
    [sentenceWordsMap, colors, handleWordPress, showEnglish]
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
    [activeTooltip, handleCloseTooltip, handleOpenWordDetails]
  );

  const sentenceScrubberProps = useMemo(
    () => ({
      currentSentence: currentSentenceIndex,
      totalSentences: sortedSentences?.length ?? 0,
      onSentenceChange: handleSentenceChange,
      onScrubStart: handleScrubStart,
      onScrubEnd: handleScrubEnd,
    }),
    [
      currentSentenceIndex,
      sortedSentences?.length,
      handleSentenceChange,
      handleScrubStart,
      handleScrubEnd,
    ]
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
      scrollViewRef: scrollViewRef as React.RefObject<any>,
      isInReadingList,
      onToggleReadingList: handleToggleReadingListWithFeedback,
      hasAudio,
      isPlaying,
      onPlayPress: handlePlayPress,
      showEnglish,
      onToggleLanguage: handleToggleLanguageWithFeedback,
      isLanguageOverridden: isOverridden,
      onClose: handleClose,
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

      {/* Scrubber moved out of ArticleContent to avoid ArticleContent rerenders */}
      {!wordDetailsModal.isVisible && <SentenceScrubber {...sentenceScrubberProps} />}
    </>
  );
}, ArticleScreenContentComparison);

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();

  const Container = Platform.OS === 'android' ? SafeAreaView : View;
  const containerProps =
    Platform.OS === 'android'
      ? ({
          style: [FLEX_ONE_STYLE, { backgroundColor: colors.background }],
          edges: ['top'] as const,
        } as const)
      : ({ style: [FLEX_ONE_STYLE, { backgroundColor: colors.background }] } as const);

  return (
    <ToastProvider>
      <Container {...(containerProps as any)}>
        <ArticleScreenContent id={id ?? ''} />
      </Container>
    </ToastProvider>
  );
}
