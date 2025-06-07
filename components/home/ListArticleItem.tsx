import type { JSX} from 'react';
import React, { memo } from 'react';

import { ThemedText } from '@/components/ThemedText';
import type { Article } from '@/types/articles.types';
import { formatTimeAgo } from '@/utils/dateUtils';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

import { ArticleCard } from './ArticleCard';

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
      author={article.author?.name || 'Author'}
      title={article.title}
      meta={
        <ThemedText colorName="textTertiary" type="caption">
          · {timeAgoText} · {category}
        </ThemedText>
      }
      onPress={() => onPress(article)}
    />
  );
});

ListArticleItem.displayName = 'ListArticleItem';

export default ListArticleItem;
