import type { FlashListRef } from '@shopify/flash-list';
import type { ErrorBoundaryProps } from 'expo-router';
import { router, useLocalSearchParams } from 'expo-router';
import type { JSX, RefObject } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutRectangle } from 'react-native';
import { View } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import {
  ArticleSentence,
  FloatingActionButtons,
  ReaderCloseButton,
  WordDetailsBottomSheet,
  WordTooltip,
  ArticleContent,
} from '@/components/article';
import { AudioErrorBoundary, GlobalMiniPlayer } from '@/components/audio';
import { EmptyState, ErrorState, LoadingState, ScreenErrorFallback } from '@/components/common';
import { ToastProvider, useTutorialContext, useToast } from '@/components/providers';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { TutorialId } from '@/constants/tutorials';
import { useArticleListen } from '@/hooks/articles/useArticleListen';
import { useArticleScreen } from '@/hooks/articles/useArticleScreen';
import { useReaderKeepAwake } from '@/hooks/articles/useReaderKeepAwake';
import { useColors } from '@/hooks/theme/useColors';
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
  const params = useLocalSearchParams<{ disableAutoScroll?: string; sentenceId?: string }>();
  const disableAutoScroll = params.disableAutoScroll === 'true';
  const requestedSentenceId = Number(params.sentenceId);
  const targetSentenceId =
    Number.isSafeInteger(requestedSentenceId) && requestedSentenceId > 0
      ? requestedSentenceId
      : undefined;

  // Extract all business logic into hook
  const {
    isLoadingArticle,
    isArticleError,
    refetchArticle,
    hasValidArticleId,
    article,
    sortedSentences,
    sentenceWordsMap,
    selectedWordIds,
    isInReadingList,
    scrollViewRef,
    activeTooltip,
    wordDetailsModal,
    isInStudyList,
    isLoadingStudyWords,
    handleScroll,
    handleViewableItemsChanged,
    handleScrollEnd,
    handleToggleReadingListWithFeedback,
    handleClose,
    handleWordPress,
    handleWordLongPress,
    handleCloseTooltip,
    handleBackgroundPress,
    handleOpenWordDetails,
    handleAddWordToStudy,
    handleFlashListLoad,
  } = useArticleScreen({ id, showToast, disableAutoScroll, targetSentenceId });

  // In-article Listen control (podcast-style playback via the global MiniPlayer)
  const { isListeningToThisArticle, isListenLoading, handleToggleListen } = useArticleListen(
    article?.id,
    // Hand over the already-loaded article so tapping Listen doesn't refetch it
    article,
  );

  // The display stays on while this article plays, or for a reading window
  // after the last touch — not for as long as the reader happens to be open.
  // Held from here rather than the route so it can see playback; the window
  // opens on mount, so the loading state is covered too.
  const markReaderActivity = useReaderKeepAwake(isListeningToThisArticle);

  // Tutorial management
  const { shouldShowTutorial, completeTutorial } = useTutorialContext();

  // Freeze tutorial state on mount - keep showing card even after completing
  const showWordTapTutorialRef = useRef(shouldShowTutorial(TutorialId.WORD_TAP));
  const showWordTapTutorial = showWordTapTutorialRef.current;

  // Track if user manually dismissed the tutorial card
  const [isTutorialCardDismissed, setIsTutorialCardDismissed] = useState(false);

  // SharedValue for active word ID — each sentence narrows it to its own words
  // on the UI runtime, so the dim re-renders only the sentence it lands in
  const activeWordIdSV = useSharedValue<string | number | null>(null);
  useEffect(() => {
    activeWordIdSV.set(activeTooltip?.word.id ?? null);
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

      // Tapping a word IS the instruction being followed, so the card retires
      // itself. It used to only mark the tutorial done for next time and stay
      // on screen, which left "Tap the highlighted word…" sitting above the
      // tooltip it had just produced — still telling the learner to do the
      // thing they had visibly just done.
      if (showWordTapTutorial) {
        setIsTutorialCardDismissed(true);
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
        setIsTutorialCardDismissed(true);
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
          selectedRootIds={selectedWordIds}
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
      selectedWordIds,
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
      onFlashListLoad: handleFlashListLoad,
      selectedRootIds: selectedWordIds,
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
    handleFlashListLoad,
    selectedWordIds,
  ]);

  // Background tap: closes the tooltip when a tap lands on neither a word nor
  // the bubble. A Tap gesture rather than a Pressable — Gesture Handler 3's
  // Pressable is a native button, the wrong thing to wrap a scrolling list in.
  // A Tap fails as soon as the finger moves, so scrolling never trips it, and a
  // word's own button activating cancels it.
  const backgroundTap = useTapGesture({
    runOnJS: true,
    onDeactivate: event => {
      if (!event.canceled) handleBackgroundPress();
    },
  });

  // The reader is a full-screen modal with its swipe-down exit turned off, so a
  // state without the close button had no way out on iOS: a slow fetch with
  // retries held the learner on a spinner until it gave up.
  if (isLoadingArticle) {
    return (
      <View style={FLEX_ONE_STYLE}>
        <LoadingState />
        <ReaderCloseButton onClose={() => void handleClose()} />
      </View>
    );
  }

  // A request that failed for an article that may well exist. It used to land
  // on "Article not found ... It may have been removed", which told someone on
  // a dropped connection that the text was gone, and offered no retry.
  if (!article && isArticleError) {
    return (
      <View style={FLEX_ONE_STYLE}>
        <ErrorState message={STRINGS.FAILED_TO_LOAD_ARTICLE} onRetry={refetchArticle} />
        <ReaderCloseButton onClose={() => void handleClose()} />
      </View>
    );
  }

  // A malformed/missing id never resolves to an article, and a well-formed id
  // can point at nothing the catalogue lists (deleted, or never existed) —
  // either way `article` stays undefined once loading settles. Its own "Go
  // back" action is the way out.
  if (!article) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title={hasValidArticleId ? STRINGS.ARTICLE_NOT_FOUND : STRINGS.ARTICLE_INVALID_LINK}
        hint={STRINGS.ARTICLE_NOT_FOUND_HINT}
        action={{
          label: STRINGS.ARTICLE_NOT_FOUND_GO_BACK,
          onPress: () => void handleClose(),
        }}
      />
    );
  }

  return (
    // Any touch — a scroll, a word, a button, the word card — reopens the
    // keep-awake reading window. `onTouchStart` sees touches that a native
    // gesture goes on to claim, which a press handler would not.
    <View style={FLEX_ONE_STYLE} onTouchStart={markReaderActivity}>
      {/* scrollViewRef is forwarded to ArticleContent (which attaches it imperatively); lint sees it as ref-read-in-render. */}
      {/* Dismiss the tooltip on any tap that doesn't land on a word or the
          tooltip bubble itself — without this, WordTooltip's box-none overlay
          lets a tap on English text/margins/sentence gaps pass straight
          through to nothing, leaving the tooltip stuck open until the same
          word is tapped again or the list scrolls. Should a word tap ever
          complete this Tap as well, handleBackgroundPress (not
          handleCloseTooltip) checks a same-tick ref handleWordPress sets, so
          the word still switches the tooltip instead of this closing what the
          word just opened. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {articleContentProps ? (
        <GestureDetector gesture={backgroundTap}>
          <View style={FLEX_ONE_STYLE}>
            <ArticleContent {...articleContentProps} />
          </View>
        </GestureDetector>
      ) : null}

      {/* The reader's chrome — close, listen, playlist. After the content, so
          it draws over the text and the hero; before the player, the tooltip
          and the word sheet, so those still draw over it. Sibling order is the
          whole of it: none of these sets a zIndex that would reorder them (the
          sheet has none, which is why the buttons carry none either). */}
      {sortedSentences.length > 0 && (
        <FloatingActionButtons
          isInReadingList={isInReadingList}
          onToggleReadingList={handleToggleReadingListWithFeedback}
          isListening={isListeningToThisArticle}
          isListenLoading={isListenLoading}
          onToggleListen={() => void handleToggleListen()}
          onClose={() => void handleClose()}
        />
      )}

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
        isStudyStateLoading={isLoadingStudyWords}
      />
    </View>
  );
}, ArticleScreenContentComparison);

ArticleScreenContent.displayName = 'ArticleScreenContent';

/**
 * Leaving a reader that threw: back to whatever presented it, or to Explore
 * when nothing did (a cold deep link). `replace`, not `push` — the broken
 * reader should not stay on the stack under Explore.
 */
const closeBrokenReader = () => {
  if (router.canDismiss()) {
    router.dismiss();
  } else {
    router.replace(ROUTE_PATHS.EXPLORE_TAB);
  }
};

/**
 * What the reader renders in place of itself after a render error.
 *
 * Its own boundary, not the Stack's shared `ScreenErrorFallback` alone: the
 * reader is a `fullScreenModal` with its swipe-down exit turned off, so on iOS
 * a fallback without a close button had no way out — and the close button
 * lived inside the very content that threw. Expo Router renders this instead of
 * the route, so it relies on nothing the screen set up.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps): JSX.Element {
  const colors = useColors();
  const containerStyle = [FLEX_ONE_STYLE, { backgroundColor: colors.background }];

  return (
    <View style={containerStyle}>
      <ScreenErrorFallback error={error} retry={retry} />
      <ReaderCloseButton onClose={closeBrokenReader} />
    </View>
  );
}

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();

  // The wake lock lives in ArticleScreenContent (`useReaderKeepAwake`), which
  // can see playback. Leaving the reader unmounts it and releases the lock; the
  // MiniPlayer keeps the audio going without one.
  const containerStyle = [FLEX_ONE_STYLE, { backgroundColor: colors.background }];

  // A plain View. This was a SafeAreaView with `edges={[]}`, and in
  // safe-area-context 5 an omitted edge is an edge turned off — so it applied
  // no inset at all, only the native work of measuring for one.
  return (
    <ToastProvider>
      <View style={containerStyle}>
        <ArticleScreenContent id={id ?? ''} />
      </View>
    </ToastProvider>
  );
}
