import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Article } from '@/types/articles.types';
import { articlesService } from '@/services/articles';
import { ThemedText } from '@/components/ThemedText';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { Colors } from '@/constants/Colors';
import { useAppSelector } from '@/store/hooks';

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const { theme } = useAppSelector(state => state.theme);
  const themeColors = Colors[theme];

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

  return (
    <ParallaxScrollView
      headerImage={
        <View style={styles.headerContainer}>
          <ThemedText type="title" style={styles.title}>
            {article.title}
          </ThemedText>
          {article.category && (
            <ThemedText style={styles.category} type="defaultSemiBold">
              {article.category.name.toUpperCase()}
            </ThemedText>
          )}
          {article.author && (
            <ThemedText style={styles.author}>By {article.author.name}</ThemedText>
          )}
        </View>
      }
    >
      {article.article_sentences
        .sort((a, b) => a.position - b.position)
        .map((sentence, index) => (
          <View key={sentence.id} style={styles.sentenceContainer}>
            <ThemedText
              style={[
                styles.arabicText,
                {
                  color: themeColors.arabicText,
                },
              ]}
            >
              {sentence.arabic}
            </ThemedText>
            <ThemedText
              style={[
                styles.englishText,
                {
                  color: themeColors.englishText,
                },
              ]}
            >
              {sentence.english}
            </ThemedText>
            {index < article.article_sentences.length - 1 && (
              <View style={[styles.divider, { backgroundColor: themeColors.text }]} />
            )}
          </View>
        ))}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  category: {
    marginBottom: 4,
    opacity: 0.7,
  },
  author: {
    opacity: 0.7,
  },
  sentenceContainer: {
    marginBottom: 24,
  },
  englishText: {
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 8,
    writingDirection: 'ltr',
    fontFamily: 'Philosopher',
    textAlign: 'left',
  },
  arabicText: {
    textAlign: 'right',
    fontSize: 30,
    lineHeight: 50,
    marginBottom: 12,
    writingDirection: 'rtl',
    fontFamily: 'NotoNaskhArabic',
    letterSpacing: 1.3,
  },
  divider: {
    height: 1,
    opacity: 0.1,
    marginTop: 8,
  },
});
