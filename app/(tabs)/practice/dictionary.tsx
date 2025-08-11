import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '@common/EmptyState';

import { ThemedView } from '@/components/ThemedView';
import DictionarySortingHeader from '@/components/practice/DictionarySortingHeader';
import { DictionaryWordCard } from '@/components/practice/DictionaryWordCard';
import EditModeButton from '@/components/ui/EditModeButton';
import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { useDictionaryModal, useFSRSQueries } from '@/hooks/vocabulary';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

export default function DictionaryScreen(): JSX.Element {
  const { user } = useAuth();
  const colors = useColors();
  const { editMode, reset } = useEditMode('dictionary');
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Reset edit mode when screen loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Reset edit mode when navigating away from the screen
        if (editMode) {
          reset();
        }
      };
    }, [editMode, reset])
  );

  // Get all study words
  const { allWords: studyWords, isLoading } = useFSRSQueries({
    userId: user?.id,
  });

  // Get mutations for word management
  const { toggleRootMutation } = useArticleMutations(
    user?.id,
    () => {}, // No reading list refetch needed for dictionary
    async () => {
      // Invalidate FSRS queries to refresh the data
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.all(user.id) });
        queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) });
        queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.stats(user.id) });
      }
    }
  );

  // Filter and sort words (search removed)
  const { sortedWords, sortOption, sortDirection, setSorting } = useDictionaryModal({
    studyWords: studyWords || [],
  });

  const hasWords = sortedWords.length > 0;

  // Handle word deletion
  const handleDeleteWord = useCallback(
    async (rootId: number) => {
      if (!user?.id) return;

      try {
        // Use the existing toggle mutation which handles both add and remove
        // Since the word exists in study words, this will remove it
        await toggleRootMutation.mutateAsync({ userId: user.id, rootId });
      } catch (error) {
        // Mutation already handles error states; avoid noisy logs
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
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { item: StudyWord }) => (
      <DictionaryWordCard
        word={item}
        editMode={editMode}
        onDelete={() => handleDeleteWord(item.root_id)}
      />
    ),
    [editMode, handleDeleteWord]
  );

  const keyExtractor = useCallback((item: StudyWord) => `word-${item.root_id}`, []);

  // Memoize the item separator to prevent inline function creation
  const ItemSeparator = useCallback(() => <View style={{ height: LAYOUT.SPACING.TINY }} />, []);

  const contentContainerStyle = useMemo(
    () => ({
      paddingTop: LAYOUT.SPACING.MEDIUM,
      paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE,
      paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    }),
    [insets.bottom]
  );

  // Stable object identity to avoid list-wide rerenders
  const listExtraData = useMemo(() => ({ editMode }), [editMode]);

  if (!hasWords && !isLoading) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState
          colors={colors}
          description={STRINGS.ADD_WORDS_TO_STUDY_LIST}
          icon="book"
          iconSize={LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE}
          title={STRINGS.NO_STUDY_WORDS}
          containerStyle={contentContainerStyle}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} includeBottomInset={false}>
      <Stack.Screen
        options={{
          title: STRINGS.DICTIONARY,
          headerRight: () => <EditModeButton type="dictionary" />,
        }}
      />

      <DictionarySortingHeader
        currentSort={sortOption}
        sortDirection={sortDirection}
        onSortChange={setSorting}
      />

      <FlashList<StudyWord>
        data={sortedWords}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={LAYOUT.CARD.HEIGHT.VOCABULARY_ITEM}
        estimatedListSize={{
          height: LAYOUT.CARD.HEIGHT.VOCABULARY_ITEM * 12,
          width: SCREEN_WIDTH,
        }}
        overrideItemLayout={(layout: { span?: number; size?: number }) => {
          layout.size = LAYOUT.CARD.HEIGHT.VOCABULARY_ITEM;
        }}
        drawDistance={LAYOUT.CARD.HEIGHT.VOCABULARY_ITEM * 3}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        ItemSeparatorComponent={ItemSeparator}
        extraData={listExtraData}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
