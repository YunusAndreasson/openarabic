import { memo, useMemo, type FC } from 'react';
import { View } from 'react-native';

import { SectionLabel } from '@/components/common';
import { HorizontalArticleSlider } from '@/components/explore/HorizontalArticleSlider';
import { COMPLETION_THRESHOLD } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useSafeBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import { calculateProgressPercentage } from '@/utils/progressUtils';

const MAX_ARTICLES = 4;
/** Long articles have ≥20 sentences (~5+ min reading time at 4 sentences/min) */
const LONG_ARTICLE_MIN_SENTENCES = 20;

interface LongReadsSectionProps {
  articlesData: Article[];
}

/**
 * "Long reads" section surfacing longer unread articles.
 * Complements "For You" by highlighting meatier content users might scroll past.
 */
const LongReadsSectionComponent: FC<LongReadsSectionProps> = ({ articlesData }) => {
  const articleIds = useMemo(() => articlesData.map(a => a.id as ArticleId), [articlesData]);

  const { data: progressMap } = useSafeBulkReadingProgress(articleIds);

  const displayArticles = useMemo(() => {
    if (articlesData.length === 0) return [];

    const candidates: Article[] = [];

    for (const article of articlesData) {
      const sentenceCount = article.article_sentences?.length ?? 0;
      if (sentenceCount < LONG_ARTICLE_MIN_SENTENCES) continue;

      const progressData = progressMap.get(article.id as ArticleId);
      const percentage = progressData
        ? calculateProgressPercentage(progressData.last_sentence_read, progressData.total_sentences)
        : 0;

      if (percentage < COMPLETION_THRESHOLD) {
        candidates.push(article);
      }
    }

    // Shuffle and pick a few
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = candidates[i]!;
      candidates[i] = candidates[j]!;
      candidates[j] = temp;
    }

    return candidates.slice(0, MAX_ARTICLES);
  }, [articlesData, progressMap]);

  if (displayArticles.length === 0) return null;

  return (
    <View>
      <SectionLabel title={STRINGS.SECTION_LONG_READS} />
      <HorizontalArticleSlider articles={displayArticles} />
    </View>
  );
};

export const LongReadsSection = memo(LongReadsSectionComponent);
LongReadsSection.displayName = 'LongReadsSection';
