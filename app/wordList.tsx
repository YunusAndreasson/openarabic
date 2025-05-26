import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, Stack } from 'expo-router';
import React, { useCallback, useMemo, memo, JSX, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import WordListItem from '../components/vocabulary/WordListItem';
import SortingControls from '../components/SortingControls';
import type { SortOption, SortDirection } from '../components/SortingControls';
import BaseCard from '../components/BaseCard';
import { LAYOUT } from '../constants/layout';
import { useAuth } from '../hooks/useAuth';
import { useColors } from '../hooks/useColors';
import type { EnhancedStudyWord, WordListSort } from '../hooks/useWordList';
import { useWordList } from '../hooks/useWordList';
import { router } from 'expo-router';
import { lightFeedback } from '../utils/haptics';

const ITEM_HEIGHT = LAYOUT.SPACING.XLARGE * 3.2;

// Define sort options for word list
const wordListSortOptions: SortOption<WordListSort>[] = [
  { key: 'retention', label: 'Memory', description: 'Strength' },
  { key: 'alphabetical', label: 'A-Z', description: 'Order' },
  { key: 'streak', label: 'Streak', description: 'Success' },
];

// Move WordListItem component definition outside to optimize recycling
interface WordListItemMemoProps {
  readonly item: EnhancedStudyWord;
}

const WordListItemMemo = memo(({ item }: WordListItemMemoProps) => {
  // Handler for navigating to examples screen
  const handleShowExamples = useCallback(() => {
    if (!item.root_id) return;

    // Pass word meaning and letters directly to avoid unnecessary loading
    router.push({
      pathname: '/wordExamples',
      params: {
        rootId: item.root_id.toString(),
        rootMeaning: item.root?.meaning || '',
        rootLetters: item.root?.letters || '',
      },
    });
  }, [item.root_id, item.root?.meaning, item.root?.letters]);

  return (
    <View style={styles.wordItemContainer}>
      <BaseCard
        shadowSize="small"
        style={{ marginBottom: LAYOUT.SPACING.TINY }}
        onPress={handleShowExamples}
      >
        <WordListItem word={item} />
      </BaseCard>
    </View>
  );
});

WordListItemMemo.displayName = 'WordListItemMemo';

export default function WordListScreen(): JSX.Element {
  const { category } = useLocalSearchParams();
  const colors = useColors();
  const { user } = useAuth();
  // Loading state to prevent flickering
  const [isLoading, setIsLoading] = useState(true);

  // Add sort state
  const [sortBy, setSortBy] = React.useState<WordListSort>('retention');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  // Get the title and icon based on the category
  const { title } = useMemo(() => {
    switch (category) {
      case 'total':
        return {
          title: 'Total Words',
          icon: 'book',
          description: 'Sorted by retention strength',
        };
      case 'mastered':
        return {
          title: 'Mastered',
          icon: 'checkmark-circle',
          description: 'Words with high stability',
        };
      case 'learning':
        return {
          title: 'Learning',
          icon: 'school',
          description: 'Words still being learned',
        };
      case 'needsAttention':
        return {
          title: 'Needs Attention',
          icon: 'alert-circle',
          description: 'Words that are challenging',
        };
      default:
        return {
          title: 'Review',
          icon: 'book',
          description: 'Words to review',
        };
    }
  }, [category]);

  // Use the new hook to fetch and process words
  const { data: words, error } = useWordList(
    user?.id,
    category as 'total' | 'mastered' | 'learning' | 'due' | 'needsAttention',
    sortBy,
    sortDirection
  );

  // Add loading delay effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Reset loading state when sort options change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [sortBy, sortDirection]);

  // Optimize renderItem for FlashList
  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { readonly item: EnhancedStudyWord }) => <WordListItemMemo item={item} />,
    []
  );

  // Empty list component
  const renderEmptyComponent = useCallback(() => {
    if (isLoading || (words && words.length > 0)) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="information-circle-outline"
          size={LAYOUT.SPACING.XLARGE * 3}
          color={colors.tint}
        />
        <ThemedText variant="secondary" style={styles.emptyText}>
          No words found
        </ThemedText>
      </View>
    );
  }, [colors.tint, isLoading, words]);

  // Sort functions
  const handleSortChange = useCallback((newSortBy: string, newDirection: SortDirection) => {
    lightFeedback(); // Add haptic feedback
    setIsLoading(true);
    setSortBy(newSortBy as WordListSort);
    setSortDirection(newDirection);
  }, []);

  // List header component with sort control only
  const ListHeaderComponent = useCallback(() => {
    return (
      <View style={styles.headerContainer}>
        <SortingControls
          currentSort={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          options={wordListSortOptions}
          style={styles.sortCard}
        />
      </View>
    );
  }, [sortBy, sortDirection, handleSortChange]);

  // Add error UI handling
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title }} />
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>
            Failed to load vocabulary words. Please try again later.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      {/* Disable the native header */}
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: title,
          headerTitleStyle: {
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE + 1,
            fontWeight: '700',
            color: colors.text,
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
          headerTransparent: false,
          headerTitleAlign: 'left',
          headerTintColor: colors.tint,
          headerBackTitle: 'Vocabulary',
          headerBackTitleStyle: {
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
          },
        }}
      />

      {/* Use Animated.View with explicit FadeIn animation for smoother entrance */}
      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
      >
        <FlashList
          data={words || []}
          renderItem={renderItem}
          estimatedItemSize={ITEM_HEIGHT}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
          estimatedFirstItemOffset={LAYOUT.SPACING.XLARGE}
          overrideItemLayout={layout => {
            layout.size = ITEM_HEIGHT;
          }}
          drawDistance={150}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContentContainer}
          keyExtractor={item => `word-${item.root_id}`}
        />
      </ThemedView>
    </>
  );
}

WordListScreen.displayName = 'WordListScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.XLARGE,
    marginTop: LAYOUT.SPACING.XLARGE,
  },
  emptyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  errorText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
  },
  headerContainer: {
    paddingBottom: LAYOUT.SPACING.SMALL,
    paddingTop: 0,
  },
  listContentContainer: {
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  wordItemContainer: {
    marginVertical: LAYOUT.SPACING.TINY,
  },
  headerButton: {
    marginRight: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.SPACING.SMALL,
  },
  sortCard: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
});
