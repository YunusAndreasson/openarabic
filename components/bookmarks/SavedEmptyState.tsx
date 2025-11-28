import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ArticlePreviewCard } from '@/components/bookmarks/ArticlePreviewCard';
import { LAYOUT } from '@/constants/layout';
import { articleQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAddBeginnerArticles } from '@/hooks/bookmarks/useAddBeginnerArticles';
import { getBeginnerArticles } from '@/utils/articleUtils';
import { generateStorageUrl } from '@/utils/storageUtils';

export interface EmptyStateButtonProps {
  label: string;
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
}

interface SavedEmptyStateProps {
  onButtonPropsChange?: (props: EmptyStateButtonProps) => void;
}

/**
 * Empty state for the Saved/Bookmarks screen.
 * Allows users to select and add beginner articles with bilingual audio.
 */
export function SavedEmptyState({ onButtonPropsChange }: SavedEmptyStateProps) {
  const { addArticles, isLoading } = useAddBeginnerArticles();

  // Fetch all articles to get beginner previews
  const { data: allArticles = [] } = useQuery(articleQueries.all());

  // Get 5 beginner articles for preview
  const previewArticles = useMemo(() => getBeginnerArticles(allArticles, 5), [allArticles]);

  // Selection state - start with all selected
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(previewArticles.map(a => a.id)),
  );

  // Update selection when articles load
  useMemo(() => {
    if (previewArticles.length > 0 && selectedIds.size === 0) {
      setSelectedIds(new Set(previewArticles.map(a => a.id)));
    }
  }, [previewArticles, selectedIds.size]);

  const toggleSelection = useCallback((id: number) => {
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
      <ThemedText align="center" type="heading3">
        {STRINGS.BOOKMARKS_EMPTY_TITLE}
      </ThemedText>

      {/* Description */}
      <ThemedText align="center" style={styles.description} type="body" variant="secondary">
        {STRINGS.BOOKMARKS_EMPTY_DESCRIPTION}
      </ThemedText>

      {/* Article Preview Cards */}
      {previewArticles.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previewContainer}
          style={styles.previewScroll}
        >
          {previewArticles.map(article => (
            <ArticlePreviewCard
              key={article.id}
              title={article.title}
              author={article.author?.name ?? ''}
              imageUrl={generateStorageUrl('images', article.image_url)}
              selected={selectedIds.has(article.id)}
              onPress={() => toggleSelection(article.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.XXXLARGE,
  },
  description: {
    marginTop: LAYOUT.SPACING.SMALL,
    maxWidth: 280,
  },
  previewContainer: {
    gap: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  previewScroll: {
    flexGrow: 0,
    marginTop: LAYOUT.SPACING.XLARGE,
  },
});
