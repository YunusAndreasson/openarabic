import type { JSX } from 'react';
import React, { memo } from 'react';

import type { Article } from '@/types/articles.types';

import { ArticleCard } from './ArticleCard';

interface ListArticleItemProps {
  article: Article;
  onPress: (article: Article) => void;
}

const ListArticleItem = memo(({ article, onPress }: ListArticleItemProps): JSX.Element => {
  return (
    <ArticleCard
      author={article.author?.name || 'Author'}
      title={article.title}
      onPress={() => onPress(article)}
    />
  );
});

ListArticleItem.displayName = 'ListArticleItem';

export default ListArticleItem;
