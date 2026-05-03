import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, type FC } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SectionLabel } from '@/components/common';
import { PlaylistItemCard } from '@/components/playlist/PlaylistItemCard';
import { COMPLETION_THRESHOLD, LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useSafeBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import { calculateProgressPercentage } from '@/utils/progressUtils';
import { generateStorageUrl } from '@/utils/storageUtils';
import { getArticleMetadataWithoutCategory } from '@/utils/stringUtils';

const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_SPACING = LAYOUT.SPACING.SMALL;
const MAX_ARTICLES = 5;

interface ContinueReadingSectionProps {
  articlesData: Article[];
}

/**
 * Adaptive section that shows:
 * - "Continue Reading" with articles user has partially read (1-94% progress)
 * - OR "Getting Started" with beginner articles (difficulty 1-2) if no in-progress articles
 *
 * Returns null for unauthenticated users or if no articles match criteria.
 */
const ContinueReadingSectionComponent: FC<ContinueReadingSectionProps> = ({ articlesData }) => {
  const { user } = useAuth();
  const router = useRouter();

  // Get all article IDs for bulk progress fetch
  const articleIds = useMemo(() => articlesData.map(a => a.id as ArticleId), [articlesData]);

  // Fetch reading progress for all articles
  const { data: progressMap } = useSafeBulkReadingProgress(articleIds);

  // Determine which articles to show and the section label
  const { articles, sectionLabel, isContinueReading } = useMemo(() => {
    if (!user?.id || articlesData.length === 0) {
      return { articles: [], sectionLabel: '', isContinueReading: false };
    }

    // Find articles with partial progress (1-89%)
    const continueReadingArticles: { article: Article; progress: number; updatedAt: string }[] = [];

    for (const article of articlesData) {
      const progressData = progressMap.get(article.id as ArticleId);
      if (progressData) {
        const percentage = calculateProgressPercentage(
          progressData.last_sentence_read,
          progressData.total_sentences,
        );
        if (percentage > 0 && percentage < COMPLETION_THRESHOLD) {
          continueReadingArticles.push({
            article,
            progress: percentage,
            updatedAt: progressData.updated_at ?? '',
          });
        }
      }
    }

    // If we have in-progress articles, show "Continue Reading"
    if (continueReadingArticles.length > 0) {
      // Sort by most recently read first
      continueReadingArticles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return {
        articles: continueReadingArticles.slice(0, MAX_ARTICLES),
        sectionLabel: STRINGS.CONTINUE_READING,
        isContinueReading: true,
      };
    }

    // Otherwise show "Getting Started" with beginner articles (difficulty 1-2, unread)
    const beginnerArticles: { article: Article; progress: number }[] = [];

    for (const article of articlesData) {
      if (article.difficulty_level <= 2) {
        const progressData = progressMap.get(article.id as ArticleId);
        const percentage = progressData
          ? calculateProgressPercentage(
              progressData.last_sentence_read,
              progressData.total_sentences,
            )
          : 0;
        // Only show unread beginner articles
        if (percentage === 0) {
          beginnerArticles.push({ article, progress: 0 });
        }
      }
    }

    if (beginnerArticles.length === 0) {
      return { articles: [], sectionLabel: '', isContinueReading: false };
    }

    return {
      articles: beginnerArticles.slice(0, MAX_ARTICLES),
      sectionLabel: STRINGS.SECTION_GETTING_STARTED,
      isContinueReading: false,
    };
  }, [user?.id, articlesData, progressMap]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      // For continue reading: resume from progress (disableAutoScroll = false)
      // For getting started: start fresh (disableAutoScroll = true)
      router.push(getArticleRoute(article.id as ArticleId, article.title, !isContinueReading));
    },
    [router, isContinueReading],
  );

  // Don't render if no user or no articles to show
  if (!user?.id || articles.length === 0) {
    return null;
  }

  return (
    <View>
      <SectionLabel title={sectionLabel} density="first" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
      >
        {articles.map(({ article, progress }, index) => (
          <View
            key={`continue-${article.id}`}
            style={index === 0 ? styles.cardContainerFirst : styles.cardContainer}
          >
            <PlaylistItemCard
              title={article.title}
              secondaryText={getArticleMetadataWithoutCategory(article)}
              imageUrl={generateStorageUrl('images', article.image_url)}
              articleId={article.id}
              progressPercentage={progress}
              onPress={() => handleArticlePress(article)}
              compact
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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

export const ContinueReadingSection = memo(ContinueReadingSectionComponent);
ContinueReadingSection.displayName = 'ContinueReadingSection';
