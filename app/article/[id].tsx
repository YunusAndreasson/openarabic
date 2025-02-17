import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Article } from '@/types/articles.types';
import { articlesService } from '@/services/articles';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { CollapsibleHeader } from '@/components/CollapsibleHeader';
import { AudioPlayButton } from '@/components/AudioPlayButton';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  category: {
    marginBottom: 8,
    fontSize: 14,
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
  arabicText: {
    textAlign: 'right',
    fontSize: 32,
    lineHeight: 48,
    marginBottom: 16,
    writingDirection: 'rtl',
    fontFamily: 'NotoNaskhArabic',
    includeFontPadding: false,
  },
  content: {
    flex: 1,
  },
});

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const colors = useColors();

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        if (id) {
          const data = await articlesService.getArticleById(parseInt(id));
          setArticle(data);
        }
      } catch (error) {
        throw error;
      }
    };

    fetchArticle();
  }, [id]);

  if (!article) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  const renderHeaderContent = () => (
    <>
      {article.category && (
        <ThemedText
          style={[styles.category, { color: colors.categoryText }]}
          type="defaultSemiBold"
        >
          {article.category.name.toUpperCase()}
        </ThemedText>
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
    </>
  );

  return (
    <CollapsibleHeader renderContent={renderHeaderContent} title={article?.title || ''}>
      <View style={styles.content}>
        {article.audio_url && <AudioPlayButton audioUrl={article.audio_url} />}
        {article.article_sentences
          .sort((a, b) => a.position - b.position)
          .map(sentence => (
            <View key={sentence.id} style={styles.sentenceContainer}>
              <ThemedText style={[styles.arabicText, { color: colors.arabicText }]}>
                {sentence.arabic}
              </ThemedText>
              <ThemedText style={[styles.englishText, { color: colors.englishText }]}>
                {sentence.english}
              </ThemedText>
            </View>
          ))}
      </View>
    </CollapsibleHeader>
  );
}
