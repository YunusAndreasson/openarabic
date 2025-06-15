import type { JSX } from 'react';
import React, { memo, useCallback } from 'react';

import type { Article } from '@/types/articles.types';

import { ArticleCard } from './ArticleCard';

interface ListArticleItemProps {
  article: Article;
  onPress: (article: Article) => void;
}

const ListArticleItem = memo(({ article, onPress }: ListArticleItemProps): JSX.Element => {
  const handlePress = useCallback(() => onPress(article), [onPress, article]);

  return <ArticleCard author={article.author.name} title={article.title} onPress={handlePress} />;
});

ListArticleItem.displayName = 'ListArticleItem';

export default ListArticleItem;
