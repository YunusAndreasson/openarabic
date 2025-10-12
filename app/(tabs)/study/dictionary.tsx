import EmptyState from '@common/EmptyState';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { ThemedView } from '@/components/ThemedView';
import DictionarySortingHeader from '@/components/study/DictionarySortingHeader';
import { DictionaryWordCard } from '@/components/study/DictionaryWordCard';
import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useAuth } from '@/hooks/auth/useAuth';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { useDictionaryModal, useFSRSQueries } from '@/hooks/vocabulary';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { isLearnedWord, isMasteredWord } from '@/utils/wordClassification';

export default function DictionaryScreen(): JSX.Element {
  const { user } = useAuth();
  const { editMode, reset } = useEditMode('dictionary');
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const { filter } = useLocalSearchParams<{ filter?: 'due' | 'learned' | 'mastered' }>();

  // Update screen title based on filter
  useEffect(() => {
    const title =
      filter === 'due'
        ? STRINGS.DUE_WORDS_TITLE
        : filter === 'learned'
        ? STRINGS.LEARNED_WORDS
        : filter === 'mastered'
        ? STRINGS.MASTERED_WORDS_TITLE
        : STRINGS.DICTIONARY_TITLE;
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

  // Filter by category when requested (due/learned/mastered)
  const filteredByCategory = useMemo<StudyWord[] | undefined>(() => {
    if (!studyWords) return studyWords;
    if (!filter) return studyWords;

    if (filter === 'due') {
      // Use the dueWords from the hook directly to ensure consistency with practice screen
      return dueWords;
    }

    if (filter === 'learned') {
      // Learned = all State 2 words (graduated to review phase)
      return studyWords.filter(word => isLearnedWord(word));
    }

    // Mastered = State 2 + stability >= 5
    return studyWords.filter(word => isMasteredWord(word));
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

  const { sortedWords, sortDirection, setSorting } = useDictionaryModal({
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
          toastMessage: STRINGS.FAILED_TO_DELETE_WORD,
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
      {/* Header with status legend and sort toggle */}
      <DictionarySortingHeader sortDirection={sortDirection} onToggleDirection={setSorting} />

      {isLoading ? null : hasWords ? (
        <View style={styles.contentContainer}>
          <FlashList
            data={sortedWords}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE }}
            showsVerticalScrollIndicator={false}
            extraData={editMode}
            // v2 performance optimizations
            maxItemsInRecyclePool={40} // Control memory usage for vocabulary lists
            // v2 automatically handles layout - no estimates needed
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
