import React, { JSX, memo } from 'react';

import { ArticleCard } from '@/components/ArticleCard';
import { ThemedText } from '@/components/ThemedText';
import type { Article } from '@/types/articles.types';
import { formatTimeAgo } from '@/utils/dateUtils';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

interface ListArticleItemProps {
  article: Article;
  onPress: (article: Article) => void;
}

const ListArticleItem = memo(({ article, onPress }: ListArticleItemProps): JSX.Element => {
  const categoryName = article.category?.name
    ? capitalizeFirstLetter(article.category.name)
    : 'Uncategorized';
  const timeAgoText = formatTimeAgo(article.created_at);

  return (
    <ArticleCard
      title={article.title}
      author={article.author?.name || 'Anonymous'}
      meta={
        <ThemedText type="caption" colorName="textTertiary">
          {timeAgoText} · {categoryName}
        </ThemedText>
      }
      onPress={() => onPress(article)}
    />
  );
});

ListArticleItem.displayName = 'ListArticleItem';

export default ListArticleItem;
