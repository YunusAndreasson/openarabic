import React, { JSX, memo } from 'react';

import { ArticleCard } from '@/components/ArticleCard';
import { ThemedText } from '@/components/ThemedText';
import type { Article } from '@/types/articles.types';
import { formatTimeAgo } from '@/utils/dateUtils';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

interface ArticleItemProps {
  article: Article;
  onPress: (article: Article) => void;
}

const ArticleItem = memo(({ article, onPress }: ArticleItemProps): JSX.Element => {
  const categoryName = article.category?.name
    ? capitalizeFirstLetter(article.category.name)
    : 'Uncategorized';
  const timeAgoText = formatTimeAgo(article.created_at);

  return (
    <ArticleCard
      title={article.title}
      author={article.author?.name || 'Anonymous'}
      meta={
        <ThemedText type="caption" colorName="textTertiary" style={{ opacity: 0.7 }}>
          {timeAgoText} · {categoryName}
        </ThemedText>
      }
      onPress={() => onPress(article)}
      containerStyle={{}}
    />
  );
});

ArticleItem.displayName = 'ArticleItem';

export default ArticleItem;
