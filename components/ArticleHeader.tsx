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
  titleContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  articleMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  infoIcon: {
    opacity: LAYOUT.OPACITY.HIGH,
  },
  infoTextContainer: {
    marginLeft: LAYOUT.SPACING.TINY,
  },
  summaryContainer: {
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

      {article.summary && (
        <View style={styles.summaryContainer}>
          <ThemedText
            type="body"
            variant="subtle"
            accessibilityLabel={`Article summary: ${article.summary}`}
          >
            {article.summary}
          </ThemedText>
        </View>
      )}
    </View>
  );
};

export default ArticleHeader;
