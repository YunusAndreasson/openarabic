import { useRouter } from 'expo-router';
import { Fragment, memo, useCallback } from 'react';

import { SectionLabel } from '@/components/common';
import { getArticleRoute } from '@/utils/routeBuilders';
import type { LeadRail } from '@/hooks/explore/useExploreRails';
import type { Article } from '@/types/articles.types';

import { ArticleRail } from './ArticleRail';

interface ContinueReadingSectionProps {
  rail: LeadRail;
}

/**
 * The rail at the top of Explore: "Continue reading" (part-read texts, resumed
 * where the learner stopped) or "Getting started" (starter texts, opened at the
 * top). Which one, and which texts, is decided by `useExploreRails`.
 */
const ContinueReadingSectionComponent = ({ rail }: ContinueReadingSectionProps) => {
  const router = useRouter();
  const { resumes } = rail;

  const handleArticlePress = useCallback(
    (article: Article) => {
      // `disableAutoScroll` is the inverse of resuming
      router.push(getArticleRoute(article.id, { disableAutoScroll: !resumes }));
    },
    [router, resumes],
  );

  return (
    <Fragment>
      <SectionLabel title={rail.title} density="first" />
      <ArticleRail items={rail.items} keyPrefix="continue" onArticlePress={handleArticlePress} />
    </Fragment>
  );
};

export const ContinueReadingSection = memo(ContinueReadingSectionComponent);
ContinueReadingSection.displayName = 'ContinueReadingSection';
