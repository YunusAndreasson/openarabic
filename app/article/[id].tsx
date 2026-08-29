import type { FlashListRef } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import type { JSX, RefObject } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutRectangle } from 'react-native';
import { View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ArticleSentence,
  WordDetailsBottomSheet,
  WordTooltip,
  ArticleContent,
} from '@/components/article';
import { AudioErrorBoundary, GlobalMiniPlayer } from '@/components/audio';
import { ComponentErrorBoundary, EmptyState, LoadingState } from '@/components/common';
import { ToastProvider, useTutorialContext, useToast } from '@/components/providers';
import { STRINGS } from '@/constants/strings';
import { TutorialId } from '@/constants/tutorials';
import { useArticleListen } from '@/hooks/articles/useArticleListen';
import { useArticleScreen } from '@/hooks/articles/useArticleScreen';
import { useKeepScreenAwake } from '@/hooks/common/useKeepScreenAwake';
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
  const params = useLocalSearchParams<{ disableAutoScroll?: string }>();
  const disableAutoScroll = params.disableAutoScroll === 'true';

  // Extract all business logic into hook
  const {
    isLoadingArticle,
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
  } = useArticleScreen({ id, showToast, disableAutoScroll });

  // In-article Listen control (podcast-style playback via the global MiniPlayer)
  const { isListeningToThisArticle, isListenLoading, handleToggleListen } = useArticleListen(
    article?.id,
    article?.title,
    // Hand over the already-loaded article so tapping Listen doesn't refetch it
    article,
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
      isInReadingList,
      onToggleReadingList: handleToggleReadingListWithFeedback,
      isListening: isListeningToThisArticle,
      isListenLoading,
      onToggleListen: handleToggleListen,
      onClose: handleClose,
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
    isInReadingList,
    handleToggleReadingListWithFeedback,
    isListeningToThisArticle,
    isListenLoading,
    handleToggleListen,
    handleClose,
    handleFlashListLoad,
    selectedWordIds,
  ]);

  // Show loader while article is loading
  if (isLoadingArticle) {
    return <LoadingState />;
  }

  // A malformed/missing id never resolves to an article, and a well-formed id
  // can point at nothing (deleted, or never existed) — either way `article`
  // stays undefined once loading settles. Screen has no header, so this is the
  // only in-app way out other than the Android back gesture.
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
    <View style={FLEX_ONE_STYLE}>
      {/* scrollViewRef is forwarded to ArticleContent (which attaches it imperatively); lint sees it as ref-read-in-render. */}
      {/* Dismiss the tooltip on any tap that doesn't land on a word or the
          tooltip bubble itself — without this, WordTooltip's box-none overlay
          lets a tap on English text/margins/sentence gaps pass straight
          through to nothing, leaving the tooltip stuck open until the same
          word is tapped again or the list scrolls. A tap on a word fires
          BOTH that word's own onPress AND this wrapper's onPress (in that
          order, same gesture dispatch) — handleBackgroundPress (not
          handleCloseTooltip) checks a same-tick ref handleWordPress sets, so
          a word tap still switches the tooltip instead of this wrapper
          closing what the word just opened. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {articleContentProps ? (
        // accessible={false}: a Pressable otherwise groups its whole subtree into
        // one TalkBack node with every descendant's text concatenated into a
        // single label, hiding the individually-accessible words and buttons below.
        <Pressable style={FLEX_ONE_STYLE} onPress={handleBackgroundPress} accessible={false}>
          <ArticleContent {...articleContentProps} />
        </Pressable>
      ) : null}

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

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();

  // Held for the whole route, the loading state included — a reader waiting on
  // a slow fetch is still a reader.
  //
  // Unconditional, unlike the review route, and the one state worth arguing
  // about is audio playback: the article does NOT follow the audio (the
  // highlight is driven by the tooltip and the only auto-scroll is the
  // resume-position jump), so a learner who starts playback and puts the phone
  // down holds the display for the whole clip. Gating on
  // `isListeningToThisArticle` would fix that and break the commoner case —
  // listening WHILE following the Arabic on screen, which is most of why the
  // audio exists. Dimming the page out from under a learner reading along is
  // the exact complaint this change was made to fix, so the battery cost is
  // taken deliberately. Leaving the reader unmounts it and releases the lock;
  // the MiniPlayer keeps the audio going without one.
  useKeepScreenAwake();

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
