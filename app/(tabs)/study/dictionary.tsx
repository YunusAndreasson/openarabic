import { EmptyState } from '@/components/common';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { DictionarySortingHeader } from '@/components/study/DictionarySortingHeader';
import { DictionaryWordCard } from '@/components/study/DictionaryWordCard';
import { LIST_DRAW_DISTANCE_MULTIPLIER } from '@/constants/animation';
import { fsrsQueries } from '@/constants/queries';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useAuth } from '@/hooks/auth/useAuth';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { useDictionaryModal, useFSRSQueries } from '@/hooks/vocabulary';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

export default function DictionaryScreen(): JSX.Element {
  const { user } = useAuth();
  const { editMode, reset } = useEditMode('dictionary');
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (editMode) {
          reset();
        }
      };
    }, [editMode, reset]),
  );

  // Get all study words for dictionary display (shows all words, sorted by memory strength)
  const { allWords: studyWords, isLoading } = useFSRSQueries({ userId: user?.id });

  const { toggleRootMutation } = useArticleMutations(
    user?.id,
    () => {},
    async () => {
      if (user?.id) {
        // Invalidate all FSRS-related queries to ensure UI updates
        queryClient.invalidateQueries({
          queryKey: fsrsQueries.all(user.id).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: fsrsQueries.allWithCooldown(user.id, 0).queryKey,
        });
        queryClient.invalidateQueries({ queryKey: fsrsQueries.due(user.id).queryKey });
        queryClient.invalidateQueries({ queryKey: fsrsQueries.stats(user.id).queryKey });
      }
    },
  );

  const { sortedWords, sortDirection, setSorting } = useDictionaryModal({
    studyWords: studyWords || [],
  });

  const hasWords = sortedWords.length > 0;

  const handleDeleteWord = useCallback(
    async (rootId: number) => {
      if (!user?.id) return;
      try {
        await toggleRootMutation.mutateAsync({ userId: user.id, rootId });
      } catch (error) {
        await handleError(error instanceof Error ? error : String(error), {
          showToast: true,
          toastMessage: STRINGS.FAILED_TO_DELETE_WORD,
          captureSentry: !__DEV__,
        });
      }
    },
    [user?.id, toggleRootMutation],
  );

  const renderItem = useCallback(
    (props: { item: StudyWord }) => (
      <DictionaryWordCard
        word={props.item}
        editMode={editMode}
        onDelete={() => handleDeleteWord(props.item.root_id)}
      />
    ),
    [editMode, handleDeleteWord],
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header with status legend and sort toggle */}
      <DictionarySortingHeader sortDirection={sortDirection} onToggleDirection={setSorting} />

      {isLoading ? null : hasWords ? (
        <View style={styles.contentContainer}>
          <FlashList
            data={sortedWords}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            drawDistance={LAYOUT.CARD.HEIGHT.VOCABULARY_ITEM * LIST_DRAW_DISTANCE_MULTIPLIER}
            // v2 performance optimizations
            maxItemsInRecyclePool={40} // Control memory usage for vocabulary lists
            maintainVisibleContentPosition={{}} // Prevent scroll jumps when words are deleted (enabled by default)
            // v2 automatically handles layout - no estimates needed
            // Note: No extraData needed - DictionaryWordCard is properly memoized and receives editMode as prop
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <EmptyState
            title={STRINGS.STUDY_LIST_EMPTY_TITLE}
            description={STRINGS.STUDY_LIST_EMPTY_DESCRIPTION}
            icon="school"
          />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  contentContainer: {
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    flex: 1,
  },
});
