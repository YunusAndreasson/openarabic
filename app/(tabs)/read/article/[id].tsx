/* eslint-disable react-native/no-unused-styles */
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { ComponentRef, JSX } from 'react';
import { StyleSheet, View, AppState } from 'react-native';
import type { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { ArticleSentence } from '@/components/article';
import { ArabicWord } from '@/components/article/ArabicWord';
import { ArticleContent, type ArticleContentRef } from '@/components/article/ArticleContent';
import { LAYOUT } from '@/constants/layout';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useArticleRenderers } from '@/hooks/articles/useArticleRenderers';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useHeaderVisibility } from '@/hooks/ui/useHeaderVisibility';
import { analytics } from '@/services/analytics';
import { useAppSelector } from '@/store/hooks';
import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { lightFeedback } from '@/utils/haptics';

const createStyles = (
  colors: ReturnType<typeof useColors>,
  _insets: ReturnType<typeof useSafeAreaInsets>
) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    transparentBackground: {
      backgroundColor: colors.transparent,
      paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    },
    // Swipe indicator for modal dismiss gesture
    swipeIndicatorContainer: {
      position: 'absolute',
      top: LAYOUT.SPACING.SMALL, // Very close to safe area top (8px below)
      left: 0,
      right: 0,
      zIndex: 1000, // High z-index to ensure it's above everything
      alignItems: 'center',
      paddingVertical: LAYOUT.SPACING.TINY,
      pointerEvents: 'none', // Don't interfere with touch events
    },
    swipeIndicator: {
      width: 36,
      height: 4,
      backgroundColor: colors.text,
      opacity: 0.25, // More subtle
      borderRadius: LAYOUT.BORDER_RADIUS.PILL,
    },
  });

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);
  const { user } = useAuth();
  const settings = useAppSelector(state => state.settings);
  const isDarkMode = useIsDarkMode();

  const { handleScroll } = useHeaderVisibility();

  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  const {
    article,
    isLoadingArticle,
    isInReadingList,
    refetchReadingListStatus,
    isLoadingReadingList,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap,
    refetchStudyWords,
  } = useArticleData(articleId, user?.id);

  const { dueWordRootIds = new Set<number>() } = useArticlesByDueWords(user?.id, 0);

  useEffect(() => {
    if (!user?.id) return;
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        refetchStudyWords?.();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [user?.id, refetchStudyWords]);

  useEffect(() => {
    if (article && !isLoadingArticle) {
      analytics.trackViewArticle(article.id, {
        ...(article.title && { title: article.title }),
        ...(article.category?.name && { category: article.category.name }),
        ...(article.article_sentences && {
          wordCount: article.article_sentences.reduce(
            (total, sentence) => total + (sentence.sentence_words?.length || 0),
            0
          ),
          sentenceCount: article.article_sentences.length,
        }),
      });
    }
  }, [article, isLoadingArticle]);

  useEffect(() => {
    if (article && !isLoadingReadingList) {
      analytics.trackToggleReadingList(article.id, isInReadingList);
    }
  }, [article, isInReadingList, isLoadingReadingList]);

  const articleContentRef = useRef<ArticleContentRef>(null);

  const { handleRootPress, handleToggleReadingList } = useArticleMutations(
    user?.id,
    refetchReadingListStatus,
    refetchStudyWords
  );

  const handleWordPress = useCallback(
    (word: SentenceWord) => {
      if (word.root) {
        handleRootPress(word.root.id);
      }
    },
    [handleRootPress]
  );

  const { handleArticlePress: _handleArticlePress, getWordsForSentence } = useArticleRenderers(
    settings,
    selectedWordIds,
    sentenceWordsMap,
    handleWordPress,
    handleRootPress
  );

  const [showEnglishLocal, _setShowEnglishLocal] = useState(true);

  const renderWord = useCallback(
    (
      word: SentenceWord,
      _isAudioHighlighted = false,
      wordRef?: React.RefObject<ComponentRef<typeof TouchableOpacity>>
    ) => {
      // Check if this word is due for review
      const isDueWord = word.root_id ? dueWordRootIds.has(word.root_id) : false;

      return (
        <ArabicWord
          key={word.id}
          isAudioHighlighted={false}
          isDueWord={isDueWord}
          word={word}
          wordRef={wordRef}
          settings={{
            showEnglish: false,
            fontScale: settings.fontScale,
            showTransliteration: false,
            showWordType: false,
          }}
          onPress={() => {
            if (word.root) {
              if (isDueWord) {
                lightFeedback();
              }
              handleRootPress(word.root.id);
            }
          }}
        />
      );
    },
    [dueWordRootIds, handleRootPress, settings.fontScale]
  );

  const renderSentenceItem = useCallback(
    (props: { item: Tables<'article_sentences'> }) => {
      const words = getWordsForSentence(props.item.id);

      // Create stable settings object
      const sentenceSettings = {
        showEnglish: showEnglishLocal,
        fontScale: settings.fontScale,
        showTransliteration: false,
        showWordType: false,
      };

      return (
        <ArticleSentence
          key={props.item.id}
          colors={colors}
          containerStyle={styles.transparentBackground}
          currentPlayingWordId={null}
          currentPlayingPosition={null}
          renderWord={renderWord}
          settings={sentenceSettings}
          words={words}
          sentence={{
            id: props.item.id,
            english: props.item.english,
            arabic: props.item.arabic,
            audio_url: props.item.audio_url,
          }}
        />
      );
    },
    [
      getWordsForSentence,
      renderWord,
      showEnglishLocal,
      settings.fontScale,
      colors,
      styles.transparentBackground,
    ]
  );

  useEffect(() => {
    refetchReadingListStatus?.();
  }, [id, refetchReadingListStatus]);

  return (
    <ThemedView style={styles.container} useSafeArea={false}>
      <StatusBar animated={true} style={isDarkMode ? 'light' : 'dark'} translucent={true} />

      <View style={styles.container}>
        {/* Swipe indicator for modal dismiss */}
        <View style={styles.swipeIndicatorContainer}>
          <View style={styles.swipeIndicator} />
        </View>

        {article && sortedSentences && sortedSentences.length > 0 ? (
          <ArticleContent
            ref={articleContentRef}
            article={article}
            colors={colors}
            englishToggleKey={showEnglishLocal ? 'en' : 'ar'}
            handleScroll={handleScroll}
            id={id}
            isDarkMode={isDarkMode}
            renderSentenceItem={renderSentenceItem}
            sortedSentences={sortedSentences}
            isInReadingList={isInReadingList}
            isLoadingReadingList={isLoadingReadingList}
            onToggleReadingList={() => handleToggleReadingList(article.id, isInReadingList)}
          />
        ) : null}
      </View>
    </ThemedView>
  );
}
