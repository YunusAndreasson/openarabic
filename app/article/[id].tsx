import type { FlashListRef } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import type { JSX, RefObject } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutRectangle } from 'react-native';
import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ArticleSentence,
  WordDetailsBottomSheet,
  WordTooltip,
  ArticleContent,
} from '@/components/article';
import { AudioErrorBoundary, GlobalMiniPlayer } from '@/components/audio';
import { LoadingState } from '@/components/common';
import { ComponentErrorBoundary } from '@/components/common/ComponentErrorBoundary';
import { ToastProvider, useTutorialContext, useToast } from '@/components/providers';
import { TutorialId } from '@/constants/tutorials';
import { useArticleListen } from '@/hooks/articles/useArticleListen';
import { useArticleScreen } from '@/hooks/articles/useArticleScreen';
import { useColors } from '@/hooks/theme/useColors';
import type { ArticleId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';

// Static constants to prevent recreation
const FLEX_ONE_STYLE = { flex: 1 } as const;

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
    handleScroll,
    handleViewableItemsChanged,
    handleScrollEnd,
    handleToggleReadingListWithFeedback,
    handleClose,
    handleWordPress,
    handleWordLongPress,
    handleCloseTooltip,
    handleOpenWordDetails,
    handleAddWordToStudy,
    handleFlashListLoad,
  } = useArticleScreen({ id, showToast, disableAutoScroll });

  // In-article Listen control (podcast-style playback via the global MiniPlayer)
  const { isListeningToThisArticle, isListenLoading, handleToggleListen } = useArticleListen(
    article?.id as ArticleId | undefined,
    article?.title,
  );

  // Tutorial management
  const { shouldShowTutorial, completeTutorial } = useTutorialContext();

  // Freeze tutorial state on mount - keep showing card even after completing
  const showWordTapTutorialRef = useRef(shouldShowTutorial(TutorialId.WORD_TAP));
  const showWordTapTutorial = showWordTapTutorialRef.current;

  // Track if user manually dismissed the tutorial card
  const [isTutorialCardDismissed, setIsTutorialCardDismissed] = useState(false);

  // SharedValue for active word ID — drives per-word opacity on UI thread
  // without causing React re-renders across all sentences
  const activeWordIdSV = useSharedValue<string | number | null>(null);
  useEffect(() => {
    activeWordIdSV.value = activeTooltip?.word.id ?? null;
  }, [activeTooltip?.word.id, activeWordIdSV]);

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

  // Long-press quick save also counts as discovering the word interaction
  const handleWordLongPressWithTutorial = useCallback(
    (word: SentenceWord, layout?: LayoutRectangle) => {
      void handleWordLongPress(word, layout);

      if (showWordTapTutorial) {
        completeTutorial(TutorialId.WORD_TAP);
      }
    },
    [showWordTapTutorial, completeTutorial, handleWordLongPress],
  );

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

      // No key prop: FlashList recycles item views, and an identity key would
      // force a full remount per sentence instead of reuse (FlashList docs).
      return (
        <ArticleSentence
          sentence={item}
          words={words}
          colors={colors}
          onWordPress={handleWordPressWithTutorial}
          onWordLongPress={handleWordLongPressWithTutorial}
          showTutorialCard={showTutorialCard}
          onDismissTutorial={handleDismissTutorial}
          activeWordIdSV={activeWordIdSV}
        />
      );
    },
    [
      sentenceWordsMap,
      colors,
      handleWordPressWithTutorial,
      handleWordLongPressWithTutorial,
      showWordTapTutorial,
      isTutorialCardDismissed,
      handleDismissTutorial,
      activeWordIdSV,
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
    }),
    [activeTooltip, handleCloseTooltip, handleOpenWordDetails],
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
      colors,
      scrollViewRef: scrollViewRef as RefObject<FlashListRef<Tables<'article_sentences'>>>,
      isInReadingList,
      onToggleReadingList: handleToggleReadingListWithFeedback,
      isListening: isListeningToThisArticle,
      isListenLoading,
      onToggleListen: handleToggleListen,
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
    colors,
    scrollViewRef,
    isInReadingList,
    handleToggleReadingListWithFeedback,
    isListeningToThisArticle,
    isListenLoading,
    handleToggleListen,
    handleClose,
    handleFlashListLoad,
  ]);

  // Show loader while article is loading
  if (isLoadingArticle) {
    return <LoadingState />;
  }

  return (
    <View style={FLEX_ONE_STYLE}>
      {/* scrollViewRef is forwarded to ArticleContent (which attaches it imperatively); lint sees it as ref-read-in-render. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {articleContentProps ? <ArticleContent {...articleContentProps} /> : null}

      {/* The reader is a native modal presented above the root view, so the
          app-wide overlay can't reach it — host the player here instead. */}
      <AudioErrorBoundary>
        <GlobalMiniPlayer placement="screen" />
      </AudioErrorBoundary>

      <WordTooltip {...tooltipProps} />

      <WordDetailsBottomSheet
        isVisible={wordDetailsModal.isVisible}
        onClose={wordDetailsModal.close}
        word={wordDetailsModal.data}
        onAddToStudy={handleAddWordToStudy}
        isInStudyList={isInStudyList}
      />
    </View>
  );
}, ArticleScreenContentComparison);

ArticleScreenContent.displayName = 'ArticleScreenContent';

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();

  const containerStyle = [FLEX_ONE_STYLE, { backgroundColor: colors.background }];

  return (
    <ToastProvider>
      <SafeAreaView style={containerStyle} edges={[]}>
        <ComponentErrorBoundary componentName="ArticleScreen">
          <ArticleScreenContent id={id ?? ''} />
        </ComponentErrorBoundary>
      </SafeAreaView>
    </ToastProvider>
  );
}
