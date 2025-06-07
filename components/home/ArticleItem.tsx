import type { JSX} from 'react';
import React, { memo } from 'react';

import { ThemedText } from '@/components/ThemedText';
import type { Article } from '@/types/articles.types';
import { formatTimeAgo } from '@/utils/dateUtils';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

import { ArticleCard } from './ArticleCard';

interface ArticleItemProps {
  article: Article;
  onPress: (article: Article) => void;
  isLast?: boolean;
}

const ArticleItem = memo(({ article, onPress, isLast = false }: ArticleItemProps): JSX.Element => {
  const category = article.category?.name
    ? capitalizeFirstLetter(article.category.name)
    : 'General';
  const timeAgoText = formatTimeAgo(article.created_at);

  return (
    <ArticleCard
      author={article.author?.name || 'Author'}
      containerStyle={isLast ? { marginBottom: 0 } : undefined}
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

ArticleItem.displayName = 'ArticleItem';

export default ArticleItem;
