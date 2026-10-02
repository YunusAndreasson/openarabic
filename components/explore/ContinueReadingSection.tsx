import { useRouter } from 'expo-router';
import { Fragment, memo, useCallback, useMemo } from 'react';

import { SectionLabel } from '@/components/common';
import { COMPLETION_THRESHOLD } from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import type { Article } from '@/types/articles.types';
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
const ContinueReadingSectionComponent = ({ articlesData }: ContinueReadingSectionProps) => {
  const router = useRouter();

  // Get all article IDs for bulk progress fetch
  const articleIds = useMemo(() => articlesData.map(a => a.id), [articlesData]);

  // Fetch reading progress for all articles
  const { data: progressMap } = useBulkReadingProgress(articleIds);

  // Determine which articles to show and the section label
  const { articles, sectionLabel, isContinueReading } = useMemo(() => {
    if (articlesData.length === 0) {
      return { articles: [], sectionLabel: '', isContinueReading: false };
    }

    // Find articles with partial progress (1-89%)
    const continueReadingArticles: { article: Article; progress: number; updatedAt: string }[] = [];

    for (const article of articlesData) {
      const progressData = progressMap.get(article.id);
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
      router.push(getArticleRoute(article.id, article.title, !isContinueReading));
    },
    [router, isContinueReading],
  );

  // Don't render until the catalog has loaded (ArticleList owns loading/empty UI)
  if (articles.length === 0) {
    return null;
  }

  return (
    <Fragment>
      <SectionLabel title={sectionLabel} density="first" />
      <ArticleRail items={articles} keyPrefix="continue" onArticlePress={handleArticlePress} />
    </Fragment>
  );
};

export const ContinueReadingSection = memo(ContinueReadingSectionComponent);
ContinueReadingSection.displayName = 'ContinueReadingSection';
