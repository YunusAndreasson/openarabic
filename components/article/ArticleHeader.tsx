import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { ThemedText } from '../../components/ThemedText';
import { LAYOUT } from '../../constants/layout';
import { formatDifficultyLevel } from '../../services/difficultyLevel';
import type { Article } from '../../types/articles.types';
import { capitalizeFirstLetter } from '../../utils/stringUtils';

// Define the props interface locally
interface ArticleHeaderProps {
  article: Article;
  colors: {
    text: string;
    [key: string]: string;
  };
  onAuthorPress?: (author: Article['author']) => void;
  onCategoryPress?: (category: Article['category']) => void;
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

export const ArticleHeader: React.FC<ArticleHeaderProps> = ({
  article,
  colors,
  onAuthorPress,
  onCategoryPress,
}) => {
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
    : 'General';

  const handleAuthorPress = () => {
    if (onAuthorPress && article.author) {
      onAuthorPress(article.author);
    }
  };

  const handleCategoryPress = () => {
    if (onCategoryPress && article.category) {
      onCategoryPress(article.category);
    }
  };

  return (
    <View style={styles.articleHeaderContainer}>
      <View style={styles.titleContainer}>
        <ThemedText accessibilityRole="header" type="heading1">
          {article.title}
        </ThemedText>
      </View>

      <View style={styles.articleMetaContainer}>
        <TouchableOpacity
          disabled={!article.author || !onAuthorPress}
          style={styles.authorContainer}
          onPress={article.author && onAuthorPress ? handleAuthorPress : undefined}
        >
          <ThemedText
            accessibilityLabel={`Written by ${article.author?.name || 'Author'}`}
            type="label"
            variant="secondary"
          >
            {article.author?.name || 'Author'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.articleInfoContainer}>
        <TouchableOpacity
          disabled={!article.category || !onCategoryPress}
          style={styles.articleInfoItem}
          onPress={article.category && onCategoryPress ? handleCategoryPress : undefined}
        >
          <Ionicons
            accessibilityLabel="Category"
            color={colors.text}
            name="folder-outline"
            size={16}
            style={styles.infoIcon}
          />
          <View style={styles.infoTextContainer}>
            <ThemedText
              accessibilityLabel={`Category: ${categoryName}`}
              type="caption"
              variant="secondary"
            >
              {categoryName}
            </ThemedText>
          </View>
        </TouchableOpacity>

        <View style={styles.articleInfoItem}>
          <Ionicons
            accessibilityLabel="Reading time"
            color={colors.text}
            name="time-outline"
            size={16}
            style={styles.infoIcon}
          />
          <View style={styles.infoTextContainer}>
            <ThemedText
              accessibilityLabel={`Reading time: ${readingTime} minutes`}
              type="caption"
              variant="secondary"
            >
              {readingTime} min read
            </ThemedText>
          </View>
        </View>

        <View style={styles.articleInfoItem}>
          <Ionicons
            accessibilityLabel="Difficulty level"
            color={colors.text}
            name="stats-chart-outline"
            size={16}
            style={styles.infoIcon}
          />
          <View style={styles.infoTextContainer}>
            <ThemedText
              accessibilityLabel={`Difficulty level: ${formatDifficultyLevel(article.difficulty_level)}`}
              type="caption"
              variant="secondary"
            >
              {formatDifficultyLevel(article.difficulty_level)}
            </ThemedText>
          </View>
        </View>
      </View>

      {article.summary ? (
        <View style={styles.summaryContainer}>
          <ThemedText
            accessibilityLabel={`Article summary: ${article.summary}`}
            type="body"
            variant="subtle"
            style={{
              lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
            }}
          >
            {article.summary}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
};

export default ArticleHeader;
