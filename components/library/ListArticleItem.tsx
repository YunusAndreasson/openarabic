import type { JSX } from 'react';
import { memo, useCallback } from 'react';

import { ListenListItemCard } from '@/components/bookmarks/ListenListItemCard';
import type { Article } from '@/types/articles.types';
import { generateImageUrl } from '@/utils/imageUtils';

interface ListArticleItemProps {
  article: Article;
  onPress?: (article: Article) => void;
  editMode?: boolean;
  onDelete?: () => void;
  dragHandleProps?: {
    onLongPress: () => void;
    delayLongPress: number;
  };
  isBeingDragged?: boolean;
  progressPercentage?: number;
  hasStartedReading?: boolean;
}

const ListArticleItem = memo(
  ({
    article,
    onPress,
    editMode = false,
    onDelete,
    dragHandleProps,
    isBeingDragged = false,
    progressPercentage,
    hasStartedReading,
  }: ListArticleItemProps): JSX.Element => {
    const handlePress = useCallback(() => onPress?.(article), [onPress, article]);

    return (
      <ListenListItemCard
        author={article.author.name}
        title={article.title}
        difficultyLevel={article.difficulty_level}
        onPress={!editMode ? handlePress : undefined}
        editMode={editMode}
        onDelete={onDelete}
        dragHandleProps={dragHandleProps}
        isBeingDragged={isBeingDragged}
        progressPercentage={progressPercentage}
        hasStartedReading={hasStartedReading}
        shouldAnimateOnMount={false}
        imageUrl={generateImageUrl(article.image_url)}
      />
    );
  }
);

ListArticleItem.displayName = 'ListArticleItem';

export default ListArticleItem;
