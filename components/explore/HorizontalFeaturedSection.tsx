import type { JSX } from 'react';

import { SectionLabel } from '@/components/common';
import { STRINGS } from '@/constants/strings';
import type { Article } from '@/types/articles.types';

import { HorizontalArticleSlider } from './HorizontalArticleSlider';

interface HorizontalFeaturedSectionProps {
  /** Chosen by `useExploreRails`, already free of texts another rail shows */
  articles: Article[];
  /**
   * First section under the header or the checklist — the 12px lead-in rather
   * than the 24px section gap. True when there is no lead rail above it.
   */
  isFirst?: boolean;
}

export function HorizontalFeaturedSection({
  articles,
  isFirst = false,
}: HorizontalFeaturedSectionProps): JSX.Element | null {
  if (articles.length === 0) return null;

  return (
    <>
      <SectionLabel title={STRINGS.SECTION_FEATURED} density={isFirst ? 'first' : 'comfortable'} />
      <HorizontalArticleSlider articles={articles} />
    </>
  );
}

HorizontalFeaturedSection.displayName = 'HorizontalFeaturedSection';
