import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { articlesService } from '@/services/articles';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  categoryPill: {
    borderRadius: 6,
  },
  categoryBackground: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  category: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  title: {
    textAlign: 'left',
    marginBottom: 8,
    fontSize: 32,
    lineHeight: 40,
  },
  author: {
    fontSize: 16,
  },
  sentenceContainer: {
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  englishText: {
    fontSize: 18,
    marginBottom: 8,
    writingDirection: 'ltr',
    fontFamily: 'Philosopher',
    textAlign: 'left',
  },
  content: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    marginBottom: -8,
  },
  buttonWrapper: {
    flex: 1,
  },
  arabicSentence: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 16,
  },
});

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
        style={[
          styles.title,
          {
            color: colors.titleText,
          },
        ]}
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
      <View style={styles.content}>
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
                    />
                  ))}
              </View>
              <ThemedText style={[styles.englishText, { color: colors.englishText }]}>
                {sentence.english}
              </ThemedText>
            </View>
          ))}
      </View>
    </CollapsibleHeader>
  );
}
