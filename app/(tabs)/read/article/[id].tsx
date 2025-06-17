import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useCallback, useEffect } from 'react';
import type { JSX } from 'react';
import { View, AppState, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedView } from '@/components/ThemedView';
import { ArticleSentence } from '@/components/article';
import { ArabicWord } from '@/components/article/ArabicWord';
import { ArticleContent } from '@/components/article/ArticleContent';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { getPracticeReviewRoute } from '@/constants/routes';
import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleRenderers } from '@/hooks/articles/useArticleRenderers';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useHeaderVisibility } from '@/hooks/ui/useHeaderVisibility';
import { useAppSelectorMemo } from '@/store/hooks';
import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { selectionFeedback } from '@/utils/haptics';

const FLEX_ONE_STYLE = { flex: 1 } as const;

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();

  const colors = useColors();
  const { user } = useAuth();
  const fontScale = useAppSelectorMemo(state => state.settings.fontScale);
  const isDarkMode = useIsDarkMode();

  const { handleScroll } = useHeaderVisibility();

  // Add fade-in animation for smooth content appearance
  const { fadeIn, animatedStyle } = useOpacityAnimation({
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

  // Trigger fade-in when article content is ready
  useEffect(() => {
    if (article && sortedSentences && sortedSentences.length > 0 && !isLoadingArticle) {
      fadeIn();
    }
  }, [article, sortedSentences, isLoadingArticle, fadeIn]);

  // Simple root press handler for word interactions
  const handleRootPress = useCallback(
    (rootId: number) => {
      router.push(
        getPracticeReviewRoute({
          rootId,
          mode: 'random',
          count: 1,
          fromVocabulary: 'article',
        })
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

  const handleWordPressWithFeedback = useCallback(
    (word: SentenceWord) => {
      if (word.root) {
        if (word.root_id && dueWordRootIds.has(word.root_id)) {
          selectionFeedback();
        }
        handleRootPress(word.root.id);
      }
    },
    [dueWordRootIds, handleRootPress]
  );

  const { getWordsForSentence } = useArticleRenderers(
    { fontScale },
    selectedWordIds,
    sentenceWordsMap,
    handleWordPress,
    handleRootPress
  );

  const wordSettings = useMemo(() => ({ fontScale }), [fontScale]);

  const renderWord = useCallback(
    (word: SentenceWord) => {
      // Check if this word is due for review
      const isDueWord = word.root_id ? dueWordRootIds.has(word.root_id) : false;

      return (
        <ArabicWord
          key={word.id}
          isDueWord={isDueWord}
          word={word}
          settings={wordSettings}
          onPress={handleWordPressWithFeedback}
        />
      );
    },
    [dueWordRootIds, handleRootPress, wordSettings, handleWordPressWithFeedback]
  );

  const sentenceSettings = useMemo(() => ({ showEnglish: true, fontScale }), [fontScale]);

  const sentenceContainerStyle = useMemo(
    () => ({
      backgroundColor: colors.transparent,
      paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    }),
    [colors.transparent]
  );

  const renderSentenceItem = useCallback(
    (props: { item: Tables<'article_sentences'> }) => {
      const words = getWordsForSentence(props.item.id);

      return (
        <ArticleSentence
          key={props.item.id}
          colors={colors}
          containerStyle={sentenceContainerStyle}
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
    [getWordsForSentence, renderWord, colors, sentenceSettings, sentenceContainerStyle]
  );

  const containerStyle = FLEX_ONE_STYLE;
  const contentStyle = useMemo(() => [FLEX_ONE_STYLE, animatedStyle as ViewStyle], [animatedStyle]);

  return (
    <ToastProvider>
      <ThemedView style={containerStyle} useSafeArea={false}>
        <StatusBar animated={true} style={isDarkMode ? 'light' : 'dark'} translucent={true} />

        <View style={containerStyle}>
          {article && sortedSentences && sortedSentences.length > 0 ? (
            <Animated.View style={contentStyle}>
              <ArticleContent
                article={article}
                colors={colors}
                handleScroll={handleScroll}
                id={id}
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
