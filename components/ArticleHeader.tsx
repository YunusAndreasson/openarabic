import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
import { CategoryPill } from './CategoryPill';
import { AudioPlayButton } from './AudioPlayButton';
import { ReadingListButton } from './ReadingListButton';
import type { Article } from '@/types/articles.types';

export interface ArticleHeaderProps {
  article: Article | null;
  headerTextColor: string;
  isDarkMode: boolean;
  textShadowStyle: any;
}

const styles = StyleSheet.create({
  categoryContainer: {
    alignSelf: 'flex-start',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  title: {
    textAlign: 'left',
    marginBottom: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  titleBold: {
    fontWeight: '800',
  },
  author: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    letterSpacing: 0.2,
  },
  authorBold: {
    fontWeight: '600',
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
  textShadow: {
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export const ArticleHeader = React.memo(
  ({ article, headerTextColor, isDarkMode, textShadowStyle }: ArticleHeaderProps) => {
    if (!article) return null;

    return (
      <>
        {article.category && (
          <View style={styles.categoryContainer}>
            <CategoryPill category={article.category.name} absolute={false} />
          </View>
        )}
        <ThemedText
          type="title"
          style={[
            styles.title,
            styles.titleBold,
            { color: headerTextColor },
            isDarkMode && styles.textShadow,
            textShadowStyle,
          ]}
          skipDefaultColor
          numberOfLines={3}
        >
          {article.title}
        </ThemedText>
        {article.author && (
          <ThemedText
            style={[
              styles.author,
              styles.authorBold,
              { color: headerTextColor },
              isDarkMode && styles.textShadow,
              textShadowStyle,
            ]}
            skipDefaultColor
          >
            By {article.author.name}
          </ThemedText>
        )}
        <View style={styles.buttonContainer}>
          {article.audio_url && (
            <View style={styles.buttonWrapper}>
              <AudioPlayButton audioUrl={article.audio_url} />
            </View>
          )}
          {article.id && (
            <View style={styles.buttonWrapper}>
              <ReadingListButton articleId={article.id} />
            </View>
          )}
        </View>
      </>
    );
  }
);
