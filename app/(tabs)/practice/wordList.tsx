import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import type { JSX } from 'react';
import React, { useCallback, useMemo, memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseCard from '@/components/BaseCard';
import SortingControls from '@/components/SortingControls';
import type { SortOption, SortDirection } from '@/components/SortingControls';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import WordListItem from '@/components/vocabulary/WordListItem';
import { LAYOUT } from '@/constants/layout';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import type { EnhancedStudyWord, WordListSort } from '@/hooks/vocabulary/useWordList';
import { useWordList } from '@/hooks/vocabulary/useWordList';
import { lightFeedback } from '@/utils/haptics';

const ITEM_HEIGHT = LAYOUT.SPACING.XLARGE * 2.85;

// Define sort options for word list
const wordListSortOptions: SortOption<WordListSort>[] = [
  { key: 'retention', label: 'Memory Strength' },
  { key: 'alphabetical', label: 'A-Z' },
  { key: 'streak', label: 'Success Streak' },
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
      pathname: '/practice/wordExamples',
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
    // Group related categories to reduce cognitive load

    switch (category) {
      case 'total':
        return {
          title: 'All Words',
          icon: 'book',
          description: 'Your complete vocabulary',
        };
      case 'mastered':
        return {
          title: 'Mastered',
          icon: 'checkmark-circle',
          description: 'Words you know well',
        };
      case 'learning':
        return {
          title: 'Learning',
          icon: 'school',
          description: 'Words in progress',
        };
      case 'needsAttention':
        return {
          title: 'Needs Review',
          icon: 'alert-circle',
          description: 'Words that need practice',
        };
      case 'due':
        return {
          title: 'Due Now',
          icon: 'alarm-outline',
          description: 'Ready for review',
        };
      // Simplified difficulty grouping
      case 'difficultyEasy':
      case 'difficultyMedium':
      case 'difficultyHard': {
        const difficultyLevel = category.replace('difficulty', '').toLowerCase();
        return {
          title: `${difficultyLevel.charAt(0).toUpperCase() + difficultyLevel.slice(1)} Words`,
          icon: 'stats-chart-outline',
          description: `Words with ${difficultyLevel} difficulty`,
        };
      }
      default:
        return {
          title: 'Due Now',
          icon: 'alarm-outline',
          description: 'Ready for review',
        };
    }
  }, [category]);

  // Use the new hook to fetch and process words
  const { data: words, error } = useWordList(
    user?.id,
    category as
      | 'difficultyEasy'
      | 'difficultyHard'
      | 'difficultyMedium'
      | 'due'
      | 'learning'
      | 'mastered'
      | 'needsAttention'
      | 'total',
    sortBy,
    sortDirection
  );

  // Add loading delay effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  // Reset loading state when sort options change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [sortBy, sortDirection]);

  // Optimize renderItem for FlashList
  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { readonly item: EnhancedStudyWord }) => <WordListItemMemo item={item} />,
    []
  );

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
          options={wordListSortOptions}
          sortDirection={sortDirection}
          style={styles.sortCard}
          onSortChange={handleSortChange}
        />
      </View>
    );
  }, [sortBy, sortDirection, handleSortChange]);

  // Add error UI handling
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen
          options={{
            title,
            headerShown: true,
            headerBackTitle: 'Practice',
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTitleStyle: {
              fontSize: LAYOUT.HEADER.TITLE.SECONDARY.fontSize,
              fontWeight: LAYOUT.HEADER.TITLE.SECONDARY.fontWeight as any,
              color: colors.text,
            },
            headerShadowVisible: false,
            headerTintColor: colors.tint,
          }}
        />
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>
            Your word list isn&apos;t available right now. Check your connection and refresh.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: title,
          headerTitleStyle: {
            ...LAYOUT.HEADER.TITLE.SECONDARY,
            color: colors.text,
          } as any,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
          headerTransparent: false,
          headerTitleAlign: 'left',
          headerTintColor: colors.tint,
          headerBackTitle: 'Practice',
          headerBackTitleStyle: {
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
          },
        }}
      />

      {/* Use Animated.View with explicit FadeIn animation for smoother entrance */}
      <ThemedView
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
        style={styles.container}
      >
        <FlashList
          contentContainerStyle={styles.listContentContainer}
          contentInsetAdjustmentBehavior="automatic"
          data={words || []}
          drawDistance={150}
          estimatedFirstItemOffset={LAYOUT.SPACING.XLARGE}
          estimatedItemSize={ITEM_HEIGHT}
          keyExtractor={item => `word-${item.root_id}`}
          ListHeaderComponent={ListHeaderComponent}
          renderItem={renderItem}
          showsVerticalScrollIndicator={true}
          style={{ opacity: isLoading ? 0.6 : 1.0 }}
          overrideItemLayout={layout => {
            layout.size = ITEM_HEIGHT;
          }}
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
    paddingBottom: LAYOUT.SPACING.TINY,
    paddingTop: 0,
  },
  listContentContainer: {
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  sortCard: {
    marginBottom: LAYOUT.SPACING.SMALL,
    marginHorizontal: 0,
  },
  wordItemContainer: {
    marginVertical: LAYOUT.SPACING.TINY,
  },
});
