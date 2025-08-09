import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '@common/EmptyState';

import { ThemedView } from '@/components/ThemedView';
import EditModeButton from '@/components/ui/EditModeButton';
import { DictionarySortingHeader, DictionaryWordCard } from '@/components/vocabulary';
import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
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

  // Filter and sort words
  const { sortedWords, sortOption, sortDirection, setSorting, searchQuery, setSearchQuery } =
    useDictionaryModal({ studyWords: studyWords || [] });

  // Show search input when there are 20+ words (progressive disclosure)
  // Use total words count, not filtered results, to prevent search disappearing while typing
  const showSearch = (studyWords || []).length >= 20;

  // Check if we have search results vs no words at all
  const hasWords = sortedWords.length > 0;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const showNoResultsMessage = !hasWords && hasSearchQuery && (studyWords || []).length > 0;

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

  if (!hasWords && !isLoading && !showNoResultsMessage) {
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

      {/* Conditional Search Input */}
      {showSearch && (
        <ThemedView style={styles.searchContainer}>
          <ThemedView style={[styles.searchInputContainer, { borderColor: colors.border }]}>
            <Ionicons
              name="search"
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={colors.icon}
              style={styles.searchIcon}
            />
            <TextInput
              placeholder={STRINGS.SEARCH_WORDS_PLACEHOLDER}
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.text }]}
              clearButtonMode="while-editing"
            />
          </ThemedView>
        </ThemedView>
      )}

      {/* Show no results message when search returns nothing */}
      {showNoResultsMessage ? (
        <EmptyState
          colors={colors}
          description={STRINGS.TRY_DIFFERENT_SEARCH}
          icon="search"
          iconSize={LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE}
          title={STRINGS.NO_MATCHES_FOUND}
          containerStyle={contentContainerStyle}
          hideArticlesButton={true}
        />
      ) : (
        <FlashList<StudyWord>
          data={sortedWords}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          estimatedItemSize={64}
          drawDistance={320}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentContainerStyle}
          ItemSeparatorComponent={ItemSeparator}
          extraData={listExtraData}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: 1,
    minHeight: 44, // Match sort button height
  },
  searchIcon: {
    marginRight: LAYOUT.SPACING.SMALL,
  },
  searchInput: {
    flex: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    padding: 0, // Remove default padding
  },
});
