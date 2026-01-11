import { useRouter } from 'expo-router';
import { memo, useMemo, type FC } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SectionLabel } from '@/components/common';
import { PlaylistItemCard } from '@/components/playlist/PlaylistItemCard';
import { COMPLETION_THRESHOLD, LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useSafeBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import { calculateProgressPercentage } from '@/utils/progressUtils';
import { generateStorageUrl } from '@/utils/storageUtils';
import { getArticleMetadataWithoutTime } from '@/utils/stringUtils';

const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_SPACING = LAYOUT.SPACING.SMALL;
const MAX_ARTICLES = 5;
/** Short articles are ≤2 minutes (≤8 sentences at 4 sentences/min) */
const SHORT_ARTICLE_MAX_SENTENCES = 8;

interface QuickReadsSectionProps {
  articlesData: Article[];
}

/**
 * "Quick reads" section showing short articles (≤2 min).
 *
 * Selection logic:
 * - Filter to articles with ≤8 sentences (≤2 min reading time)
 * - Prioritize unread articles
 * - Show up to 5 articles
 */
const QuickReadsSectionComponent: FC<QuickReadsSectionProps> = ({ articlesData }) => {
  const router = useRouter();

  // Get all article IDs for bulk progress fetch
  const articleIds = useMemo(
    () => articlesData.map(a => a.id as ArticleId),
    [articlesData],
  );

  // Fetch reading progress for all articles
  const { data: progressMap } = useSafeBulkReadingProgress(articleIds);

  // Find short unread articles
  const displayArticles = useMemo(() => {
    if (articlesData.length === 0) return [];

    const shortArticles: { article: Article; progress: number }[] = [];

    for (const article of articlesData) {
      const sentenceCount = article.article_sentences?.length ?? 0;

      // Only include short articles (≤2 min)
      if (sentenceCount > SHORT_ARTICLE_MAX_SENTENCES) continue;

      // Check if unread
      const progressData = progressMap.get(article.id as ArticleId);
      const percentage = progressData
        ? calculateProgressPercentage(
            progressData.last_sentence_read,
            progressData.total_sentences,
          )
        : 0;

      // Only show unread or in-progress (not completed)
      if (percentage < COMPLETION_THRESHOLD) {
        shortArticles.push({ article, progress: percentage });
      }
    }

    // Sort: unread first (progress 0), then by progress ascending
    shortArticles.sort((a, b) => a.progress - b.progress);

    return shortArticles.slice(0, MAX_ARTICLES);
  }, [articlesData, progressMap]);

  // Don't render if no short articles found
  if (displayArticles.length === 0) {
    return null;
  }

  const handleArticlePress = (article: Article) => {
    router.push(getArticleRoute(article.id as ArticleId, article.title));
  };

  return (
    <View style={styles.container}>
      <SectionLabel title={STRINGS.SECTION_QUICK_READS} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
      >
        {displayArticles.map(({ article, progress }, index) => (
          <View
            key={`quick-read-${article.id}`}
            style={index === 0 ? styles.cardContainerFirst : styles.cardContainer}
          >
            <PlaylistItemCard
              title={article.title}
              secondaryText={getArticleMetadataWithoutTime(article)}
              imageUrl={generateStorageUrl('images', article.image_url)}
              articleId={article.id}
              progressPercentage={progress}
              onPress={() => handleArticlePress(article)}
              shouldAnimateOnMount={false}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  scrollContent: {
    paddingRight: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
  cardContainerFirst: {
    width: CARD_WIDTH,
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginLeft: CARD_SPACING,
  },
});

export const QuickReadsSection = memo(QuickReadsSectionComponent);
QuickReadsSection.displayName = 'QuickReadsSection';
