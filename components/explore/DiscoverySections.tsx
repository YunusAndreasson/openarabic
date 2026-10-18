import { useRouter } from 'expo-router';
import { Fragment, memo, useCallback } from 'react';

import { SectionLabel } from '@/components/common';
import { getArticleRoute } from '@/constants/routes';
import type { DiscoveryRail } from '@/hooks/explore/useExploreRails';
import type { Article } from '@/types/articles.types';

import { ArticleRail } from './ArticleRail';

interface DiscoverySectionsProps {
  /** Chosen by `useExploreRails`: unread texts, none shown elsewhere on the tab */
  rails: DiscoveryRail[];
}

/**
 * The browse rails under the topic grid: Beginner friendly, Quick reads, Deep
 * dives, Advanced. They hold unread texts only, so every card opens at the top.
 */
const DiscoverySectionsComponent = ({ rails }: DiscoverySectionsProps) => {
  const router = useRouter();

  const handleArticlePress = useCallback(
    (article: Article) => {
      router.push(getArticleRoute(article.id, article.title, true));
    },
    [router],
  );

  if (rails.length === 0) return null;

  return (
    <>
      {rails.map((rail, railIndex) => (
        <Fragment key={rail.key}>
          <SectionLabel title={rail.title} density={railIndex === 0 ? 'comfortable' : 'compact'} />
          <ArticleRail
            items={rail.items}
            keyPrefix={rail.key}
            onArticlePress={handleArticlePress}
          />
        </Fragment>
      ))}
    </>
  );
};

export const DiscoverySections = memo(DiscoverySectionsComponent);
DiscoverySections.displayName = 'DiscoverySections';
