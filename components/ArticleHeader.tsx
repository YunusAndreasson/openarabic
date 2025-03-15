import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Components
import { ThemedText } from '@/components/ThemedText';

// Utils
import { capitalizeFirstLetter } from '@/utils/stringUtils';

// Constants
import { LAYOUT } from '@/constants/layout';

// Types
import { ArticleHeaderProps } from '@/types/ui.types';

const styles = StyleSheet.create({
  articleHeaderContainer: {
    paddingHorizontal: 15,
    paddingVertical: LAYOUT.SPACING.XLARGE,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  articleTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    fontWeight: '700',
    marginBottom: LAYOUT.SPACING.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
  },
  articleMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorName: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    opacity: LAYOUT.OPACITY.HIGH,
  },
  articleInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  articleInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  articleInfoText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    marginLeft: LAYOUT.SPACING.TINY,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  summaryText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    opacity: LAYOUT.OPACITY.HIGH,
    fontStyle: 'italic',
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
});

export const ArticleHeader: React.FC<ArticleHeaderProps> = ({ article, colors }) => {
  if (!article) return null;

  const readingTime = article.article_sentences?.length
    ? Math.max(1, Math.ceil(article.article_sentences.length / 10))
    : 3;

  const categoryName = article.category?.name
    ? capitalizeFirstLetter(article.category.name)
    : 'Uncategorized';

  return (
    <View style={styles.articleHeaderContainer}>
      <ThemedText style={styles.articleTitle} accessibilityRole="header">
        {article.title}
      </ThemedText>

      <View style={styles.articleMetaContainer}>
        <View style={styles.authorContainer}>
          <ThemedText
            style={styles.authorName}
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
            style={{ opacity: LAYOUT.OPACITY.HIGH }}
            accessibilityLabel="Category"
          />
          <ThemedText
            style={styles.articleInfoText}
            accessibilityLabel={`Category: ${categoryName}`}
          >
            {categoryName}
          </ThemedText>
        </View>

        <View style={styles.articleInfoItem}>
          <Ionicons
            name="time-outline"
            size={16}
            color={colors.text}
            style={{ opacity: LAYOUT.OPACITY.HIGH }}
            accessibilityLabel="Reading time"
          />
          <ThemedText
            style={styles.articleInfoText}
            accessibilityLabel={`Reading time: ${readingTime} minutes`}
          >
            {readingTime} min read
          </ThemedText>
        </View>

        <View style={styles.articleInfoItem}>
          <Ionicons
            name="stats-chart-outline"
            size={16}
            color={colors.text}
            style={{ opacity: LAYOUT.OPACITY.HIGH }}
            accessibilityLabel="Difficulty level"
          />
          <ThemedText
            style={styles.articleInfoText}
            accessibilityLabel={`Difficulty level: ${article.difficulty_level}`}
          >
            Level {article.difficulty_level}
          </ThemedText>
        </View>
      </View>

      {article.summary && (
        <ThemedText
          style={styles.summaryText}
          accessibilityLabel={`Article summary: ${article.summary}`}
        >
          {article.summary}
        </ThemedText>
      )}
    </View>
  );
};

export default ArticleHeader;
