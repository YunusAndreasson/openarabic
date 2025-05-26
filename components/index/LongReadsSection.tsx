import React, { useMemo } from 'react';
import { ArticleSection } from '@/components/article';
import { getLongestArticles } from '../../utils/articleUtils';
import type { Article } from '../../types/articles.types';

interface LongReadsSectionProps {
  articles: Article[];
  onArticlePress: (article: Article) => void;
  limit?: number;
  minReadingTime?: number;
}

export const LongReadsSection: React.FC<LongReadsSectionProps> = ({
  articles,
  onArticlePress,
  limit = 10,
  minReadingTime = 1,
}) => {
  const longReadsArticles = useMemo(() => {
    const articlesWithReadingTime = getLongestArticles(articles, limit, minReadingTime);
    return articlesWithReadingTime.map(({ readingTime, ...article }) => article);
  }, [articles, limit, minReadingTime]);

  if (longReadsArticles.length === 0) return null;

  return (
    <ArticleSection
      title="Long Reads"
      articles={longReadsArticles}
      onArticlePress={onArticlePress}
      hideDifficulty={true}
    />
  );
};

export default LongReadsSection;
