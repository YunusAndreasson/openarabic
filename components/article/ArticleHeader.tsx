import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '../../components/ThemedText';
import { LAYOUT } from '../../constants/layout';
import type { Article } from '../../types/articles.types';
import { capitalizeFirstLetter } from '../../utils/stringUtils';

// Define the props interface locally
interface ArticleHeaderProps {
  article: Article;
  colors: {
    text: string;
    [key: string]: string;
  };
}

const styles = StyleSheet.create({
  articleHeaderContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.SMALL,
  },
  articleInfoContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  articleInfoItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: LAYOUT.SPACING.TINY,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  articleMetaContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  authorContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  infoIcon: {
    opacity: LAYOUT.OPACITY.HIGH,
  },
  infoTextContainer: {
    marginLeft: LAYOUT.SPACING.TINY,
  },
  summaryContainer: {
    paddingTop: LAYOUT.SPACING.SMALL,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
});

export const ArticleHeader: React.FC<ArticleHeaderProps> = ({ article, colors }) => {
  // Calculate reading time based on sentences count or summary length
  const readingTime = useMemo(() => {
    if (!article) return 2;

    // If we have article_sentences array, use its length
    if (article.article_sentences?.length) {
      return Math.max(1, Math.ceil(article.article_sentences.length / 10));
    }

    // Otherwise estimate based on summary length (assuming ~15 words per sentence)
    if (article.summary) {
      const wordCount = article.summary.split(/\s+/).length;
      const estimatedSentences = Math.ceil(wordCount / 15);
      return Math.max(1, Math.ceil(estimatedSentences / 10));
    }

    // Default fallback
    return 2;
  }, [article]);

  if (!article) return null;

  const categoryName = article.category?.name
    ? capitalizeFirstLetter(article.category.name)
    : 'Uncategorized';

  return (
    <View style={styles.articleHeaderContainer}>
      <View style={styles.titleContainer}>
        <ThemedText type="heading1" accessibilityRole="header">
          {article.title}
        </ThemedText>
      </View>

      <View style={styles.articleMetaContainer}>
        <View style={styles.authorContainer}>
          <ThemedText
            type="label"
            variant="secondary"
            accessibilityLabel={`Written by ${article.author?.name || 'Unknown Author'}`}
          >
            {article.author?.name || 'Unknown Author'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.articleInfoContainer}>
        <View style={styles.articleInfoItem}>
          <Ionicons
            name="folder-outline"
            size={16}
            color={colors.text}
            style={styles.infoIcon}
            accessibilityLabel="Category"
          />
          <View style={styles.infoTextContainer}>
            <ThemedText
              type="caption"
              variant="secondary"
              accessibilityLabel={`Category: ${categoryName}`}
            >
              {categoryName}
            </ThemedText>
          </View>
        </View>

        <View style={styles.articleInfoItem}>
          <Ionicons
            name="time-outline"
            size={16}
            color={colors.text}
            style={styles.infoIcon}
            accessibilityLabel="Reading time"
          />
          <View style={styles.infoTextContainer}>
            <ThemedText
              type="caption"
              variant="secondary"
              accessibilityLabel={`Reading time: ${readingTime} minutes`}
            >
              {readingTime} min read
            </ThemedText>
          </View>
        </View>

        <View style={styles.articleInfoItem}>
          <Ionicons
            name="stats-chart-outline"
            size={16}
            color={colors.text}
            style={styles.infoIcon}
            accessibilityLabel="Difficulty level"
          />
          <View style={styles.infoTextContainer}>
            <ThemedText
              type="caption"
              variant="secondary"
              accessibilityLabel={`Difficulty level: ${article.difficulty_level}`}
            >
              Level {article.difficulty_level}
            </ThemedText>
          </View>
        </View>
      </View>

      {article.summary ? (
        <View style={styles.summaryContainer}>
          <ThemedText
            type="body"
            variant="subtle"
            accessibilityLabel={`Article summary: ${article.summary}`}
          >
            {article.summary}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
};

export default ArticleHeader;
