import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { WordPreviewCard } from '@/components/study/WordPreviewCard';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAddCommonWords } from '@/hooks/study/useAddCommonWords';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';

const PREVIEW_WORDS_COUNT = 9;

export interface EmptyStateButtonProps {
  label: string;
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
}

interface PracticeEmptyStateProps {
  onButtonPropsChange?: (props: EmptyStateButtonProps) => void;
}

/**
 * Empty state for the Practice screen.
 * Allows users to select and add common Arabic words to start practicing.
 */
export function PracticeEmptyState({ onButtonPropsChange }: PracticeEmptyStateProps) {
  const { addWords, isLoading } = useAddCommonWords();

  // Fetch common words for preview
  const { data: previewWords = [] } = useQuery({
    queryKey: ['commonWordsPreview'],
    queryFn: () => studyWordsFSRSService.getCommonRoots(PREVIEW_WORDS_COUNT),
    staleTime: Infinity,
  });

  // Selection state - start with all selected
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(previewWords.map(w => w.id)),
  );

  // Update selection when words load
  useMemo(() => {
    if (previewWords.length > 0 && selectedIds.size === 0) {
      setSelectedIds(new Set(previewWords.map(w => w.id)));
    }
  }, [previewWords, selectedIds.size]);

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
    addWords(Array.from(selectedIds));
  }, [addWords, selectedIds]);

  const selectionCount = selectedIds.size;
  const buttonText =
    selectionCount === 0
      ? STRINGS.STUDY_LIST_EMPTY_CTA
      : `${STRINGS.STUDY_LIST_EMPTY_CTA} (${selectionCount})`;

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
      <ThemedText type="heading3">{STRINGS.STUDY_LIST_EMPTY_TITLE}</ThemedText>

      {/* Description */}
      <ThemedText style={styles.description} type="body" variant="secondary">
        {STRINGS.STUDY_LIST_EMPTY_DESCRIPTION}
      </ThemedText>

      {/* Word Preview Cards - 3×3 Grid */}
      {previewWords.length > 0 && (
        <View style={styles.grid}>
          {previewWords.map(word => (
            <WordPreviewCard
              key={word.id}
              arabic={word.letters}
              english={word.meaning}
              selected={selectedIds.has(word.id)}
              onPress={() => toggleSelection(word.id)}
              style={styles.gridItem}
            />
          ))}
        </View>
      )}

      {/* Hint about adding words from articles */}
      <ThemedText style={styles.hint} type="caption" variant="secondary">
        {STRINGS.STUDY_LIST_EMPTY_HINT}
      </ThemedText>
    </View>
  );
}

// Calculate card width: (100% - 2 gaps) / 3 columns
// Using 31% leaves room for MEDIUM (12px) gaps between cards
const GRID_ITEM_WIDTH = '31%' as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  description: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.XXLARGE,
    width: '100%',
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
  },
  hint: {
    marginTop: LAYOUT.SPACING.XLARGE,
  },
});
