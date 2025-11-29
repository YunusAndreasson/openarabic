import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ListenListItemCard } from '@/components/bookmarks/ListenListItemCard';
import { type EmptyStateButtonProps } from '@/components/study/PracticeEmptyState';
import { LAYOUT } from '@/constants/layout';
import { articleQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAddBeginnerArticles } from '@/hooks/bookmarks/useAddBeginnerArticles';
import { useColors } from '@/hooks/theme/useColors';
import { getBeginnerArticles } from '@/utils/articleUtils';
import { selectionFeedback } from '@/utils/haptics';
import { generateStorageUrl } from '@/utils/storageUtils';
import { getArticleMetadata } from '@/utils/stringUtils';

// Re-export for consumers importing from bookmarks
export type { EmptyStateButtonProps };

interface SavedEmptyStateProps {
  onButtonPropsChange?: (props: EmptyStateButtonProps) => void;
}

const PREVIEW_ARTICLE_COUNT = 4;

/**
 * Empty state for the Saved/Bookmarks screen.
 * Allows users to select and add beginner articles with bilingual audio.
 */
export function SavedEmptyState({ onButtonPropsChange }: SavedEmptyStateProps) {
  const { addArticles, isLoading } = useAddBeginnerArticles();
  const colors = useColors();

  // Fetch all articles to get beginner previews
  const { data: allArticles = [] } = useQuery(articleQueries.all());

  // Get 4 beginner articles for preview (stacked vertically)
  const previewArticles = useMemo(
    () => getBeginnerArticles(allArticles, PREVIEW_ARTICLE_COUNT),
    [allArticles],
  );

  // Selection state - start with all selected
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(previewArticles.map(a => a.id)),
  );

  // Update selection when articles load
  useEffect(() => {
    if (previewArticles.length > 0 && selectedIds.size === 0) {
      setSelectedIds(new Set(previewArticles.map(a => a.id)));
    }
  }, [previewArticles, selectedIds.size]);

  const toggleSelection = useCallback((id: number) => {
    selectionFeedback();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleAdd = useCallback(() => {
    addArticles(Array.from(selectedIds));
  }, [addArticles, selectedIds]);

  const selectionCount = selectedIds.size;
  const buttonText =
    selectionCount === 0
      ? STRINGS.BOOKMARKS_EMPTY_CTA
      : `${STRINGS.BOOKMARKS_EMPTY_CTA} (${selectionCount})`;

  // Notify parent of button props changes
  useEffect(() => {
    onButtonPropsChange?.({
      label: buttonText,
      onPress: handleAdd,
      loading: isLoading,
      disabled: selectionCount === 0,
    });
  }, [buttonText, handleAdd, isLoading, selectionCount, onButtonPropsChange]);

  return (
    <View style={styles.container}>
      {/* Title */}
      <ThemedText type="heading3">{STRINGS.BOOKMARKS_EMPTY_TITLE}</ThemedText>

      {/* Description */}
      <ThemedText style={styles.description} type="body" variant="secondary">
        {STRINGS.BOOKMARKS_EMPTY_DESCRIPTION}
      </ThemedText>

      {/* Article Preview Cards - Vertical Stack */}
      {previewArticles.length > 0 && (
        <View style={styles.articleList}>
          {previewArticles.map(article => {
            const isSelected = selectedIds.has(article.id);
            return (
              <View
                key={article.id}
                style={[
                  styles.articleWrapper,
                  {
                    borderWidth: 2,
                    borderColor: isSelected ? colors.tint : 'transparent',
                    opacity: isSelected ? 1 : 0.5,
                  },
                ]}
              >
                <ListenListItemCard
                  title={article.title}
                  secondaryText={getArticleMetadata(article)}
                  imageUrl={generateStorageUrl('images', article.image_url)}
                  articleId={article.id}
                  onPress={() => toggleSelection(article.id)}
                  shouldAnimateOnMount={false}
                />
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: colors.tint }]}>
                    <Ionicons name="checkmark" size={14} color={colors.background} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Hint about adding articles while reading */}
      <ThemedText style={styles.hint} type="caption" variant="secondary">
        {STRINGS.BOOKMARKS_EMPTY_HINT}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  articleList: {
    gap: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.XXLARGE,
    width: '100%',
  },
  articleWrapper: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    position: 'relative',
  },
  checkmark: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: LAYOUT.SPACING.XLARGE,
    justifyContent: 'center',
    position: 'absolute',
    right: LAYOUT.SPACING.SMALL,
    top: LAYOUT.SPACING.SMALL,
    width: LAYOUT.SPACING.XLARGE,
  },
  container: {
    flex: 1,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  description: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  hint: {
    marginTop: LAYOUT.SPACING.XLARGE,
  },
});
