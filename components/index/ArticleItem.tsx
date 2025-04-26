import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import type { Article } from '@/types/articles.types';
import { formatTimeAgo } from '@/utils/dateUtils';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

const styles = StyleSheet.create({
  arrowText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  articleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  articleItemPadding: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  card: {
    overflow: 'hidden',
  },
  cardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.MEDIUM,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: LAYOUT.SPACING.XLARGE,
  },
  metadataText: {
    marginTop: LAYOUT.SPACING.TINY / 2,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  textContent: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  titleText: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
});

interface ArticleItemProps {
  article: Article;
  onPress: (article: Article) => void;
}

const ArticleItem = memo(({ article, onPress }: ArticleItemProps): JSX.Element => {
  const categoryName = article.category?.name
    ? capitalizeFirstLetter(article.category.name)
    : 'Uncategorized';

  const isDarkMode = useIsDarkMode();
  const timeAgoText = formatTimeAgo(article.created_at);

  return (
    <View style={[styles.articleContainer, styles.articleItemPadding]}>
      <BaseCard onPress={() => onPress(article)} style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.textContent}>
            <ThemedText
              type="bodyBold"
              numberOfLines={2}
              colorName="text"
              weight="semibold"
              style={styles.titleText}
            >
              {article.title}
            </ThemedText>
            <ThemedText
              type="caption"
              colorName="textTertiary"
              numberOfLines={1}
              style={styles.metadataText}
            >
              {timeAgoText} · {categoryName} · by {article.author?.name || 'Anonymous'}
            </ThemedText>
          </View>
          <View style={styles.iconContainer}>
            <ThemedText
              type="heading3"
              colorName="textTertiary"
              variant={isDarkMode ? 'primary' : 'secondary'}
              style={styles.arrowText}
            >
              →
            </ThemedText>
          </View>
        </View>
      </BaseCard>
    </View>
  );
});

ArticleItem.displayName = 'ArticleItem';

export default ArticleItem;
