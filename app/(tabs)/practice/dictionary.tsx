import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '@common/EmptyState';

import { ThemedView } from '@/components/ThemedView';
import DictionarySortingHeader from '@/components/practice/DictionarySortingHeader';
import { DictionaryWordCard } from '@/components/practice/DictionaryWordCard';
import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
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
  const navigation = useNavigation();
  const { filter } = useLocalSearchParams<{ filter?: 'due' | 'learning' | 'mastered' }>();

  // Update screen title based on filter
  useEffect(() => {
    const title =
      filter === 'due'
        ? 'Due Words'
        : filter === 'learning'
        ? 'Learning Words'
        : filter === 'mastered'
        ? 'Mastered Words'
        : 'Dictionary';
    navigation.setOptions({ title });
  }, [filter, navigation]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (editMode) {
          reset();
        }
      };
    }, [editMode, reset])
  );

  // Get all study words and due words
  const { allWords: studyWords, dueWords, isLoading } = useFSRSQueries({ userId: user?.id });

  // Filter by category when requested (due/learning/mastered)
  const filteredByCategory = useMemo<StudyWord[] | undefined>(() => {
    if (!studyWords) return studyWords;
    if (!filter) return studyWords;

    if (filter === 'due') {
      // Use the dueWords from the hook directly to ensure consistency with practice screen
      return dueWords;
    }

    if (filter === 'learning') {
      return studyWords.filter(word => {
        const state = word.fsrs_state;
        const stability = word.fsrs_stability ?? 0;
        return state === 0 || state === 1 || state === 3 || (state === 2 && stability < 5);
      });
    }

    return studyWords.filter(word => {
      const state = word.fsrs_state;
      const stability = word.fsrs_stability ?? 0;
      return state === 2 && stability >= 5;
    });
  }, [studyWords, dueWords, filter]);

  const { toggleRootMutation } = useArticleMutations(
    user?.id,
    () => {},
    async () => {
      if (user?.id) {
        // Invalidate all FSRS-related queries to ensure UI updates
        queryClient.invalidateQueries({
          queryKey: FSRS_QUERY_KEYS.all(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: FSRS_QUERY_KEYS.allWithCooldown(user.id, 0),
        });
        queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) });
        queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.stats(user.id) });
      }
    }
  );

  const { sortedWords, sortOption, sortDirection, setSorting } = useDictionaryModal({
    studyWords: filteredByCategory || [],
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
          toastMessage: 'Failed to delete word',
          captureSentry: !__DEV__,
        });
      }
    },
    [user?.id, toggleRootMutation]
  );

  const renderItem = useCallback(
    (props: { item: StudyWord }) => (
      <DictionaryWordCard
        word={props.item}
        editMode={editMode}
        onDelete={() => handleDeleteWord(props.item.root_id)}
      />
    ),
    [editMode, handleDeleteWord]
  );

  return (
    <ThemedView style={styles.container}>
      {/* Sorting header at the top */}
      <DictionarySortingHeader
        currentSort={sortOption}
        sortDirection={sortDirection}
        onSortChange={setSorting}
      />

      {isLoading ? null : hasWords ? (
        <View style={styles.contentContainer}>
          <FlashList
            data={sortedWords}
            renderItem={renderItem}
            estimatedItemSize={80}
            contentContainerStyle={{ paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE }}
            showsVerticalScrollIndicator={false}
            extraData={editMode}
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <EmptyState
            title="No words"
            description="Add words from articles to start practicing"
            colors={{ tint: '#999' }}
            icon="school"
          />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
});
