import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useCallback, useEffect } from 'react';
import type { JSX } from 'react';
import { View, AppState } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedView } from '@/components/ThemedView';
import { ArticleSentence } from '@/components/article';
import { ArabicWord } from '@/components/article/ArabicWord';
import { ArticleContent } from '@/components/article/ArticleContent';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleRenderers } from '@/hooks/articles/useArticleRenderers';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useHeaderVisibility } from '@/hooks/ui/useHeaderVisibility';
import { useAppSelector } from '@/store/hooks';
import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { lightFeedback } from '@/utils/haptics';
// import { analytics } from '@/services/analytics';
// Temporary mock analytics until service is fixed
const analytics = {
  trackViewArticle: async (_articleId: number, _properties?: any) => {},
};

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();

  const colors = useColors();
  const { user } = useAuth();
  const settings = useAppSelector(state => state.settings);
  const isDarkMode = useIsDarkMode();

  const { handleScroll } = useHeaderVisibility();

  // Add fade-in animation for smooth content appearance
  const { fadeIn, animatedStyle } = useOpacityAnimation({
    initialOpacity: 0,
    duration: 300,
    autoStart: false,
  });

  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  const {
    article,
    isLoadingArticle,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap,
    refetchStudyWords,
  } = useArticleData(articleId, user?.id);

  const { dueWordRootIds = new Set<number>() } = useArticlesByDueWords(user?.id, 0);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
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

  // Trigger fade-in when article content is ready
  useEffect(() => {
    if (article && sortedSentences && sortedSentences.length > 0 && !isLoadingArticle) {
      // Small delay to ensure everything is rendered before fading in
      const timer = setTimeout(() => {
        fadeIn();
      }, 50);
      return () => clearTimeout(timer);
    }
    return;
  }, [article, sortedSentences, isLoadingArticle, fadeIn]);

  // Simple root press handler for word interactions
  const handleRootPress = useCallback(
    (rootId: number) => {
      router.push(
        `/(tabs)/practice/review?rootId=${rootId}&mode=random&count=1&fromVocabulary=article`
      );
    },
    [router]
  );

  const handleWordPress = useCallback(
    (word: SentenceWord) => {
      if (word.root) {
        handleRootPress(word.root.id);
      }
    },
    [handleRootPress]
  );

  const { getWordsForSentence } = useArticleRenderers(
    settings,
    selectedWordIds,
    sentenceWordsMap,
    handleWordPress,
    handleRootPress
  );

  const renderWord = useCallback(
    (word: SentenceWord) => {
      // Check if this word is due for review
      const isDueWord = word.root_id ? dueWordRootIds.has(word.root_id) : false;

      return (
        <ArabicWord
          key={word.id}
          isDueWord={isDueWord}
          word={word}
          settings={{
            fontScale: settings.fontScale,
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

  const sentenceSettings = useMemo(
    () => ({ showEnglish: true, fontScale: settings.fontScale }),
    [settings.fontScale]
  );

  const renderSentenceItem = useCallback(
    (props: { item: Tables<'article_sentences'> }) => {
      const words = getWordsForSentence(props.item.id);

      return (
        <ArticleSentence
          key={props.item.id}
          colors={colors}
          containerStyle={{
            backgroundColor: colors.transparent,
            paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
          }}
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
    [getWordsForSentence, renderWord, colors, sentenceSettings]
  );

  return (
    <ToastProvider>
      <ThemedView style={{ flex: 1 }} useSafeArea={false}>
        <StatusBar animated={true} style={isDarkMode ? 'light' : 'dark'} translucent={true} />

        <View style={{ flex: 1 }}>
          {article && sortedSentences && sortedSentences.length > 0 ? (
            <Animated.View style={[{ flex: 1 }, animatedStyle as any]}>
              <ArticleContent
                article={article}
                colors={colors}
                handleScroll={handleScroll}
                id={id}
                isDarkMode={isDarkMode}
                renderSentenceItem={renderSentenceItem}
                sortedSentences={sortedSentences}
              />
            </Animated.View>
          ) : null}
        </View>
      </ThemedView>
    </ToastProvider>
  );
}
