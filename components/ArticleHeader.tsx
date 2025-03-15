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
import type { Article } from '@/types/articles.types';
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
    marginLeft: LAYOUT.SPACING.TINY,
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
  categoryText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '600',
    marginLeft: LAYOUT.SPACING.TINY,
  },
  summaryText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    opacity: LAYOUT.OPACITY.HIGH,
    fontStyle: 'italic',
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
});

export const ArticleHeader: React.FC<ArticleHeaderProps> = ({ article, colors, isDarkMode }) => {
  if (!article) return null;

  const readingTime = article.article_sentences?.length
    ? Math.max(1, Math.ceil(article.article_sentences.length / 10))
    : 3;

  const categoryName = article.category?.name
    ? capitalizeFirstLetter(article.category.name)
    : 'Uncategorized';

  return (
    <View style={styles.articleHeaderContainer}>
      <ThemedText style={styles.articleTitle}>{article.title}</ThemedText>

      <View style={styles.articleMetaContainer}>
        <View style={styles.authorContainer}>
          <Ionicons
            name="person-circle-outline"
            size={20}
            color={colors.text}
            style={{ opacity: LAYOUT.OPACITY.HIGH }}
          />
          <ThemedText style={styles.authorName}>
            {article.author?.name || 'Unknown Author'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.articleInfoContainer}>
        <View style={styles.articleInfoItem}>
          <Ionicons
            name="folder-outline"
            size={16}
            color={colors.tint}
            style={{ opacity: LAYOUT.OPACITY.HIGH }}
          />
          <ThemedText style={[styles.categoryText, { color: colors.tint }]} skipDefaultColor>
            {categoryName}
          </ThemedText>
        </View>

        <View style={styles.articleInfoItem}>
          <Ionicons
            name="time-outline"
            size={16}
            color={colors.text}
            style={{ opacity: LAYOUT.OPACITY.HIGH }}
          />
          <ThemedText style={styles.articleInfoText}>{readingTime} min read</ThemedText>
        </View>

        <View style={styles.articleInfoItem}>
          <Ionicons
            name="stats-chart-outline"
            size={16}
            color={colors.text}
            style={{ opacity: LAYOUT.OPACITY.HIGH }}
          />
          <ThemedText style={styles.articleInfoText}>Level {article.difficulty_level}</ThemedText>
        </View>
      </View>

      {article.summary && (
        <ThemedText
          style={[
            styles.summaryText,
            {
              borderLeftWidth: LAYOUT.BORDER.WIDTH.THIN,
              borderLeftColor: `${colors.text}${isDarkMode ? '30' : '20'}`,
              paddingLeft: LAYOUT.SPACING.MEDIUM,
            },
          ]}
        >
          {article.summary}
        </ThemedText>
      )}
    </View>
  );
};

export default ArticleHeader;
