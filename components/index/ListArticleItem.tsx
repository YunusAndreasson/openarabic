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
  const category = article.category?.name
    ? capitalizeFirstLetter(article.category.name)
    : 'General';
  const timeAgoText = formatTimeAgo(article.created_at);

  return (
    <ArticleCard
      title={article.title}
      author={article.author?.name || 'Author'}
      meta={
        <ThemedText type="caption" colorName="textTertiary">
          · {timeAgoText} · {category}
        </ThemedText>
      }
      onPress={() => onPress(article)}
    />
  );
});

ListArticleItem.displayName = 'ListArticleItem';

export default ListArticleItem;
