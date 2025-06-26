import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, type LayoutRectangle } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { ArticleSentence, WordTooltip } from '@/components/article';
import { ArticleContent } from '@/components/article/ArticleContent';
import { ToastProvider, useToast } from '@/components/providers/ToastProvider';
import { TIMING_CONFIG } from '@/constants/animation';
import { STRINGS } from '@/constants/strings';
import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useArticleRenderers } from '@/hooks/articles/useArticleRenderers';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useBookmarks } from '@/hooks/articles/useBookmarks';
import { useSentenceScrubber } from '@/hooks/articles/useSentenceScrubber';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useHeaderVisibility } from '@/hooks/ui/useHeaderVisibility';
import { useAppSelectorMemo } from '@/store/hooks';
import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { selectionFeedback } from '@/utils/haptics';

const FLEX_ONE_STYLE = { flex: 1 } as const;

// Inner component with toast context access
const ArticleScreenContent = ({ id }: { id: string }) => {
  const { showToast } = useToast();
  const colors = useColors();
  const { user } = useAuth();
  const fontScale = useAppSelectorMemo(state => state.settings.fontScale);
  const { toggleBookmark, useIsBookmarked } = useBookmarks();

  const { handleScroll } = useHeaderVisibility();

  // Add fade-in animation for smooth content appearance
  const { fadeIn } = useOpacityAnimation({
    initialOpacity: 0,
    duration: TIMING_CONFIG.GENTLE.duration,
    autoStart: false,
  });

  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id ?? '', 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  const {
    article,
    isLoadingArticle,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap,
    refetchStudyWords,
    isInReadingList,
    refetchReadingListStatus,
  } = useArticleData(articleId, user?.id);

  // Check if article is bookmarked
  const { data: isBookmarked = false } = useIsBookmarked(articleId);

  const [activeTooltip, setActiveTooltip] = useState<{
    word: SentenceWord;
    layout: LayoutRectangle;
  } | null>(null);

  // Article mutations for reading list and word management
  const { handleToggleReadingList, handleRootPress } = useArticleMutations(
    user?.id,
    refetchReadingListStatus,
    async () => {
      await refetchStudyWords();
    }
  );

  const { dueWordRootIds = new Set<number>() } = useArticlesByDueWords(user?.id, 0);

  const handleToggleReadingListWithFeedback = useCallback(async () => {
    if (!articleId) return;

    selectionFeedback();

    // Store previous state for toast message
    const wasInReadingList = isInReadingList;

    await handleToggleReadingList(articleId, isInReadingList);

    // Show appropriate toast message
    const toastMessage = wasInReadingList
      ? STRINGS.REMOVED_FROM_LISTENING_LIST
      : STRINGS.ADDED_TO_LISTENING_LIST;
    showToast(toastMessage);
  }, [articleId, isInReadingList, handleToggleReadingList, showToast]);

  const handleToggleBookmarkWithFeedback = useCallback(async () => {
    if (!articleId) return;

    try {
      await toggleBookmark(articleId, isBookmarked);
    } catch {
      // Error handling is done in the toggleBookmark function with toast
    }
  }, [articleId, isBookmarked, toggleBookmark]);

  // Initialize sentence scrubber
  const {
    currentSentenceIndex,
    scrollViewRef,
    handleViewableItemsChanged,
    handleSentenceChange,
    handleScrubStart,
    handleScrubEnd,
  } = useSentenceScrubber({
    sortedSentences: sortedSentences || [],
    dueWordRootIds,
    sentenceWordsMap,
  });

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        void refetchStudyWords?.();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [user?.id, refetchStudyWords]);

  // Trigger fade-in when article content is ready
  useEffect(() => {
    if (article && sortedSentences && sortedSentences.length > 0 && !isLoadingArticle) {
      fadeIn();
    }
  }, [article, sortedSentences, isLoadingArticle, fadeIn]);

  const handleWordPress = useCallback(
    (word: SentenceWord, layout?: LayoutRectangle) => {
      // Handle tooltip visibility only if layout is provided
      if (layout && layout.width > 0) {
        if (activeTooltip?.word.id === word.id) {
          setActiveTooltip(null);
        } else {
          setActiveTooltip({ word, layout });
        }
      }
    },
    [activeTooltip]
  );

  // Separate handler for study list toggle from tooltip
  const handleStudyListToggle = useCallback(() => {
    if (activeTooltip?.word.root_id) {
      selectionFeedback();
      handleRootPress(activeTooltip.word.root_id);
    }
  }, [activeTooltip, handleRootPress]);

  const handleCloseTooltip = useCallback(() => {
    setActiveTooltip(null);
  }, []);

  // Create a wrapper for the word press handler that matches useArticleRenderers signature
  const handleWordPressForRenderer = useCallback(
    (word: SentenceWord) => {
      handleWordPress(word);
    },
    [handleWordPress]
  );

  const { getWordsForSentence } = useArticleRenderers(
    { fontScale },
    selectedWordIds,
    sentenceWordsMap,
    handleWordPressForRenderer,
    handleRootPress
  );

  const renderSentenceItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { item: Tables<'article_sentences'> }) => {
      const words = getWordsForSentence(item.id);

      if (!words || words.length === 0) {
        // Return an empty view instead of null to satisfy the ReactElement requirement
        return <React.Fragment />;
      }

      return (
        <ArticleSentence
          key={item.id}
          sentence={item}
          words={words}
          settings={{ showEnglish: true, fontScale }}
          colors={colors}
          dueWordRootIds={dueWordRootIds}
          onWordPress={handleWordPress}
        />
      );
    },
    [getWordsForSentence, fontScale, colors, dueWordRootIds, handleWordPress]
  );

  return (
    <ThemedView style={FLEX_ONE_STYLE}>
      <StatusBar style={useIsDarkMode() ? 'light' : 'dark'} />
      {article && sortedSentences ? (
        <ArticleContent
          id={id}
          article={article}
          sortedSentences={sortedSentences}
          renderSentenceItem={renderSentenceItem}
          handleScroll={handleScroll}
          handleViewableItemsChanged={handleViewableItemsChanged}
          colors={colors}
          currentSentenceIndex={currentSentenceIndex}
          totalSentences={sortedSentences.length}
          onSentenceChange={handleSentenceChange}
          onScrubStart={handleScrubStart}
          onScrubEnd={handleScrubEnd}
          scrollViewRef={scrollViewRef as React.RefObject<any>}
          isInReadingList={isInReadingList}
          onToggleReadingList={handleToggleReadingListWithFeedback}
          isBookmarked={isBookmarked}
          onToggleBookmark={handleToggleBookmarkWithFeedback}
        />
      ) : null}
      <WordTooltip
        visible={!!activeTooltip}
        text={activeTooltip?.word.english}
        arabicWord={activeTooltip?.word.word_form}
        layout={activeTooltip?.layout ?? null}
        onClose={handleCloseTooltip}
        isInStudyList={
          activeTooltip?.word.root_id ? selectedWordIds.has(activeTooltip.word.root_id) : false
        }
        onStudyListToggle={handleStudyListToggle}
        wordRootId={activeTooltip?.word.root_id}
      />
    </ThemedView>
  );
};

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDarkMode = useIsDarkMode();

  return (
    <ToastProvider>
      <ThemedView style={FLEX_ONE_STYLE} useSafeArea={false}>
        <StatusBar animated={true} style={isDarkMode ? 'light' : 'dark'} translucent={true} />
        <ArticleScreenContent id={id ?? ''} />
      </ThemedView>
    </ToastProvider>
  );
}
