import type { JSX } from 'react';
import React, { memo } from 'react';

import type { Article } from '@/types/articles.types';

import { ArticleCard } from './ArticleCard';

interface ArticleItemProps {
  article: Article;
  onPress: (article: Article) => void;
  isLast?: boolean;
}

const ArticleItem = memo(({ article, onPress, isLast = false }: ArticleItemProps): JSX.Element => {
  return (
    <ArticleCard
      author={article.author?.name || 'Author'}
      containerStyle={isLast ? { marginBottom: 0 } : undefined}
      title={article.title}
      onPress={() => onPress(article)}
    />
  );
});

ArticleItem.displayName = 'ArticleItem';

export default ArticleItem;
