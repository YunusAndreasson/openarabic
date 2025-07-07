import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Stack } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '@/components/EmptyState';
import { ThemedView } from '@/components/ThemedView';
import EditModeButton from '@/components/ui/EditModeButton';
import { DictionarySortingHeader, DictionaryWordCard } from '@/components/vocabulary';
import { LAYOUT } from '@/constants/layout';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { useDictionaryModal, useFSRSQueries } from '@/hooks/vocabulary';
import type { StudyWord } from '@/types/vocabulary.types';

export default function DictionaryScreen(): JSX.Element {
  const { user } = useAuth();
  const colors = useColors();
  const { editMode } = useEditMode('dictionary');
  const insets = useSafeAreaInsets();

  // Get all study words
  const { allWords: studyWords, isLoading } = useFSRSQueries({
    userId: user?.id,
  });

  // Filter and sort words
  const {
    sortedWords,
    sortOption,
    sortDirection,
    setSorting,
    searchQuery,
    setSearchQuery,
    handleWordDelete,
  } = useDictionaryModal({ studyWords: studyWords || [] });

  // Show search input when there are 20+ words (progressive disclosure)
  // Use total words count, not filtered results, to prevent search disappearing while typing
  const showSearch = (studyWords || []).length >= 20;

  // Check if we have search results vs no words at all
  const hasWords = sortedWords.length > 0;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const showNoResultsMessage = !hasWords && hasSearchQuery && (studyWords || []).length > 0;

  const renderItem = useCallback(
    ({ item }: { item: StudyWord }) => (
      <DictionaryWordCard
        word={item}
        editMode={editMode}
        onDelete={() => handleWordDelete(item.root_id)}
      />
    ),
    [editMode, handleWordDelete]
  );

  const keyExtractor = useCallback((item: StudyWord) => `word-${item.root_id}`, []);

  const contentContainerStyle = useMemo(
    () => ({
      paddingTop: LAYOUT.SPACING.MEDIUM,
      paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE,
      paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    }),
    [insets.bottom]
  );

  if (!hasWords && !isLoading && !showNoResultsMessage) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState
          colors={colors}
          description="Add words to your study list to see them here"
          icon="book-outline"
          iconSize={LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE}
          title="No Study Words"
          containerStyle={contentContainerStyle}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} includeBottomInset={false}>
      <Stack.Screen
        options={{
          title: 'Dictionary',
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
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { borderColor: colors.border }]}>
            <Ionicons
              name="search-outline"
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={colors.icon}
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search words..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.text }]}
              clearButtonMode="while-editing"
            />
          </View>
        </View>
      )}

      {/* Show no results message when search returns nothing */}
      {showNoResultsMessage ? (
        <EmptyState
          colors={colors}
          description="Try a different search term or check spelling"
          icon="search-outline"
          iconSize={LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE}
          title="No matches found"
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
          ItemSeparatorComponent={() => <View style={{ height: LAYOUT.SPACING.TINY }} />}
          extraData={{ editMode }}
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
