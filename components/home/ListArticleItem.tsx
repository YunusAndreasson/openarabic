import type { JSX } from 'react';
import { memo, useCallback } from 'react';

import type { Article } from '@/types/articles.types';

import { ArticleCard } from './ArticleCard';

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
  showChevron?: boolean;
}

const ListArticleItem = memo(
  ({
    article,
    onPress,
    editMode = false,
    onDelete,
    dragHandleProps,
    isBeingDragged = false,
    showChevron,
  }: ListArticleItemProps): JSX.Element => {
    const handlePress = useCallback(() => onPress?.(article), [onPress, article]);

    // Show chevron when there's an onPress handler and not in edit mode
    // If showChevron is explicitly passed, use that; otherwise auto-determine
    const shouldShowChevron = showChevron ?? (!editMode && !!onPress);

    return (
      <ArticleCard
        author={article.author.name}
        title={article.title}
        difficultyLevel={article.difficulty_level}
        onPress={!editMode ? handlePress : undefined}
        editMode={editMode}
        onDelete={onDelete}
        dragHandleProps={dragHandleProps}
        isBeingDragged={isBeingDragged}
        showChevron={shouldShowChevron}
      />
    );
  }
);

ListArticleItem.displayName = 'ListArticleItem';

export default ListArticleItem;
