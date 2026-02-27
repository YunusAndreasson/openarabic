import type { FlashListRef } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import type { LayoutRectangle } from 'react-native';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ArticleSentence,
  WordDetailsBottomSheet,
  WordTooltip,
  ArticleContent,
} from '@/components/article';
import { ToastProvider, useTutorialContext, useToast } from '@/components/providers';
import { PulsatingLoader } from '@/components/ui';
import { TutorialId } from '@/constants/tutorials';
import { useArticleScreen } from '@/hooks/articles/useArticleScreen';
import { useColors } from '@/hooks/theme/useColors';
import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';

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
  const params = useLocalSearchParams<{ disableAutoScroll?: string }>();
  const disableAutoScroll = params.disableAutoScroll === 'true';

  // Extract all business logic into hook
  const {
    isLoadingArticle,
    article,
    sortedSentences,
    sentenceWordsMap,
    isInReadingList,
    scrollViewRef,
    activeTooltip,
    wordDetailsModal,
    isInStudyList,
    wordDetailsEnabled,
    handleScroll,
    handleViewableItemsChanged,
    handleScrollEnd,
    handleEndReached,
    handleRelatedArticlesVisible,
    handleToggleReadingListWithFeedback,
    handleClose,
    handleWordPress,
    handleCloseTooltip,
    handleOpenWordDetails,
    handleAddWordToStudy,
    handleFlashListLoad,
  } = useArticleScreen({ id, showToast, disableAutoScroll });

  // Tutorial management
  const { shouldShowTutorial, completeTutorial } = useTutorialContext();

  // Freeze tutorial state on mount - keep showing card even after completing
  const showWordTapTutorialRef = useRef(shouldShowTutorial(TutorialId.WORD_TAP));
  const showWordTapTutorial = showWordTapTutorialRef.current;

  // Track if user manually dismissed the tutorial card
  const [isTutorialCardDismissed, setIsTutorialCardDismissed] = useState(false);

  // Handle tutorial card dismissal
  const handleDismissTutorial = useCallback(() => {
    setIsTutorialCardDismissed(true);
    completeTutorial(TutorialId.WORD_TAP);
  }, [completeTutorial]);

  // Wrap word press handler to complete tutorial when ANY word is tapped
  const handleWordPressWithTutorial = useCallback(
    (word: SentenceWord, layout?: LayoutRectangle) => {
      // Call original handler
      handleWordPress(word, layout);

      // Complete tutorial (marks as done for next time, but keeps showing this time)
      if (showWordTapTutorial) {
        completeTutorial(TutorialId.WORD_TAP);
      }
    },
    [showWordTapTutorial, completeTutorial, handleWordPress],
  );

  // Memoize settings object to prevent recreation on every sentence
  // Always show English alongside Arabic
  const settings = useMemo(() => ({ showEnglish: true }), []);

  // Memoize renderSentenceItem to prevent unnecessary recreations
  const renderSentenceItem = useCallback(
    ({ item, index }: { item: Tables<'article_sentences'>; index: number }) => {
      const words = sentenceWordsMap.get(item.id) ?? [];

      if (!words || words.length === 0) {
        return null;
      }

      // Show tutorial card only on first sentence (unless manually dismissed)
      const isFirstSentence = index === 0;
      const showTutorialCard = isFirstSentence && showWordTapTutorial && !isTutorialCardDismissed;

      return (
        <ArticleSentence
          key={item.id}
          sentence={item}
          words={words}
          settings={settings}
          colors={colors}
          onWordPress={handleWordPressWithTutorial}
          showTutorialCard={showTutorialCard}
          onDismissTutorial={handleDismissTutorial}
          activeWordId={activeTooltip?.word.id}
        />
      );
    },
    [
      sentenceWordsMap,
      colors,
      handleWordPressWithTutorial,
      settings,
      showWordTapTutorial,
      isTutorialCardDismissed,
      handleDismissTutorial,
      activeTooltip?.word.id,
    ],
  );

  const tooltipProps = useMemo(
    () => ({
      visible: !!activeTooltip,
      text: activeTooltip?.word.english,
      arabicWord: activeTooltip?.word.word_form,
      layout: activeTooltip?.layout ?? null,
      onClose: handleCloseTooltip,
      onOpenWordDetails: handleOpenWordDetails,
      showWordDetails: wordDetailsEnabled,
    }),
    [activeTooltip, handleCloseTooltip, handleOpenWordDetails, wordDetailsEnabled],
  );

  // Only create articleContentProps when article is defined to avoid TypeScript errors
  const articleContentProps = useMemo(() => {
    if (!article) return null;

    return {
      article,
      sortedSentences,
      renderSentenceItem,
      handleScroll,
      handleViewableItemsChanged,
      handleScrollEnd,
      handleEndReached,
      handleRelatedArticlesVisible,
      colors,
      scrollViewRef: scrollViewRef as React.RefObject<FlashListRef<Tables<'article_sentences'>>>,
      isInReadingList,
      onToggleReadingList: handleToggleReadingListWithFeedback,
      showEnglish: true,
      onClose: handleClose,
      onFlashListLoad: handleFlashListLoad,
    };
  }, [
    article,
    sortedSentences,
    renderSentenceItem,
    handleScroll,
    handleViewableItemsChanged,
    handleScrollEnd,
    handleEndReached,
    handleRelatedArticlesVisible,
    colors,
    scrollViewRef,
    isInReadingList,
    handleToggleReadingListWithFeedback,
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

ArticleScreenContent.displayName = 'ArticleScreenContent';

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
