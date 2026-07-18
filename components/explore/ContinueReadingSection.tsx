import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, type FC } from 'react';
import { View } from 'react-native';

import { SectionLabel } from '@/components/common';
import { COMPLETION_THRESHOLD } from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useSafeBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import { pickStarterArticles } from '@/utils/articleUtils';
import { calculateProgressPercentage } from '@/utils/progressUtils';

import { ArticleRail } from './ArticleRail';

const MAX_ARTICLES = 5;

interface ContinueReadingSectionProps {
  articlesData: Article[];
}

/**
 * Adaptive section that shows:
 * - "Continue Reading" with articles user has partially read (1-94% progress)
 * - OR "Getting Started" via the starter-article cascade (beginner-first with
 *   fallbacks), so a start-here rail always renders when articles exist
 */
const ContinueReadingSectionComponent: FC<ContinueReadingSectionProps> = ({ articlesData }) => {
  const router = useRouter();

  // Get all article IDs for bulk progress fetch
  const articleIds = useMemo(() => articlesData.map(a => a.id as ArticleId), [articlesData]);

  // Fetch reading progress for all articles
  const { data: progressMap } = useSafeBulkReadingProgress(articleIds);

  // Determine which articles to show and the section label
  const { articles, sectionLabel, isContinueReading } = useMemo(() => {
    if (articlesData.length === 0) {
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

    // Otherwise show "Getting Started" via the starter cascade (unread beginner
    // articles first, with fallbacks so the rail never silently disappears)
    return {
      articles: pickStarterArticles(articlesData, progressMap, MAX_ARTICLES),
      sectionLabel: STRINGS.SECTION_GETTING_STARTED,
      isContinueReading: false,
    };
  }, [articlesData, progressMap]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      // For continue reading: resume from progress (disableAutoScroll = false)
      // For getting started: start fresh (disableAutoScroll = true)
      router.push(getArticleRoute(article.id as ArticleId, article.title, !isContinueReading));
    },
    [router, isContinueReading],
  );

  // Don't render until the catalog has loaded (ArticleList owns loading/empty UI)
  if (articles.length === 0) {
    return null;
  }

  return (
    <View>
      <SectionLabel title={sectionLabel} density="first" />
      <ArticleRail items={articles} keyPrefix="continue" onArticlePress={handleArticlePress} />
    </View>
  );
};

export const ContinueReadingSection = memo(ContinueReadingSectionComponent);
ContinueReadingSection.displayName = 'ContinueReadingSection';
