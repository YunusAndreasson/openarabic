/* eslint-disable react-native/no-unused-styles */
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { ComponentRef, JSX } from 'react';
import { StyleSheet, View, AppState } from 'react-native';
import type { TouchableOpacity } from 'react-native';

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
import { useColors } from '@/hooks/useColors';
import { useHeaderVisibility } from '@/hooks/useHeaderVisibility';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { analytics } from '@/services/analytics';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setFontScale } from '@/store/settingsSlice';
import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { lightFeedback } from '@/utils/haptics';

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    transparentBackground: {
      backgroundColor: colors.transparent,
      paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    },
  });

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const settings = useAppSelector(state => state.settings);
  const isDarkMode = useIsDarkMode();
  const queryClient = useQueryClient();
  const router = useRouter();
  const dispatch = useAppDispatch();

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
    otherArticles,
    refetchStudyWords,
  } = useArticleData(articleId, user?.id);

  const { dueWordRootIds = new Set<number>() } = useArticlesByDueWords(user?.id, 0);

  useEffect(() => {
    if (!user?.id) return;
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        queryClient.invalidateQueries({ queryKey: ['studyWords', user.id] });
        refetchStudyWords?.();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [user?.id, queryClient, refetchStudyWords]);

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

  const { handleToggleReadingList, handleRootPress } = useArticleMutations(
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

  const { handleArticlePress, getWordsForSentence } = useArticleRenderers(
    settings,
    selectedWordIds,
    sentenceWordsMap,
    handleWordPress,
    handleRootPress
  );

  const handleBookmarkPress = useCallback(() => {
    if (articleId) {
      lightFeedback();
      handleToggleReadingList(articleId, Boolean(isInReadingList));
    }
  }, [articleId, isInReadingList, handleToggleReadingList]);

  const [showEnglishLocal, setShowEnglishLocal] = useState(true);

  const handleEnglishToggle = useCallback(() => {
    setShowEnglishLocal(!showEnglishLocal);
  }, [showEnglishLocal]);

  const [showTextSizeSlider, setShowTextSizeSlider] = useState(false);

  const handleTextSizeToggle = useCallback(() => {
    setShowTextSizeSlider(!showTextSizeSlider);
  }, [showTextSizeSlider]);

  const handleFontScaleChange = useCallback(
    (value: number) => {
      dispatch(setFontScale(value));
    },
    [dispatch]
  );

  const handleBackPress = useCallback(() => {
    queryClient.cancelQueries();
    router.back();
  }, [router, queryClient]);

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
    // Reset text size slider when article changes
    setShowTextSizeSlider(false);
    refetchReadingListStatus?.();
  }, [id]);

  return (
    <ThemedView style={styles.container} useSafeArea={false}>
      <StatusBar animated={true} style={isDarkMode ? 'light' : 'dark'} translucent={true} />

      <View style={styles.container}>
        {article && sortedSentences && sortedSentences.length > 0 ? (
          <ArticleContent
            ref={articleContentRef}
            article={article}
            colors={colors}
            englishToggleKey={showEnglishLocal ? 'en' : 'ar'}
            fontScale={settings.fontScale}
            handleScroll={handleScroll}
            id={id}
            isDarkMode={isDarkMode}
            isInReadingList={isInReadingList}
            isPlaying={false}
            otherArticles={otherArticles}
            renderSentenceItem={renderSentenceItem}
            showEnglish={showEnglishLocal}
            showTextSizeSlider={showTextSizeSlider}
            sortedSentences={sortedSentences}
            user={user}
            handleArticlePress={(articleId, isRelated) =>
              handleArticlePress(Number(articleId), isRelated)
            }
            onBackPress={handleBackPress}
            onBookmarkPress={handleBookmarkPress}
            onEnglishToggle={handleEnglishToggle}
            onFontScaleChange={handleFontScaleChange}
            onTextSizeToggle={handleTextSizeToggle}
          />
        ) : null}
      </View>
    </ThemedView>
  );
}
