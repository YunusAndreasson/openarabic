import React from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { StyleSheet, View, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { articlesService } from '@/services/articles';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { useAppSelector } from '@/store/hooks';
import { CollapsibleHeader } from '@/components/CollapsibleHeader';
import { AudioPlayButton } from '@/components/AudioPlayButton';
import { ReadingListButton } from '@/components/ReadingListButton';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';
import { ArabicWord } from '@/components/ArabicWord';
import type { Tables } from '@/types/database.types';
import { studyWordsService } from '@/services/study_words';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { CompactArticleCard } from '@/components/CompactArticleCard';
import { LAYOUT } from '@/constants/layout';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    marginBottom: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
    overflow: 'hidden',
  },
  categoryPill: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
  },
  categoryBackground: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  category: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    letterSpacing: 0.5,
  },
  title: {
    textAlign: 'left',
    marginBottom: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  author: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
  },
  sentenceContainer: {
    paddingHorizontal: LAYOUT.SPACING.TINY,
    marginBottom: LAYOUT.SPACING.XXLARGE,
  },
  englishText: {
    writingDirection: 'ltr',
    fontFamily: 'Philosopher',
    textAlign: 'left',
  },
  content: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.LARGE,
    marginTop: LAYOUT.SPACING.LARGE,
    marginBottom: -LAYOUT.SPACING.SMALL,
  },
  buttonWrapper: {
    flex: 1,
  },
  arabicSentence: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.TINY,
  },
  moreFromAuthor: {
    marginTop: LAYOUT.SPACING.XXLARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  moreFromAuthorTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    marginBottom: LAYOUT.SPACING.LARGE,
    fontWeight: '600',
  },
  moreFromCategory: {
    marginTop: LAYOUT.SPACING.XXLARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.SPACING.XXLARGE,
  },
  horizontalList: {
    paddingLeft: LAYOUT.SCREEN_EDGE_PADDING,
    marginHorizontal: -LAYOUT.SCREEN_EDGE_PADDING,
  },
});

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const settings = useAppSelector(state => state.settings);

  // Fetch article data
  const { data: article, isLoading: isLoadingArticle } = useQuery({
    queryKey: ['article', id],
    queryFn: () => articlesService.getArticleById(parseInt(id!)),
    enabled: !!id,
  });

  // Fetch study words
  const { data: studyWords = [] } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: () => studyWordsService.getStudyWords(user!.id),
    enabled: !!user,
  });

  // Create a Set of selected word IDs for efficient lookup
  const selectedWordIds = React.useMemo(
    () => new Set(studyWords.map(w => w.sentence_word_id)),
    [studyWords]
  );

  // Toggle word mutation
  const toggleWordMutation = useMutation({
    mutationFn: async ({ userId, wordId }: { userId: string; wordId: number }) =>
      studyWordsService.toggleStudyWord(userId, wordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyWords', user?.id] });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update word status',
      });
    },
  });

  const handleWordPress = async (word: Tables<'sentence_words'>) => {
    if (!user) return;
    toggleWordMutation.mutate({ userId: user.id, wordId: word.id });
  };

  // Fetch more articles from the same author
  const { data: moreArticles = [] } = useQuery({
    queryKey: ['articles', article?.author?.id],
    queryFn: () => articlesService.getArticles(undefined, article!.author!.id),
    enabled: !!article?.author?.id,
  });

  // Filter out the current article from the list
  const otherArticles = React.useMemo(
    () => moreArticles.filter(a => a.id !== article?.id),
    [moreArticles, article?.id]
  );

  // Fetch more articles from the same category
  const { data: categoryArticles = [] } = useQuery({
    queryKey: ['articles', article?.category?.id],
    queryFn: () => articlesService.getArticles(article!.category!.id),
    enabled: !!article?.category?.id,
  });

  // Filter out the current article from the category list
  const otherCategoryArticles = React.useMemo(
    () => categoryArticles.filter(a => a.id !== article?.id),
    [categoryArticles, article?.id]
  );

  if (isLoadingArticle || !article) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  const renderHeaderContent = () => (
    <>
      {article.category && (
        <View style={styles.categoryContainer}>
          <BlurView
            intensity={10}
            tint={colors.background === Colors.dark.background ? 'dark' : 'light'}
            style={styles.categoryPill}
          >
            <View style={[styles.categoryBackground]}>
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: colors.background,
                  opacity: 0.3 as number,
                }}
              />
              <ThemedText
                style={[styles.category, { color: colors.categoryText }]}
                type="defaultSemiBold"
              >
                {article.category.name.toUpperCase()}
              </ThemedText>
            </View>
          </BlurView>
        </View>
      )}
      <ThemedText
        type="title"
        style={[styles.title, { color: colors.titleText }]}
        numberOfLines={3}
      >
        {article.title}
      </ThemedText>
      {article.author && (
        <ThemedText style={[styles.author, { color: colors.authorText }]}>
          By {article.author.name}
        </ThemedText>
      )}
      <View style={styles.buttonContainer}>
        {article?.audio_url && (
          <View style={styles.buttonWrapper}>
            <AudioPlayButton audioUrl={article.audio_url} />
          </View>
        )}
        {article?.id && (
          <View style={styles.buttonWrapper}>
            <ReadingListButton articleId={article.id} />
          </View>
        )}
      </View>
    </>
  );

  return (
    <CollapsibleHeader renderContent={renderHeaderContent} title={article?.title || ''}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {article.article_sentences
          .sort((a, b) => a.position - b.position)
          .map(sentence => (
            <View key={sentence.id} style={styles.sentenceContainer}>
              <View style={styles.arabicSentence}>
                {sentence.sentence_words
                  .sort((a, b) => a.position - b.position)
                  .map(word => (
                    <ArabicWord
                      key={word.id}
                      word={word}
                      isSelected={selectedWordIds.has(word.id)}
                      onPress={handleWordPress}
                      scale={settings.fontScale}
                      baseSize={24}
                    />
                  ))}
              </View>
              {settings.showEnglish && (
                <ThemedText
                  style={[
                    styles.englishText,
                    {
                      color: colors.englishText,
                      fontSize: 16 * settings.fontScale,
                      lineHeight: Math.round(22 * settings.fontScale),
                    },
                  ]}
                >
                  {sentence.english}
                </ThemedText>
              )}
            </View>
          ))}

        {otherArticles.length > 0 && (
          <View style={styles.moreFromAuthor}>
            <ThemedText style={styles.moreFromAuthorTitle}>
              More from {article.author?.name}
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {otherArticles.map(otherArticle => (
                <CompactArticleCard
                  key={otherArticle.id}
                  article={otherArticle}
                  onPress={() => {
                    router.push({
                      pathname: '/article/[id]',
                      params: { id: otherArticle.id },
                    });
                  }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {otherCategoryArticles.length > 0 && (
          <View style={styles.moreFromCategory}>
            <ThemedText style={styles.moreFromAuthorTitle}>
              More from {article.category?.name}
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {otherCategoryArticles.map(otherArticle => (
                <CompactArticleCard
                  key={otherArticle.id}
                  article={otherArticle}
                  onPress={() => {
                    router.push({
                      pathname: '/article/[id]',
                      params: { id: otherArticle.id },
                    });
                  }}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </CollapsibleHeader>
  );
}
