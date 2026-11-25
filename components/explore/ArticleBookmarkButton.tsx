import { startTransition, useOptimistic } from 'react';
import { StyleSheet } from 'react-native';

import { useToast } from '@/components/providers';
import { GlyphButton, IconButton } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useReadingListMutations } from '@/hooks/articles/useReadingListMutations';
import { useAuth } from '@/hooks/auth/useAuth';
import { useReadingList } from '@/hooks/playlist/useReadingList';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import { fillTemplate } from '@/utils/fillTemplate';

interface ArticleBookmarkButtonProps {
  articleId: ArticleId;
  title: string;
  article?: Article;
  overImage?: boolean;
}

const styles = StyleSheet.create({
  rowControl: {
    alignItems: 'center',
    justifyContent: 'center',
    width: MIN_TOUCH_TARGET.MEDIUM,
    height: MIN_TOUCH_TARGET.MEDIUM,
  },
});

export function ArticleBookmarkButton({
  articleId,
  title,
  article,
  overImage = false,
}: ArticleBookmarkButtonProps) {
  const { user } = useAuth();
  const { data } = useReadingList(user?.id);
  const { handleToggleReadingList, addToReadingListMutation, removeFromReadingListMutation } =
    useReadingListMutations();
  const { showToast } = useToast();
  const colors = useColors();
  const isSaved = data.some(item => item.article_id === articleId);
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(isSaved);
  const pending = addToReadingListMutation.isPending || removeFromReadingListMutation.isPending;

  function toggle() {
    startTransition(async () => {
      setOptimisticSaved(!isSaved);
      const succeeded = await handleToggleReadingList(articleId, isSaved, article);
      if (succeeded)
        showToast(
          isSaved ? STRINGS.REMOVED_FROM_BOOKMARKS : STRINGS.ADDED_TO_BOOKMARKS,
          undefined,
          ToastType.INFO,
        );
    });
  }

  const label = fillTemplate(
    optimisticSaved ? STRINGS.READ_LATER_REMOVE : STRINGS.READ_LATER_SAVE,
    {
      title,
    },
  );
  const icon = optimisticSaved ? 'bookmark' : 'bookmark-outline';

  if (overImage) {
    return (
      <IconButton
        accessibilityLabel={label}
        accessibilitySelected={optimisticSaved}
        backgroundColor={colors.elevation2}
        disabled={pending}
        icon={icon}
        iconColor={colors.icon}
        onPress={toggle}
      />
    );
  }

  return (
    <GlyphButton
      accessibilityLabel={label}
      accessibilityState={{ selected: optimisticSaved }}
      color={colors.icon}
      disabled={pending}
      hapticType="selection"
      hitSlop={0}
      icon={icon}
      onPress={toggle}
      style={styles.rowControl}
    />
  );
}
